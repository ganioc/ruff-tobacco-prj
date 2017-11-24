import { Promise } from "promise";
import { ControlMcu } from "./ControlMcu";

import { Tool } from "./utility";
import { YAsync } from "./yjasync";

export class ControlPeriph {
    public static temp1: number; // to store the test temp values
    public static temp2: number;
    public static temp3: number;
    public static temp4: number;

    public static ADC1: number;
    public static ADC2: number;
    public static ADC3: number;
    public static ADC4: number;
    public static ADC5: number;
    public static ADC6: number;
    public static ADC7: number;

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

                        // Tool.printGreen("GetTemp");
                        // Tool.print(data.content.toString());

                        ControlPeriph.temp1 = parseFloat(data.content.slice(0, 8).toString());
                        ControlPeriph.temp2 = parseFloat(data.content.slice(8, 16).toString());
                        ControlPeriph.temp3 = parseFloat(data.content.slice(16, 24).toString());
                        ControlPeriph.temp4 = parseFloat(data.content.slice(24, 32).toString());

                        // Tool.printYellow(ControlPeriph.temp1);
                        // Tool.printYellow(ControlPeriph.temp2);
                        // Tool.printYellow(ControlPeriph.temp3);
                        // Tool.printYellow(ControlPeriph.temp4);

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
                        // Tool.printGreen("GetADC");
                        // Tool.print(data.content.toString());

                        ControlPeriph.ADC1 = parseFloat(data.content.slice(0, 8).toString());
                        ControlPeriph.ADC2 = parseFloat(data.content.slice(8, 16).toString());
                        ControlPeriph.ADC3 = parseFloat(data.content.slice(16, 24).toString());
                        ControlPeriph.ADC4 = parseFloat(data.content.slice(24, 32).toString());
                        ControlPeriph.ADC5 = parseFloat(data.content.slice(32, 40).toString());
                        ControlPeriph.ADC6 = parseFloat(data.content.slice(40, 48).toString());
                        ControlPeriph.ADC7 = parseFloat(data.content.slice(48, 56).toString());

                        // Tool.printYellow(ControlPeriph.ADC1);
                        // Tool.printYellow(ControlPeriph.ADC2);
                        // Tool.printYellow(ControlPeriph.ADC3);
                        // Tool.printYellow(ControlPeriph.ADC4);
                        // Tool.printYellow(ControlPeriph.ADC5);
                        // Tool.printYellow(ControlPeriph.ADC6);
                        // Tool.printYellow(ControlPeriph.ADC7);

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

                        // Tool.printGreen("GetTime");
                        // Tool.print(data.content.toString());

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
