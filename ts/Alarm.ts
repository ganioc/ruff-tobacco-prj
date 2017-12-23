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

export interface IfTargetTemp {
    index: number;
    timeElapsed: number;
    lstTemp: number[][];
    lstDur: number[];
}

let gpsLastLatitude: number = 0;
let gpsLastLongitude: number = 0;

const objConfig: IfConfigFile = AppConfig.getAppConfig();

const alarmCfg = objConfig.baking_config.alarm_threshold;

const ALARM_CHECKING_PERIOD: number = alarmCfg.alarm_checking_period; // 5000;

const DRY_TEMP_ALARM_PERIOD: number = alarmCfg.dry_temp_alarm_period * 60 * 1000;
// 30 * 60 * 1000;

const DRY_TEMP_ALARM_LIMIT: number = alarmCfg.dry_temp_alarm_limit;
// 2;

const DRY_TEMP_ALARM_PERIOD_2: number = alarmCfg.dry_temp_alarm_period_2 * 60 * 1000;
// 10 * 60 * 1000;
const DRY_TEMP_ALARM_LIMIT_2: number = alarmCfg.dry_temp_alarm_limit_2;
// 4;

const WET_TEMP_ALARM_PERIOD: number = alarmCfg.wet_temp_alarm_period * 60 * 1000;
// 10 * 60 * 1000;
const WET_TEMP_ALARM_LIMIT: number = alarmCfg.wet_temp_alarm_limit;
// 2;

const MAX_TEMP: number = alarmCfg.max_temp;
// 70;
const MIN_TEMP: number = alarmCfg.min_temp;
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
    if (delta > tLimit) {
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
function GetDryTargetTemp(info: IInfoCollect): number {
    const obj: IfTargetTemp = {
        index: info.RunningCurveInfo.CurrentStage,
        timeElapsed: info.RunningCurveInfo.CurrentStageRunningTime,
        lstTemp: info.RunningCurveInfo.TempCurveDryList,
        lstDur: info.RunningCurveInfo.TempDurationList,
    };

    return GetTargetTemp(obj);
}
function GetWetTargetTemp(info: IInfoCollect): number {
    const obj: IfTargetTemp = {
        index: info.RunningCurveInfo.CurrentStage,
        timeElapsed: info.RunningCurveInfo.CurrentStageRunningTime,
        lstTemp: info.RunningCurveInfo.TempCurveWetList,
        lstDur: info.RunningCurveInfo.TempDurationList,
    };

    return GetTargetTemp(obj);
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

    public static init() {
        Alarm.checkPeriod = ALARM_CHECKING_PERIOD;

        Alarm.dryTempCounter = 0;
        Alarm.dryTempCounterMax = DRY_TEMP_ALARM_PERIOD / ALARM_CHECKING_PERIOD;
        Alarm.dryTemp2Counter = 0;
        Alarm.dryTemp2CounterMax = DRY_TEMP_ALARM_PERIOD_2 / ALARM_CHECKING_PERIOD;

        Alarm.wetTempCounter = 0;
        Alarm.wetTempCounterMax = WET_TEMP_ALARM_PERIOD / ALARM_CHECKING_PERIOD;

        Alarm.windEnginePhaseLostCounter = 0;
        Alarm.windEngineOverloadCounter = 0;
        Alarm.windEngineCounterMax = 6; // TRAP_PERIOD = 1.5, so 1.5 * 10 = 15 seconds;
        Alarm.windEngineState = true; // It's on state
        Alarm.windEngineTimerCounter = 0;
        Alarm.windEngineInCheck = false;
        Alarm.windEngineInCheckPeriod = false;
        Alarm.windEngineOpenCounter = 0;

    }
    public static reset() {
        Alarm.dryTempCounter = 0;
        Alarm.dryTemp2Counter = 0;
        Alarm.wetTempCounter = 0;
    }

    public static checkDryTemp(info: IInfoCollect, dryT: number, wetT: number): number {
        const tempDryTarget: number = GetDryTargetTemp(info);

        // 不运行就无告警
        if (!isRunning(info)) {
            return 0;
        }
        if (wetT > dryT) {
            return 1;
        }

        if (isOverTemp(dryT)) {
            return 1;
        }
        if (isUnderTemp(dryT)) {
            return 1;
        }

        if (CheckTempDelta(dryT - tempDryTarget, DRY_TEMP_ALARM_LIMIT)) {
            Alarm.dryTempCounter++;
        } else {
            Alarm.dryTempCounter = 0;
        }
        if (Alarm.dryTempCounter > Alarm.dryTempCounterMax) {
            return 1;
        }

        if (CheckTempDelta(dryT - tempDryTarget, DRY_TEMP_ALARM_LIMIT_2)) {
            Alarm.dryTemp2Counter++;
        } else {
            Alarm.dryTemp2Counter = 0;
        }

        if (Alarm.dryTemp2Counter > Alarm.dryTemp2CounterMax) {
            return 1;
        }

        return 0;
    }
    public static checkWetTemp(info: IInfoCollect, wetT: number, dryT: number): number {
        const tempWetTarget: number = GetWetTargetTemp(info);

        if (!isRunning(info)) {
            return 0;
        }
        if (wetT > dryT) {
            return 1;
        }

        if (isOverTemp(wetT)) {
            return 1;
        }
        if (isUnderTemp(wetT)) {
            return 1;
        }

        if (CheckTempDelta(wetT - tempWetTarget, WET_TEMP_ALARM_LIMIT)) {
            Alarm.wetTempCounter++;
        } else {
            Alarm.wetTempCounter = 0;
        }
        if (Alarm.dryTempCounter > Alarm.wetTempCounterMax) {
            return 1;
        }

        return 0;
    }
    public static checkVoltageLow(v: number): number {
        if (v > 220 * 1.1 || v < 220 * 0.9) {
            return 1;
        } else {
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
                Alarm.windEngineOpenCounter = 3;
                Alarm.windEnginePhaseLostCounter = 0;
                Alarm.windEngineOverloadCounter = 0;
            });
        }, time);
    }
    public static checkPhaseA(vA: number, vB: number, vAplusB: number): number {

        if (vA < 0.5 || vB < 0.5) {
            return 1;
        }

        if (vA > 1.5 || vB > 1.5 || vAplusB > 3) {
            return 1;
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
