
import { ITempLog } from "./BakingCfg";
import { RunningHandle } from "./BakingProc";
import { Tool } from "./utility";

export interface IBakingControlParams {
    duration: number;
    timeElapsed: number;
    tempBegin: number;
    tempEnd: number;
    timeConstant: number;
    timeLag: number;
    tempLogs: ITempLog[]; // temp log history, use it to compute
}

const NUM_SAMPLE = 3;

function getParams(params: IBakingControlParams, num: number): number[] {
    const tempList: number[] = [];

    for (let i = 0; i < num; i++) {
        const index = (params.tempLogs.length - 1 - i);

        tempList[i] = (index >= 0) ? (params.tempLogs[index].temp1) : (params.tempLogs[0].temp1);
    }
    Tool.print("tempList of number:" + NUM_SAMPLE);
    Tool.print(tempList);

    return tempList;
}

/** PID control algorithm
 *  P
 *  I integration of history data, Not used
 *  D diff, change rate
 */

/**
 * TempControl for fire control
 */
export class TempControl {
    // return 0~1
    public static keepConstant(params: IBakingControlParams): number {
        let tempList: number[] = [];

        tempList = getParams(params, NUM_SAMPLE);

        const deltaTemp = tempList[0] - params.tempBegin; // difference between target temp

        Tool.printMagenta("target temp is:" + params.tempBegin);

        Tool.printGreen("TempControl:keepConstant delta of current temp:" + deltaTemp.toFixed(3));

        // if (deltaTemp < -5) {
        //     return 1.0;
        // } else if (deltaTemp > 0.5 || (deltaTemp > -0.5 && deltaTemp < 0.5)) {
        //     return 0.0;
        // } else if (deltaTemp > -5 && deltaTemp <= -0.5) {
        //     return -deltaTemp / 4.5;
        // }

        // modified on 2017-12-13
        if (deltaTemp > 0) {
            return 0;

        } else if (deltaTemp < -0.5) {
            return 1;
        } else {
            return 0;
        }
    }
    public static keepSlope(params: IBakingControlParams): number {
        let tempList: number[] = [];
        let targetTemp: number;

        tempList = getParams(params, NUM_SAMPLE);

        targetTemp = params.tempBegin
            + (params.tempEnd - params.tempBegin)
            * params.timeElapsed / (params.duration);
        // in seconds

        const deltaTemp = tempList[0] - targetTemp; // difference between target temp

        Tool.printMagenta("target temp is:" + targetTemp);
        Tool.printMagenta("tempBegin is:" + params.tempBegin);
        Tool.printMagenta("tempEnd is:" + params.tempEnd);
        Tool.printMagenta("timeElapsed is:" + params.timeElapsed);
        Tool.printMagenta("duration is:" + params.duration);

        Tool.printMagenta("TempControl:keepSlope delta of cur temp:" + deltaTemp.toFixed(3));

        // if (deltaTemp < -5) {
        //     return 1.0;
        // } else if (deltaTemp > 0.5 || (deltaTemp > -0.5 && deltaTemp < 0.5)) {
        //     return 0.0;
        // } else if (deltaTemp > -5 && deltaTemp <= -0.5) {
        //     return -deltaTemp / 4.5;
        // }

        // modified on 2017-12-13
        if (deltaTemp > 0) {
            return 0;

        } else if (deltaTemp < -0.5) {
            return 1;
        } else {
            return 0;
        }
    }
    // return vent angle, 0 ~ 90 degree
    public static keepWetConstant(params: IBakingControlParams): number {

        let tempList: number[] = [];
        let targetTemp: number;

        tempList = getParams(params, NUM_SAMPLE);

        targetTemp = params.tempBegin;

        const deltaTemp = tempList[0] - targetTemp; // difference between target temp

        Tool.printMagenta("target temp is:" + targetTemp);

        Tool.printMagenta("TempControl:keepWetConstant delta of cur temp:" + deltaTemp.toFixed(3));

        if (deltaTemp < -5) {
            return 90;
        } else if (deltaTemp > 0.5 || (deltaTemp > -0.5 && deltaTemp < 0.5)) {
            return 0.0;
        } else if (deltaTemp > -5 && deltaTemp <= -0.5) {
            return 90 * deltaTemp / 4.5;
        }
    }
    // return vent angle, 0 ~ 90 degree
    public static keepWetSlope(params: IBakingControlParams): number {
        let tempList: number[] = [];
        let targetTemp: number;

        tempList = getParams(params, NUM_SAMPLE);

        targetTemp = params.tempBegin
            + (params.tempEnd - params.tempBegin)
            * params.timeElapsed / (params.duration);
        // in seconds

        const deltaTemp = tempList[0] - targetTemp; // difference between target temp

        Tool.printMagenta("target temp is:" + targetTemp);
        Tool.printMagenta("tempBegin is:" + params.tempBegin);
        Tool.printMagenta("tempEnd is:" + params.tempEnd);
        Tool.printMagenta("timeElapsed is:" + params.timeElapsed);
        Tool.printMagenta("duration is:" + params.duration);

        Tool.printMagenta("TempControl:keepWetSlope delta of cur temp:" + deltaTemp.toFixed(3));

        if (deltaTemp < -5) {
            return 90;
        } else if (deltaTemp > 0.5 || (deltaTemp > -0.5 && deltaTemp < 0.5)) {
            return 0;
        } else if (deltaTemp > -5 && deltaTemp <= -0.5) {
            return 90 * deltaTemp / 4.5;
        }
    }
}
