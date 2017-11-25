import { BakingType, MoistureProperty } from "./BakingCfg";
import { BakingElement } from "./BakingElement";
import { IBakingControlParams, TempControl } from "./ControlAlgorithm";

export class BakingSlope extends BakingElement {
    // static timerSlope;

    private tempEnd: number;

    constructor(options) {
        super(options);
        this.type = BakingType.SLOPE;
        this.tempEnd = options.tempEnd;
    }

    public run(): boolean {

        const result = super.checkTime();

        if (!result) {
            return result;
        }

        console.log("Run bakingSlope");

        this.checkTempSensors();

        this.controlTempSlope();

        return result;
    }
    public getTargetTemp(): number {

        const val: number = (this.tempBegin
            + (this.tempEnd - this.tempBegin)
            * this.getTimeElapsed() / (this.duration));

        return parseFloat(val.toFixed(3));
    }
    private controlTempSlope() {
        console.log("Keep temp slope according sensor readings");

        const param: IBakingControlParams = {
            duration: this.duration,
            tempBegin: this.tempBegin,
            tempEnd: this.tempEnd,
            tempLogs: this.tempLogs,
            timeConstant: 0,
            timeElapsed: this.getTimeElapsed(),
            timeLag: 0,

        };

        if (this.moistureType === MoistureProperty.DRY) {
            this.controlFire(TempControl.keepSlope(param));
        } else if (this.moistureType === MoistureProperty.WET) { // MoistureProperty.WET
            this.controlVent(TempControl.keepWetSlope(param));
        }

    }
}