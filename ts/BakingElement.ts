import { ITempLog, MoistureProperty } from "./BakingCfg";
import { RunningHandle } from "./BakingProc";
import { ControlPeriph } from "./ControlPeripheral";
import { Tool } from "./utility";

// Baking Element Definition
export class BakingElement {
    public static timer: NodeJS.Timer; // The only timer for Class member
    public static timerVent: NodeJS.Timer;
    public static COUNTER_FOR_VENT_CHECKING: number;

    public moistureType: MoistureProperty;
    public type: number;
    public duration: number; // in seconds
    public tempBegin: number;
    public timeBegin: number;
    public timeDeltaCheckStatus: number;
    public tempLogs: ITempLog[];
    public counter: number;

    private timeElapsed: number;

    constructor(options) {

        this.tempBegin = options.tempBegin;
        this.timeBegin = 0;
        this.counter = 0;
        BakingElement.COUNTER_FOR_VENT_CHECKING = 6;

        if (!options.duration) {
            throw new Error("BakingElement duration not defined");
        }
        this.duration = options.duration * 60 * 60; // in seconds, Modified to hours by Yang Jun , 2017-12-12
        this.tempLogs = [];
        this.timeDeltaCheckStatus = options.timeDelta;
        this.moistureType = options.moistureType;
        this.timeElapsed = 0;
    }
    public printTestResult() {

        for (let i = 0; i < this.tempLogs.length; i++) {
            const point = this.tempLogs[i];
            console.log("TestPoint :" + i + " @ " + point.timeStamp);
            console.log("Temp1:" + point.temp1);
            console.log("Temp2:" + point.temp2);
            console.log("Temp3:" + point.temp3);
            console.log("Temp4:" + point.temp4);
            console.log("");
        }
    }
    public printInfo() {
        Tool.print("--------------");
        Tool.print(this.moistureType);
        Tool.print(this.type);
        Tool.print(this.duration); // in seconds
        Tool.print(this.tempBegin);
        Tool.print(this.timeBegin);
        Tool.print(this.timeElapsed);
    }
    public controlVent(newDelta: number) {
        // how to control the vent?
        // angle of vent
        // let deltaAngle: number = 0;
        // deltaAngle = newAngle - ControlPeriph.VentAngle;

        // 角度只能在 0~90度之间
        Tool.printRed("Current angle is " + ControlPeriph.VentAngle);
        Tool.printRed("Vent angle delta " + " is " + newDelta);

        if (newDelta > 0) {
            ControlPeriph.IncreaseVentAngle(newDelta, () => {
                Tool.print("Algorithm -> increase: " + newDelta);
            });
        } else if (newDelta < 0) {
            ControlPeriph.DecreaseVentAngle(-newDelta, () => {
                Tool.print("Algorithm -> decrease: " + -newDelta);
            });
        } else {
            Tool.printRed("No need to adjust vent angle");
        }
    }
    public getTimeElapsed() {
        return this.timeElapsed;
    }
    public setTimeElapsed(t: number) {
        this.timeElapsed = t;
    }
    // Overtime return false
    // other wise return true
    protected checkTime(): boolean {
        if (this.timeBegin === 0) {
            this.timeBegin = new Date().getTime() - this.timeElapsed * 1000;
        }

        const curTime = new Date().getTime();
        this.timeElapsed = (curTime - this.timeBegin) / 1000;

        Tool.printBlue("this.timeElapsed:   " + this.timeElapsed.toFixed(2) + " seconds");
        Tool.printBlue("this.duration:      " + this.duration.toFixed(2) + " seconds");

        if ((this.timeElapsed - this.duration) > -1) {// in seconds
            Tool.printRed("Stage Time over --\n");
            return false;
        } else {
            Tool.printMagenta("Remaining time:    " + (this.duration - this.timeElapsed).toFixed(2) + " seconds");
        }
        return true;
    }
    protected checkTempSensors() {
        console.log("Read temp sensor 1");

        // How to check upperrack or lowerrack?
        if (RunningHandle.bTempForUpperRack === true) {
            Tool.printYellow("upperrack");
            this.tempLogs.push({
                temp1: ControlPeriph.temp4,
                temp2: ControlPeriph.temp2,
                temp3: ControlPeriph.temp1,
                temp4: ControlPeriph.temp3,
                timeElapsed: this.timeElapsed,
                timeStamp: new Date().getTime(),
            });
        } else {
            Tool.printYellow("lowerrack");
            this.tempLogs.push({
                temp1: ControlPeriph.temp1,
                temp2: ControlPeriph.temp3,
                temp3: ControlPeriph.temp4,
                temp4: ControlPeriph.temp2,
                timeElapsed: this.timeElapsed,
                timeStamp: new Date().getTime(),
            });
        }
    }

    protected controlFire(onPeriod: number) {
        if (onPeriod < 0.01) {
            ControlPeriph.TurnOffBakingFire(() => {
                console.log("off");
            });
        } else if (onPeriod >= 0.99) {
            ControlPeriph.TurnOnBakingFire(() => {
                console.log("on");
            });
        } else {
            ControlPeriph.TurnOnBakingFire(() => {
                console.log("on");
            });

            clearTimeout(BakingElement.timer);

            BakingElement.timer = setTimeout(() => {
                ControlPeriph.TurnOffBakingFire(() => {
                    console.log("off");
                });
            }, this.timeDeltaCheckStatus * onPeriod + 100);
        }
    }

}
