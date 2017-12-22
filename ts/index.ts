
declare var $: any;
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
import { JustTest } from "./JustTest";
import { LocalStorage } from "./LocalStorage";

import { ProtobufDecode } from "./ProtobufDecode";
import { Tool } from "./utility";

const TRAP_PERIOD = 1400;

const appBaking = new RunningHandle(
    {
        timeDelta: 10000, // in ms, 10 seconds
    });

const commQT = new CommQT({});

const gps = new ControlGPS();

const gprs = new ControlGPRS();

const commMCU = new ControlMcu();

// const mqttApp = new MqttApp({
//     address: "ssl://a5de16f68b2d48098d601c885a3aa444.mqtt.iot.gz.baidubce.com",
//     port: 1884,
//     name: "a5de16f68b2d48098d601c885a3aa444/ruff_super_test",
//     key: "7KokioMzX17dwj0tkZ2yVJ0GRdt71aAK5bCNCs2Y8Hk=",
//     clientId: "curing_device_ruff_test",
// });

const decoder = new ProtobufDecode();

const option: IfHttpsApp = {
    hostname: "api.shdingyun.com",
    port: 443,
};

const client = new HttpsApp(option);

const test = new JustTest(commMCU);

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

    Alarm.init();

    ControlPeriph.init({
        max_angle: 90,
        min_angle: 0,
        speed: 22, // speed of windgate
    });

    // gps.start();

    // gprs.start();

    setTimeout(() => {
        Tool.printYellow("Go to main()");
        main();
        // test.test();
        // test.testHttps();
        // test.testSN();
        // test.testGPRS(gprs);
        // test.testWindGate(commMCU);
        // test.testWindGateProtect(commMCU);
    }, 2000);

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
    // mqttApp.start();
    appBaking.init({});

    // 云端交互初始化
    // decoder.init({});

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
        }, 500);

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

                    decoder.init({});

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

                    appBaking.ResetToDefault();

                    ControlPeriph.TurnOffRunningLED(() => {
                        Tool.print("Turn off LED");
                    });

                    setTimeout(() => {
                        appBaking.init({});

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
                commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadSettingCurveInfo());
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

                // Read curves from cloud
                appBaking.loadInfoCollectAsync((d: IInfoCollect) => {
                    commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadSettingCurveInfo());
                });

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
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");
                break;
            case InfoType.Val_ResultInfo:
                appBaking.updateResult(data.Content);
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");
                break;
            case InfoType.Val_TrapInfo:
                Tool.printRed("Trap set , impossible");
                commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                break;
            case InfoType.Val_BakingInfo:
                appBaking.updateBakingInfoAsync(data.Content);
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");
                break;
            case InfoType.Val_BaseSetting:
                appBaking.updateBaseSettingAsync(data.Content);
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");
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
    }, 5000);

    setInterval(() => {
        ControlPeriph.fetchFastParamsWithPromise(() => {
            Tool.print("Fetch fast params");
        });
    }, 1300);

}
// For cloud interface
// function cloud_main() {
//     setInterval(() => {
//         // client.login();
//     }, 24 * 3600 * 1000);
// }
