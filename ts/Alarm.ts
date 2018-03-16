import * as fs from "fs";
import * as path from "path";
import { AppConfig } from "./AppConfig";
import { ControlPeriph } from "./ControlPeripheral";
import { LocalStorage } from "./LocalStorage";

import {
    IfConfigFile,
    IInfoCollect,
    RunningStatus,
} from "./BakingCfg";

import { Tool } from "./utility";
import { ProtobufDecode } from "./ProtobufDecode";

export interface IfTargetTemp {
    index: number;
    timeElapsed: number;
    lstTemp: number[][];
    lstDur: number[];
}

let gpsLastLatitude: number = 0;
let gpsLastLongitude: number = 0;

let objConfig: IfConfigFile = AppConfig.getAppConfig();

let alarmCfg = objConfig.baking_config.alarm_threshold;

let ALARM_CHECKING_PERIOD: number = 2.5; // 5000;

let DRY_TEMP_ALARM_PERIOD: number = alarmCfg.dry_temp_alarm_period * 10;
// 30 * 60;

let DRY_TEMP_ALARM_LIMIT: number = alarmCfg.dry_temp_alarm_limit;
// 2;

let DRY_TEMP_ALARM_PERIOD_2: number = alarmCfg.dry_temp_alarm_period_2 * 10;
// 10 * 60;
let DRY_TEMP_ALARM_LIMIT_2: number = alarmCfg.dry_temp_alarm_limit_2;
// 4;

let WET_TEMP_ALARM_PERIOD: number = alarmCfg.wet_temp_alarm_period * 10;
// 10 * 60 ;
let WET_TEMP_ALARM_LIMIT: number = alarmCfg.wet_temp_alarm_limit;
// 2;

let MAX_TEMP: number = alarmCfg.max_temp;
// 70;
let MIN_TEMP: number = alarmCfg.min_temp;
// 0;

function isRunning(info: IInfoCollect): boolean {
    if (info.SysInfo.bInRunning === RunningStatus.PAUSED ||
        info.SysInfo.bInRunning === RunningStatus.RUNNING) {
        return true;
    } else {
        return false;
    }
}
function isOverTemp(t: number): boolean {
    if (t > MAX_TEMP) {
        return true;
    } else {
        return false;
    }
}
function isUnderTemp(t: number): boolean {
    if (t < MIN_TEMP) {
        return true;
    } else {
        return false;
    }
}
function CheckTempDelta(delta: number, tLimit: number): boolean {
    let a: number;

    if (delta >= 0) {
        a = delta;
    } else {
        a = (- delta);
    }

    if (a > tLimit) {
        return true;
    } else {
        return false;
    }
}

function GetTargetTemp(option: IfTargetTemp) {
    const index = option.index;
    const timeElapsed = option.timeElapsed;

    const tempBegin: number = option.lstTemp[index][0];
    const tempEnd: number = option.lstTemp[index][1];
    const duration: number = option.lstDur[index];

    const tempStep: number = tempBegin - tempEnd;
    if (tempStep < 0.01 && tempStep > -0.01) {
        return tempBegin;
    } else {
        return (tempBegin
            + (tempEnd - tempBegin)
            * timeElapsed / (duration * 60));
    }
}

export class Alarm {

    public static checkPeriod: number;

    public static dryTempCounter: number;
    public static dryTempCounterMax: number;

    public static dryTemp2Counter: number;
    public static dryTemp2CounterMax: number;

    public static wetTempCounter: number;
    public static wetTempCounterMax: number;

    public static windEnginePhaseLostCounter: number;
    public static windEngineOverloadCounter: number;
    public static windEngineCounterMax: number;

    public static windEngineState: boolean;
    public static windEngineTimerCounter: number;
    public static windEngineInCheck: boolean;
    public static windEngineInCheckPeriod: boolean;
    public static windEngineOpenCounter: number;
    public static bOverload: boolean;
    public static bPhaseLost: boolean;
    public static decoder: ProtobufDecode;

