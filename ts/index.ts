
declare var $: any;
// import { ControlMcu } from "./ControlMcu";
import * as Protobuf from "protobufjs";
import { clearInterval, setTimeout } from "timers";
import * as _ from "underscore";
import { IInfoCollect, RunningStatus } from "./BakingCfg";
import { RunningHandle } from "./BakingProc";

import { ControlGPS } from "./ControlGPS";
import { ControlMcu } from "./ControlMcu";
import { ControlPeriph } from "./ControlPeripheral";
import { CommQT, IfPacket, InfoType } from "./ControlQT";
import { DecodePB } from "./DecodePB";
import { LocalStorage } from "./LocalStorage";
import { MqttApp } from "./MqttApp";
import { Tool } from "./utility";
import { YAsync } from "./yjasync";

const appBaking = new RunningHandle(
    {
        timeDelta: 10000, // in ms, 10 seconds
    });

const commQT = new CommQT({});

const gps = new ControlGPS();

const commMCU = new ControlMcu();

const mqttApp = new MqttApp({
    address: "ssl://a5de16f68b2d48098d601c885a3aa444.mqtt.iot.gz.baidubce.com",
    port: 1884,
    name: "a5de16f68b2d48098d601c885a3aa444/ruff_super_test",
    key: "7KokioMzX17dwj0tkZ2yVJ0GRdt71aAK5bCNCs2Y8Hk=",
    clientId: "curing_device_ruff_test",
});

const decoder = new DecodePB({
    path: __dirname + "/../data/awesome.proto",
    className: "awesomepackage.AwesomeMessage",
});

$.ready((error) => {
    if (error) {
        console.log(error);
        return;
    }

    Tool.printMagenta("################");
    Tool.printMagenta("App Begin");
    Tool.printMagenta("################\n");

    Tool.readMachineSN();

    setTimeout(() => {
        main();
    }, 2000);
});

$.end(() => {
    Tool.printMagenta("################");
    Tool.print("Ruff App end");

    setTimeout(() => {
        Tool.print("Quit QT process");
        commQT.exit();
    }, 0);

    Tool.printMagenta("################\n");
});

function main() {
    // This is the mqtt client
    // mqttApp.start();

    gps.start();

    // Task init, very important
    appBaking.init({});

    /***************************
     * CommQT
     */

    commQT.init();

    commQT.emitter.on("connected", () => {
        // if connected
        Tool.print("socket connected");

        setTimeout(() => {
            commQT.sendTrap(InfoType.Val_SysInfo, appBaking.loadSysInfo());
        }, 1000);

        // Housekeeping work, send current temp
        setTimeout(() => {
            setInterval(() => {
                commQT.sendTrap(InfoType.Val_TrapInfo, appBaking.getTrapInfo());
            }, 5000);
        }, 2000);

    });

    commQT.emitter.on("end", () => {
        Tool.printYellow("Link ended");

        commQT.exit();

        setTimeout(() => {
            commQT.init();
        }, commQT.DELAY_RECONNECT);
    });

    commQT.emitter.on("cmd", (dataBig) => {
        const data = dataBig.in;

        switch (dataBig.message) {
            case "start":

                if (appBaking.runningStatus === RunningStatus.PAUSED) {
                    Tool.print("Start from paused");
                    appBaking.start();

                    ControlPeriph.TurnOnRunningLED(() => {
                        Tool.print("Turn on LED");
                    });

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

                    commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                } else {
                    Tool.printRed("Should not respond to stop, state:" + appBaking.runningStatus);

                    commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                }

                break;
            case "pause":
                Tool.print("App pause");
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
                Tool.print("App reset");
                if (appBaking.runningStatus === RunningStatus.STOPPED) {
                    // push status to the cloud
                    appBaking.reset();
                    Tool.print("App reseted");

                    commQT.sendTrap(InfoType.Val_SysInfo, appBaking.loadSysInfo());

                    commQT.sendSetResp(data.PacketId, data.Obj, "OK");

                } else {
                    Tool.printRed("Should not respond to reset, state:" + appBaking.runningStatus);

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
                commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadSysInfo());
                break;
            case InfoType.Val_SettingCurveInfo:
                Tool.printRed("SettingCurve is not able to get");
                break;
            case InfoType.Val_RunningCurveInfo:
                commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadRunningCurveInfo());
                break;
            case InfoType.Val_ResultInfo:
                commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadResultInfo());
                break;
            // case InfoType.Val_TrapInfo:
            //     break;
            case InfoType.Val_RunningState:
                commQT.sendGetResp(data.PacketId, data.Obj, appBaking.getRunning());
                break;
            case InfoType.Val_BakingInfo:
                commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadBakingInfo());
                break;
            case InfoType.Val_BaseSetting:
                Tool.printBlue("Get BaseSetting received");
                commQT.sendGetResp(data.PacketId, data.Obj, appBaking.loadBaseSetting());
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
                appBaking.updateRunningCurveInfo(data.Content);
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
                appBaking.updateBakingInfo(data.Content);
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");
                break;
            case InfoType.Val_BaseSetting:
                appBaking.updateBaseSetting(data.Content);
                commQT.sendSetResp(data.PacketId, data.Obj, "OK");
                break;
            default:
                Tool.print("Wrong Get packet obj type:" + data.Obj);
                commQT.sendSetResp(data.PacketId, data.Obj, "NOK");
                break;
        }
    });

    /***************************************************************
     *
    */

    setInterval(() => {
        ControlPeriph.fetchParams(commMCU);
    }, 5000);
}
