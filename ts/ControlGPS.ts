
// import Events = require("events");
import { ControlPeriph } from "./ControlPeripheral";

export class ControlGPS {
    // public emitter: Events.EventEmitter;
    private Latitude: number;
    private Altitude: number;

    constructor() {
        // this.emitter = new Events.EventEmitter();
        this.Latitude = 0;
        this.Altitude = 0;
    }
    public start() {

        return 0;
    }
}
