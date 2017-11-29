import { BakingType, MoistureProperty } from "./BakingCfg";
import { BakingElement } from "./BakingElement";
import { IBakingControlParams, TempControl } from "./ControlAlgorithm";

export class BakingSegment extends BakingElement {
    // static timerSegment;

    constructor(options) {
        super(options);
        this.type = BakingType.SEGMENT;
    }
    public run(): boolean {
        const result: boolean = super.checkTime();

        if (!result) {
            return result;
        }

        console.log("Run bakingSegment");

        this.counter++;

        this.checkTempSensors();

        this.keepTempConstant();

        return result;
    }
    private keepTempConstant() {
        console.log("Keep temp constant according sensor readings");

        const param: IBakingControlParams = {
            duration: this.duration,
            tempBegin: this.tempBegin,
            tempEnd: this.tempBegin,
            tempLogs: this.tempLogs,
            timeConstant: 0,
            timeElapsed: this.getTimeElapsed(),
            timeLag: 0,
        };

        // TempControl.keepConstant(param);

        if (this.moistureType === MoistureProperty.DRY) {
            this.controlFire(TempControl.keepConstant(param));
        } else if (this.moistureType === MoistureProperty.WET &&
            (this.counter % BakingElement.COUNTER_FOR_VENT_CHECKING) === 0) {
            this.controlVent(TempControl.keepWetConstant(param));
        }
    }
}
