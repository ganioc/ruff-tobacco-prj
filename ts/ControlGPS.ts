
declare var $: any;
// import Events = require("events");
import { ControlPeriph } from "./ControlPeripheral";
import { Tool } from "./utility";

export class ControlGPS {
    // public emitter: Events.EventEmitter;
    private latitude_degree: string; // 纬度-度
    private latitude_minute: string; // 纬度-分
    private longitude_degree: string; // 经度-度
    private longitude_minute: string; // 经度-分

    private Longitude: number;
    private Latitude: number;

    constructor() {
        // this.emitter = new Events.EventEmitter();
        this.Latitude = 0; // 121.45806;
        this.Latitude = 0; // 31.22222;
    }
    public start() {
        Tool.printBlue("GPS start");

        $("#uart-gps").on("data", (data) => {
            // console.log("length:" + data.length);
            // Tool.printGreen(data);
            console.log("gps :" + data.toString());

            const data_temp = data.toString();
            const index1 = data_temp.indexOf("$GPRMC");

            if (index1 === 0) {
                const index2 = data_temp.indexOf("*");
                const data_gprmc = data_temp.substring(0, index2);

                // console.log("%s", data_gprmc);

                const arr = data_gprmc.split(",");

                if (arr[2] === "V") {
                    this.latitude_degree = "0";
                    this.latitude_minute = "0";
                    this.longitude_degree = "0";
                    this.longitude_minute = "0";

                    // console.log("%s,%sN %s,%sS",
                    //     this.latitude_degree,
                    //     this.latitude_minute,
                    //     this.longitude_degree,
                    //     this.longitude_minute);
                } else if (arr[2] === "A") {
                    // console.log("%s", arr[3]);

                    const tmp_latitude = arr[3].toString();
                    const tmp_longitude = arr[5].toString();

                    this.latitude_degree = tmp_latitude.substring(0, 2);
                    this.latitude_minute = tmp_latitude.substring(2, 7);
                    this.longitude_degree = tmp_longitude.substring(0, 3);
                    this.longitude_minute = tmp_longitude.substring(3, 8);

                    // console.log("%s,%sN %s,%sS",
                    //     this.latitude_degree,
                    //     this.latitude_minute,
                    //     this.longitude_degree,
                    //     this.longitude_minute);
                }

                // put data into ControlPheral
                let degree: number = parseFloat(this.latitude_degree);
                let minute: number = parseFloat(this.latitude_minute);

                ControlPeriph.gpsLatitude = degree + minute / 60;

                degree = parseFloat(this.longitude_degree);
                minute = parseFloat(this.longitude_minute);

                ControlPeriph.gpsLongitude = degree + minute / 60;

                // ControlPeriph.gpsLatitude = 31.1798;
                // ControlPeriph.gpsLongitude = 121.5995;

                Tool.printRed("gps :" + ControlPeriph.gpsLatitude);
                Tool.printRed("gps :" + ControlPeriph.gpsLongitude);
            }
        });

        console.log("GPS started");
        return 0;
    }
}