    public static init(option) {
        console.log("\nAlarm init():");

        objConfig = AppConfig.getAppConfig();
        alarmCfg = objConfig.baking_config.alarm_threshold;
        ALARM_CHECKING_PERIOD = 2.5;
        DRY_TEMP_ALARM_PERIOD = alarmCfg.dry_temp_alarm_period * 10;
        DRY_TEMP_ALARM_LIMIT = alarmCfg.dry_temp_alarm_limit;
        DRY_TEMP_ALARM_PERIOD_2 = alarmCfg.dry_temp_alarm_period_2 * 10;
        DRY_TEMP_ALARM_LIMIT_2 = alarmCfg.dry_temp_alarm_limit_2;
        WET_TEMP_ALARM_PERIOD = alarmCfg.wet_temp_alarm_period * 10;
        WET_TEMP_ALARM_LIMIT = alarmCfg.wet_temp_alarm_limit;
        MAX_TEMP = alarmCfg.max_temp;
        MIN_TEMP = alarmCfg.min_temp;

        Alarm.checkPeriod = ALARM_CHECKING_PERIOD;

        Alarm.dryTempCounter = 0;
        Alarm.dryTempCounterMax = DRY_TEMP_ALARM_PERIOD / ALARM_CHECKING_PERIOD;
        Alarm.dryTemp2Counter = 0;
        Alarm.dryTemp2CounterMax = DRY_TEMP_ALARM_PERIOD_2 / ALARM_CHECKING_PERIOD;

        Alarm.wetTempCounter = 0;
        Alarm.wetTempCounterMax = WET_TEMP_ALARM_PERIOD / ALARM_CHECKING_PERIOD;

        console.log("dryTemp counter max:" + Alarm.dryTempCounterMax);
        console.log("dryTemp2 counter max:" + Alarm.dryTemp2CounterMax);
        console.log("wetTemp counter max:" + Alarm.wetTempCounterMax);

        Alarm.windEnginePhaseLostCounter = 0;
        Alarm.windEngineOverloadCounter = 0;
        Alarm.windEngineCounterMax = 6; // TRAP_PERIOD = 1.5, so 1.5 * 10 = 15 seconds;
        Alarm.windEngineState = true; // It's on state
        Alarm.windEngineTimerCounter = 0;
        Alarm.windEngineInCheck = false;
        Alarm.windEngineInCheckPeriod = false;
        Alarm.windEngineOpenCounter = 0;

        Alarm.bOverload = false;
        Alarm.bPhaseLost = false;

        Alarm.decoder = option.decoder;

    }
    public static reset() {
        Alarm.dryTempCounter = 0;
        Alarm.dryTemp2Counter = 0;
        Alarm.wetTempCounter = 0;
    }

