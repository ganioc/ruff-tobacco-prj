
declare var $: any;
import * as fs from "fs";
// import { ControlMcu } from "./ControlMcu";
import * as Protobuf from "protobufjs";
import { clearInterval, setInterval, setTimeout } from "timers";
import * as _ from "underscore";
import { Alarm } from "./Alarm";
import { IInfoCollect, RunningStatus } from "./BakingCfg";
import { RunningHandle } from "./BakingProc";
import { ControlGPRS } from "./ControlGPRS";
import { ControlGPS } from "./ControlGPS";

import { ControlMcu } from "./ControlMcu";
import { ControlPeriph } from "./ControlPeripheral";
import { CommQT, IfMsgCmd, IfPacket, InfoType } from "./ControlQT";
import { HttpsApp, IfHttpsApp } from "./HttpsApp";
import { MqttApp } from "./MqttApp";
import { JustTest } from "./JustTest";
import { LocalStorage } from "./LocalStorage";

import { ProtobufDecode } from "./ProtobufDecode";
import { UDisk } from "./udisk";
import { Tool } from "./utility";
import { basename } from "path";
import { decode } from "punycode";

const TRAP_PERIOD = 2500;

const appBaking = new RunningHandle(
    {
        timeDelta: 10000, // in ms, 10 seconds
    });

const commQT = new CommQT({});

const gps = new ControlGPS();

const gprs = new ControlGPRS();

const commMCU = new ControlMcu();

const option: IfHttpsApp = {
    hostname: "api.shdingyun.com",
    port: 443,
};

const decoder = new ProtobufDecode({ baking: appBaking });

const client = new HttpsApp(option);

const test = new JustTest(commMCU);

const mqtt: MqttApp = new MqttApp({});

$.ready((error) => {
    if (error) {
        console.log(error);
        return;
    }

    Tool.printMagenta("################");
    Tool.printMagenta("App Begin");
    Tool.printMagenta("################\n");

    Tool.clearQTProcess();

    Tool.readMachineSNFromRuffd();
    LocalStorage.loadAppVersion();

    ControlPeriph.init({
        max_angle: 90,
        min_angle: 0,
        speed: 22, // speed of windgate
    });

    gps.start();

    gprs.start();

    // 云端交互初始化
    decoder.init();

    Alarm.init({ decoder: decoder });

    setTimeout(() => {
        Tool.printYellow("Go to main()");
        main();
        // test.test();
        // test.testHttps();
        // test.testSN();
        // test.testGPRS(gprs);
        // test.testWindGate(commMCU);
        // test.testWindGateProtect(commMCU);
        // test.testPromise();
    }, 5000);

});

$.end(() => {
    Tool.printMagenta("################");
    Tool.print("Ruff App end");

    // if (appBaking.runningStatus === RunningStatus.RUNNING) {
    //     appBaking.pause();
    // }

    setTimeout(() => {
        Tool.print("Quit QT process");
        if (commQT !== undefined) {
            commQT.exit();
        }
    }, 10);

    Tool.printMagenta("################\n");
});

