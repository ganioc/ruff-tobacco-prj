import { ControlMcu } from "./ControlMcu";

import { Tool } from "./utility";
import { YAsync } from "./yjasync";

export class ControlPeriph {
    public static temp1: number; // to store the test temp values
    public static temp2: number;
    public static temp3: number;
    public static temp4: number;

    public static gpsLongitude: number;
    public static gpsLatitude: number;

    public static CheckUpperRack(): boolean {
        return false;
    }
    public static CheckWindGateHighSpeed(): boolean {
        return false;
    }
    public static CheckBurningGate(): boolean {
        return false;
    }
    public static CheckVentOn(): boolean {
        return false;
    }
    public static TurnOnVent() {
        Tool.print("ControlPeriph: Turn on vent");
    }
    public static TurnOffVent() {
        Tool.print("ControlPeriph: Turn off vent");
    }
    public static TurnOnBakingFire() {
        Tool.print("ControlPeriph: Turn on baking fire");
    }
    public static TurnOffBakingFire() {
        Tool.print("ControlPeriph: Turn off baking fire");
    }
    public static fetchParams(commMCU: ControlMcu) {
        YAsync.series(
            [
                (cb) => {
                    commMCU.GetTemp((err, data) => {
                        if (err !== null) {
                            cb(err);
                            return;
                        }
                        // Tool.print("Temp is:" + parseFloat(data.content.toString()));
                        Tool.print(data.content.toString());
                        // Tool.print("");
                        // ControlPeriph.temp1 = parseFloat(data.content.toString());
                        // ControlPeriph.temp2 = 22.0;
                        // ControlPeriph.temp3 = 23.0;
                        // ControlPeriph.temp4 = 25.0;

                        // It's a proper time to check the temp values
                        // Or let bakingTask to handle it

                        cb(null, data);
                    });
                },
                (cb) => {
                    commMCU.GetADC((err, data) => {
                        if (err !== null) {
                            cb(err);
                            return;
                        }

                        Tool.print(data.content.toString());
                        // Tool.print("Volt1 is:" + parseFloat(data.content.toString()));
                        // Tool.print("");

                        // It's a proper time to check if the voltage is out of limit

                        cb(null, data);
                    });
                },
                (cb) => {
                    commMCU.GetTime((err, data) => {
                        if (err !== null) {
                            cb(err);
                            return;
                        }
                        Tool.print(data.content.toString());

                        // Tool.print("Time:" + parseFloat(data.content.toString()));
                        // Tool.print("");
                        cb(null, data);
                    });
                },
            ],
            (err, data) => {
                if (err !== null) {
                    Tool.print(err.message);
                } else {
                    // Tool.print("Fetch params finished");
                }
            },
        );
    }
}