    /**
     * bRunning
     * dryTargetTemp
     */
    public static checkDryTemp(bRunning: boolean, targetTemp: number, dryT: number, wetT: number): number {
        const tempDryTarget: number = targetTemp;
        Tool.printGreen("check dry temp");

        // 不运行就无告警
        if (!bRunning) {
            Tool.printYellow("Not running");
            return 0;
        }
        if (wetT > dryT) {
            Tool.printRed("Wet temp > dry temp," + wetT + "," + dryT);
            this.decoder.alarm(1, wetT, dryT, true);
            return 1;
        } else {
            this.decoder.alarm(1, wetT, dryT, false);
        }

        if (isOverTemp(dryT)) {
            Tool.printRed("temp overTemp " + dryT);
            this.decoder.alarm(2, 0, dryT, true);
            return 1;
        } else if (isUnderTemp(dryT)) {
            Tool.printRed("temp underTemp " + dryT);
            this.decoder.alarm(2, 0, dryT, true);
            return 1;
        } else {
            this.decoder.alarm(2, 0, dryT, false);
        }

        if (CheckTempDelta(dryT - tempDryTarget, DRY_TEMP_ALARM_LIMIT)) {
            Alarm.dryTempCounter++;
        } else {
            Alarm.dryTempCounter = 0;
        }
        Tool.printGreen("dryTempCounter:" + Alarm.dryTempCounter);
        Tool.printGreen("dryTempCounterMAX:" + Alarm.dryTempCounterMax);

        if (Alarm.dryTempCounter > Alarm.dryTempCounterMax) {
            Alarm.dryTempCounter = Alarm.dryTempCounterMax + 1;
            this.decoder.alarm(3, 0, dryT, true);
            return 1;
        } else {
            this.decoder.alarm(3, 0, dryT ,false);
        }

        if (CheckTempDelta(dryT - tempDryTarget, DRY_TEMP_ALARM_LIMIT_2)) {
            Alarm.dryTemp2Counter++;
        } else {
            Alarm.dryTemp2Counter = 0;
        }
        Tool.printGreen("dryTempCounter2:" + Alarm.dryTemp2Counter);
        Tool.printGreen("dryTemp2CounterMAX:" + Alarm.dryTemp2CounterMax);

        if (Alarm.dryTemp2Counter > Alarm.dryTemp2CounterMax) {
            Alarm.dryTemp2Counter = Alarm.dryTemp2CounterMax + 1;
            this.decoder.alarm(4, 0, dryT, true);
            return 1;
        } else {
            this.decoder.alarm(4, 0, dryT, false);
        }

        return 0;
    }
    public static checkWetTemp(bRunning: boolean, targetTemp: number, wetT: number, dryT: number): number {
        const tempWetTarget: number = targetTemp;

        Tool.printGreen("check wet temp");

        if (!bRunning) {
            Tool.printYellow("Not running");
            return 0;
        }
        if (wetT > dryT) {
            Tool.printRed("wetT > dryT: " + wetT + "," + dryT);
            this.decoder.alarm(1, wetT, dryT, true);
            return 1;
        } else {
            this.decoder.alarm(1, wetT, dryT, false);
        }

        if (isOverTemp(wetT)) {
            Tool.printRed("wet temp overTemp " + wetT);
            this.decoder.alarm(5, wetT, 0, true);
            return 1;
        } else if (isUnderTemp(wetT)) {
            Tool.printRed("wet temp underTemp " + wetT);
            this.decoder.alarm(5, wetT, 0, true);
            return 1;
        } else {
            this.decoder.alarm(5, wetT, 0, false);
        }

        if (CheckTempDelta(wetT - tempWetTarget, WET_TEMP_ALARM_LIMIT)) {
            Alarm.wetTempCounter++;
        } else {
            Alarm.wetTempCounter = 0;

        }
        Tool.printGreen("wetTempCounter:" + Alarm.wetTempCounter);
        Tool.printGreen("wet TempCounterMAX:" + Alarm.wetTempCounterMax);

        if (Alarm.wetTempCounter > Alarm.wetTempCounterMax) {
            Alarm.wetTempCounter = Alarm.wetTempCounterMax + 1;
            this.decoder.alarm(6, wetT, 0, true);
            return 1;
        } else {
            this.decoder.alarm(6, wetT, 0, false);
        }

        return 0;
    }
    public static checkVoltageLow(v: number): number {
        if (v > 220 * 1.1 || v < 220 * 0.9) {
            this.decoder.alarm(7, v, 0, true);
            return 1;
        } else {
            this.decoder.alarm(7, v, 0, false);
            return 0;
        }
    }
    public static delayOpen(time) {

        Alarm.windEngineTimerCounter++;

        if (Alarm.windEngineTimerCounter > 10) {
            return;
        }

        Alarm.windEngineInCheckPeriod = true;

        setTimeout(() => {

            ControlPeriph.TurnOnWindEngine(() => {
                Tool.printRed("Turn on WindEngine: after 60 seconds");
                Alarm.windEngineInCheck = true;
                Alarm.windEngineState = true;
                Alarm.windEngineOpenCounter = 5;
                Alarm.windEnginePhaseLostCounter = 0;
                Alarm.windEngineOverloadCounter = 0;
            });
        }, time);
    }

    public static checkPowerExist(vA: number, vB: number, vAplusB: number): number {
        Alarm.windEngineOpenCounter--;

        if (Alarm.windEngineOpenCounter === 0) {
            ControlPeriph.TurnOffWindEngine(() => {
                Tool.printRed("Turn off WindEngine");
            });
            Alarm.windEngineState = false;
            Alarm.windEngineInCheck = false;
            Alarm.delayOpen(60000);

            return 1;
        }

        if (vA < 0.03 || vB < 0.03 || vAplusB < 0.03) {
            Tool.printRed("Still no power");

            return 1;
        }

        if (vA > 3 && vB > 3 && vAplusB > 3 && Alarm.windEngineOpenCounter === 1) {
            Tool.printRed("Still overload power");

            return 1;
        }

        Alarm.windEngineInCheck = false;
        Alarm.windEnginePhaseLostCounter = 0;
        Alarm.windEngineOverloadCounter = 0;
        Alarm.windEngineInCheckPeriod = false;

        return 0;
    }

