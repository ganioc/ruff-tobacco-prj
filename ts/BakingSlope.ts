import { BakingType, MoistureProperty } from "./BakingCfg";
import { BakingElement } from "./BakingElement";
import { IBakingControlParams, TempControl } from "./ControlAlgorithm";
import { Tool } from "./utility";

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

        this.counter++;

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
            Tool.print("Dry curve");
            this.controlFire(TempControl.keepSlope(param));
        } else if (this.moistureType === MoistureProperty.WET &&
            (this.counter % BakingElement.COUNTER_FOR_VENT_CHECKING) === 0) { // MoistureProperty.WET
            Tool.printGreen("Wet curve " + this.counter % BakingElement.COUNTER_FOR_VENT_CHECKING);
            this.controlVent(TempControl.keepWetSlope(param));
        } else if (this.moistureType === MoistureProperty.WET) {
            Tool.printGreen("Wet curve " + this.counter % BakingElement.COUNTER_FOR_VENT_CHECKING);
            Tool.printRed("Wet curve no need to update");
        }

    }
}