function main() {
    // This is the mqtt client

    // const deleteFolderRecursive = (path) => {
    //     let files = [];
    //     if (fs.existsSync(path)) {
    //         files = fs.readdirSync(path);
    //         files.forEach((file, index) => {
    //             const curPath = path + "/" + file;
    //             if (fs.lstatSync(curPath).isDirectory()) { // recurse
    //                 deleteFolderRecursive(curPath);
    //             } else { // delete file
    //                 fs.unlinkSync(curPath);
    //             }
    //         });
    //         fs.rmdirSync(path);
    //     }
    // };
    // Tool.printRed("Delete:" + LocalStorage.getRootDir());
    // deleteFolderRecursive(LocalStorage.getRootDir());

    appBaking.init({ decoder: decoder });

    // Task init, very important
    /***************************
     * CommQT
     */

    commQT.init();

    commQT.emitter.on("connected", () => {
        // if connected
        Tool.print("socket connected");

        setTimeout(() => {
            commQT.sendTrap(InfoType.Val_SysInfo, appBaking.loadSysInfo());
        }, 500);

        // Housekeeping work, send current temp
        setTimeout(() => {

            commQT.timer = setInterval(() => {

                appBaking.getTrapInfoAsync((err, data) => {
                    if (err) {
                        Tool.printRed("getTrapInfoAsync fail");
                        return;
                    }
                    commQT.sendTrap(InfoType.Val_TrapInfo, data);
                });

            }, TRAP_PERIOD);
        }, 5390);

        // setTimeout(() => {
        //     commQT.sendQueryYesNo("Test Dlg", "测试对话框功能，5秒钟消失", (err, data) => {

        //         if (err) {
        //             Tool.printYellow("Received Dlg timeout");
        //             return;
        //         }
        //         Tool.printYellow("Received Dlg Response");
        //         console.log(data);
        //     });
        // }, 2000);

        // setTimeout(() => {
        //     commQT.sendQuickDlg(
        //         "Test",
        //         "这是一个对话框的测试",
        //         (err, data: IfPacket) => {
        //             if (err) {
        //                 Tool.printRed("session timeout");
        //                 return;
        //             }
        //             Tool.printBlink(JSON.stringify(data));
        //         },
        //     );
        // }, 2000);

    });

    commQT.emitter.on("end", () => {
        Tool.printYellow("Link ended");

        commQT.exit();

        setTimeout(() => {
            commQT.init();
        }, commQT.DELAY_RECONNECT);
    });

    commQT.emitter.on("cmd", (dataBig: IfMsgCmd) => {
        const data = dataBig.data;

        switch (dataBig.message) {
            case "start":

                Tool.printRed("Buzzer on");
                ControlPeriph.Buzzer();

                if (appBaking.runningStatus === RunningStatus.PAUSED) {
                    Tool.print("Start from paused");

                    ControlPeriph.TurnOnRunningLED(() => {
                        Tool.print("Turn on LED");
                    });

                    appBaking.start();

                    clearInterval(appBaking.timerTrap);

                    appBaking.timerTrap = setInterval(() => {
                        commQT.sendTrap(InfoType.Val_TrapBaking, appBaking.getTrapBaking());
                    }, 3000);

                    commQT.sendSetResp(data.PacketId, data.Obj, "OK");

                } else if (appBaking.runningStatus === RunningStatus.WAITING) {
                    Tool.print("App start");
                    appBaking.start();
                    // report baking info regularly

                    appBaking.timerTrap = setInterval(() => {
                        commQT.sendTrap(InfoType.Val_TrapBaking, appBaking.getTrapBaking());
                    }, 5000);

                    ControlPeriph.TurnOnRunningLED(() => {
                        Tool.print("Turn on LED");
                    });

                    decoder.createBatch();

                    commQT.sendSetResp(data.PacketId, data.Obj, "OK");

                } else {
                    Tool.printRed("Should not respond to start, state:" + appBaking.runningStatus);
                    commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                }

                break;
            case "stop":
                Tool.print("App stop");
                ControlPeriph.Buzzer();

                if (appBaking.runningStatus === RunningStatus.RUNNING) {
                    appBaking.stop();

                    clearInterval(appBaking.timerTrap);

                    Tool.printBlue("App stopped");

                    ControlPeriph.TurnOffRunningLED(() => {
                        Tool.print("Turn off LED");
                    });

                    commQT.sendSetResp(data.PacketId, data.Obj, "OK");

                } else if (appBaking.runningStatus === RunningStatus.STOPPED) {
                    clearInterval(appBaking.timerTrap);
                    Tool.printBlue("Clear timerTrap");
                    Tool.printBlue("Already stopped");

                    commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                } else if (appBaking.runningStatus === RunningStatus.PAUSED) {
                    clearInterval(appBaking.timerTrap);
                    Tool.printBlue("Clear timerTrap");

                    appBaking.stop();

                    Tool.printBlue("App stopped");

                    commQT.sendSetResp(data.PacketId, data.Obj, "OK");

                } else {
                    Tool.printRed("Should not respond to stop, state:" + appBaking.runningStatus);

                    commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                }

                break;
            case "pause":
                Tool.print("App pause");
                ControlPeriph.Buzzer();

                if (appBaking.runningStatus === RunningStatus.RUNNING) {
                    appBaking.pause();
                    Tool.print("App paused");

                    ControlPeriph.TurnOffRunningLED(() => {
                        Tool.print("Turn off LED");
                    });

                    commQT.sendSetResp(data.PacketId, data.Obj, "OK");

                } else {
                    Tool.printRed("Should not respond to pause, state:" + appBaking.runningStatus);
                    commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                }

                break;
            case "reset":

                ControlPeriph.Buzzer();

                Tool.print("App reset");
                if (appBaking.runningStatus === RunningStatus.STOPPED) {
                    // push status to the cloud
                    appBaking.reset();
                    Tool.print("App reseted");

                    // decoder.init({});

                    ControlPeriph.TurnOffRunningLED(() => {
                        Tool.print("Turn off LED");
                    });

                    commQT.sendTrap(InfoType.Val_SysInfo, appBaking.loadSysInfo());

                    commQT.sendSetResp(data.PacketId, data.Obj, "OK");

                } else {
                    Tool.printRed("Should not respond to reset, state:" + appBaking.runningStatus);

                    commQT.sendSetResp(data.PacketId, data.Obj, "NOK");

                }

                break;
            case "resetdefault":
                ControlPeriph.Buzzer2();

                Tool.print("App reset to default");

                if (appBaking.runningStatus === RunningStatus.WAITING) {

                    commQT.sendSetResp(data.PacketId, data.Obj, "OK");

                    // stop timer
                    clearInterval(commQT.timer);

                    // appBaking.ResetToDefault();

                    ControlPeriph.TurnOffRunningLED(() => {
                        Tool.print("Turn off LED");
                    });

                    setTimeout(() => {
                        appBaking.init({ decoder: decoder });

                        Tool.print("App init");
                        commQT.sendTrap(InfoType.Val_SysInfo, appBaking.loadSysInfo());

                        commQT.timer = setInterval(() => {
                            // commQT.sendTrap(InfoType.Val_TrapInfo, appBaking.getTrapInfo());

                            appBaking.getTrapInfoAsync((err, data1) => {
                                if (err) {
                                    Tool.printRed("getTrapInfoAsync fail");
                                    return;
                                }
                                commQT.sendTrap(InfoType.Val_TrapInfo, data1);
                            });
                        }, TRAP_PERIOD);

                    }, 2000);
                } else {
                    Tool.printRed("Should not respond to resetdefault, state:" + appBaking.runningStatus);

                    commQT.sendSetResp(data.PacketId, data.Obj, "NOK");

                }

                break;
            default:
                Tool.print("App wrong command");
                commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                break;
        }
    });
    commQT.emitter.on("get", (data: IfPacket) => {

        switch (data.Obj) {
            case InfoType.Val_SysInfo:
                appBaking.loadInfoCollectAsync((d: IInfoCollect) => {
                    commQT.sendGetResp(data.PacketId, data.Obj, d.SysInfo);
                });
                // commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadSysInfo());
                break;
            case InfoType.Val_SettingCurveInfo:
                Tool.printRed("SettingCurve is able to get");
                commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadSettingCurveInfo(data.Content));
                break;
            case InfoType.Val_RunningCurveInfo:
                Tool.printRed("RunningCurveInfo is able to get");
                appBaking.loadInfoCollectAsync((d: IInfoCollect) => {
                    commQT.sendGetResp(data.PacketId, data.Obj, d.RunningCurveInfo);
                });
                // commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadRunningCurveInfo());
                break;
            case InfoType.Val_ResultInfo:
                appBaking.loadInfoCollectAsync((d: IInfoCollect) => {
                    commQT.sendGetResp(data.PacketId, data.Obj, d.ResultInfo);
                });
                // commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadResultInfo());
                break;
            // case InfoType.Val_TrapInfo:
            //     break;
            case InfoType.Val_RunningState:

                commQT.sendGetResp(data.PacketId, data.Obj, appBaking.getRunning());

                break;
            case InfoType.Val_BakingInfo:
                Tool.printBlue("Get BakingInfo received");
                appBaking.loadInfoCollectAsync((d: IInfoCollect) => {
                    commQT.sendGetResp(data.PacketId, data.Obj, d.BakingInfo);
                });
                break;
            case InfoType.Val_BaseSetting:
                Tool.printBlue("Get BaseSetting received");

                appBaking.loadInfoCollectAsync((d: IInfoCollect) => {
                    commQT.sendGetResp(data.PacketId, data.Obj, d.BaseSetting);
                });

                break;
            case InfoType.Val_CloudCurveInfo:
                Tool.printBlue("Get CloudCurveInfo received");

                decoder.getRecoProfileRetry((err, fb) => {
                    if (err) {
                        Tool.printRed(err);
                        commQT.sendGetResp(data.PacketId, data.Obj, {
                            Index: 0,  // 0, 1, 2
                            NumOfCurves: 0,  // 3
                            TempCurveDryList: [],
                            TempCurveWetList: [], // 度,23.1, 一位小数点
                            TempDurationList: [],
                            score: 0,
                        });
                        return;
                    }
                    commQT.sendGetResp(data.PacketId, data.Obj, fb);
                });

                break;
            case InfoType.Val_CloudContinueBaking:
                Tool.printRed("CloudContinueBaking is able to get");

                // get info from cloud
                appBaking.fetchInfoFromCloudAsync((err) => {

                    if (err) {
                        commQT.sendGetResp(data.PacketId, data.Obj, "NOK");
                        return;
                    }
                    appBaking.loadInfoCollectAsync((d: IInfoCollect) => {
                        commQT.sendGetResp(data.PacketId, data.Obj, d.RunningCurveInfo);
                    });
                });
                break;
            case InfoType.Val_Qrcode:
                Tool.printRed("Get QRCode.");

                commQT.sendGetResp(data.PacketId, data.Obj, decoder.getId());

                break;
            default:
                Tool.print("Wrong Get packet obj type:" + data.Obj);

                commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                break;
        }
    });

    commQT.emitter.on("set", (data: IfPacket) => {// It's data.Content
        switch (data.Obj) {
            case InfoType.Val_SysInfo:
                Tool.printYellow("SysInfo can not be set");
                commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                break;
            case InfoType.Val_SettingCurveInfo:
                Tool.printYellow("Default SettingCurveInfo can not be set");
                commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                break;
            case InfoType.Val_RunningCurveInfo:
                appBaking.updateRunningCurveInfoAsync(data.Content);
                //save profile
                if (appBaking.runningStatus === RunningStatus.WAITING) {
                    decoder.saveProfile(data.Content);
                } else {
                    decoder.updateProfile(data.Content);
                }
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");
                break;
            case InfoType.Val_ResultInfo:
                appBaking.updateResult(data.Content);
                //Update batch
                decoder.updateBatch(data.Content);
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");
                break;
            case InfoType.Val_TrapInfo:
                Tool.printRed("Trap set , impossible");
                commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                break;
            case InfoType.Val_BakingInfo:
                appBaking.updateBakingInfoAsync(data.Content, () => {
                    // create Batch ID
                    decoder.saveBatch();
                });
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");

                break;
            case InfoType.Val_BaseSetting:
                appBaking.updateBaseSettingAsync(data.Content);
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");
                break;
            case InfoType.Val_UDisk:
                UDisk.handle(data.Content, (err, fb) => {
                    if (err) {
                        commQT.sendSetResp(data.PacketId, data.Obj, fb);
                        return;
                    }
                    commQT.sendSetResp(data.PacketId, data.Obj, fb);
                });
                break;
            default:
                Tool.print("Wrong Get packet obj type:" + data.Obj);
                commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                break;
        }
    });

    /***************************************************************
     * Background task
    */
    setInterval(() => {
        ControlPeriph.fetchParamsWithPromise(commMCU, () => {
            Tool.print("Fetch Params");
        });
    }, 5070);

    setInterval(() => {
        ControlPeriph.fetchFastParamsWithPromise(() => {
            Tool.print("Fetch fast params");
        });
    }, 1900);

    setTimeout(() => {
        if (decoder.getUpdateTag() === true) {
            console.log("updatable")
            commQT.sendQueryYesNo("更新", "有新版本，是否要更新", (err, data: IfPacket) => {
                if (err) {
                    Tool.printRed("session timeout");
                    return;
                }
                Tool.printBlink(JSON.stringify(data));
                decoder.update();
            });
        }
    }, 9700);
}