    public static checkPhaseA(vA: number, vB: number, vAplusB: number): number {
        if ((Alarm.windEngineInCheckPeriod === true) && (Alarm.windEngineInCheck === true)) {

            Alarm.checkPowerExist(vA, vB, vAplusB);

            return 1;

        } else if (Alarm.windEngineInCheckPeriod === true) {
            Tool.print("go");
            return 1;
        }

        if (vA < 0.03 && vB < 0.03 && vAplusB < 0.03 && Alarm.windEngineState === true) {
            // ControlPeriph.TurnOnWindEngine(() => {
            //     Tool.printRed("Turn on WindEngine: no alarm");
            // });
            Tool.printYellow("Windengine is turn off");
            return 0;
        }

        if (vA < 0.03 || vB < 0.03 || vAplusB < 0.03) {
            Alarm.windEnginePhaseLostCounter++;
        } else {
            Alarm.windEnginePhaseLostCounter--;
            if (Alarm.windEnginePhaseLostCounter < 0) {
                Alarm.windEnginePhaseLostCounter = 0;
                Alarm.bPhaseLost = false;
            }
        }

        if (vA > 1.818 && vB > 1.818 && vAplusB > 1.818) {
            Alarm.windEngineOverloadCounter++;
        } else {
            Alarm.windEngineOverloadCounter--;
            if (Alarm.windEngineOverloadCounter < 0) {
                Alarm.windEngineOverloadCounter = 0;
                Alarm.bOverload = false;
            }
        }

        if (Alarm.windEnginePhaseLostCounter >= Alarm.windEngineCounterMax) {
            Tool.printRed("Windengine phase lost Alarm !!!");
            Alarm.windEnginePhaseLostCounter = 10;
            ControlPeriph.TurnOffWindEngine(() => {
                Tool.printRed("Turn off WindEnginej:phase lost");
                Alarm.windEngineState = false;
            });
            Alarm.delayOpen(60000);

            Alarm.bPhaseLost = true;

            this.decoder.alarm(8, 0, 0, true);

            return 1;
        } else {
            this.decoder.alarm(8, 0, 0, false);
        }

        if (Alarm.windEngineOverloadCounter >= Alarm.windEngineCounterMax) {
            Tool.printRed("Windengine overload Alarm !!!");
            Alarm.windEngineOverloadCounter = 10;
            ControlPeriph.TurnOffWindEngine(() => {
                Tool.printRed("Turn off WindEngine: overload");
                Alarm.windEngineState = false;
            });
            Alarm.delayOpen(60000);

            Alarm.bOverload = true;

            this.decoder.alarm(9, 0, 0, true);

            return 1;
        } else {
            this.decoder.alarm(9, 0, 0, false);
        }

        if (Alarm.windEnginePhaseLostCounter === 0 && Alarm.windEngineOverloadCounter === 0 && Alarm.windEngineState === false) {
            ControlPeriph.TurnOnWindEngine(() => {
                Tool.printRed("Turn on WindEngine: no alarm");
                Alarm.windEngineState = true;
            });
        }

        return 0;
    }
    public static checkPhaseB(): number {
        return 0;
    }
    public static checkPhaseC(): number {
        return 0;
    }
    public static checkGPRS(): number {

        if (ControlPeriph.vGPRSSignal <= 0) {
            return 1;
        }

        return 0;
    }
    public static checkGPS(): number {

        if (ControlPeriph.gpsLatitude < 0.001 ||
            ControlPeriph.gpsLongitude < 0.001) {
            return 1;
        } else if ((ControlPeriph.gpsLatitude - gpsLastLatitude) < 0.001 &&
            (ControlPeriph.gpsLongitude - gpsLastLongitude) < 0.001) {
            gpsLastLatitude = ControlPeriph.gpsLatitude;
            gpsLastLongitude = ControlPeriph.gpsLongitude;
        } else {
            // open file, save it into sysinfo
            gpsLastLatitude = ControlPeriph.gpsLatitude;
            gpsLastLongitude = ControlPeriph.gpsLongitude;
            // save it to file
            // const info: IInfoCollect = LocalStorage.loadBakingStatus();
            // info.BaseSetting.GPSInfo = {
            //     Longitude: ControlPeriph.gpsLongitude,
            //     Latitude: ControlPeriph.gpsLatitude,
            // };

            // LocalStorage.saveBakingStatus(info);
        }

        return 0;
    }
}
