
// import Events = require("events");
import { ControlPeriph } from "./ControlPeripheral";

export class ControlGPS {
    // public emitter: Events.EventEmitter;
    private latitude_degree: number; // 纬度-度
    private latitude_minute: number; // 纬度-分
    private longitude_degree: number; // 经度-度
    private longitude_minute: number; // 经度-分

    private Longitude: number;
    private Latitude: number;

    constructor() {
        // this.emitter = new Events.EventEmitter();
        this.latitude_degree = 121.45806;
        this.latitude_degree = 31.22222;
    }
    public start() {

        return 0;
    }
}
