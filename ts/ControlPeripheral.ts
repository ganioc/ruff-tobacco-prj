declare var $: any;

import { Promise } from "promise";
import { setTimeout } from "timers";
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

    public static bWindGateHighSpeed: boolean;
    public static bBurningGateOn: boolean;
    public static bVentOn: boolean;

    public static CheckUpperRack(callback) {
        $("#CodeSwitch-2").read((err, data) => {
            if (err) {
                Tool.printRed("Read CodeSwitch-2 err");
                Tool.printRed(err);
                return;
            }
            callback(data);
        });
    }
    public static CheckPhaseVoltageExist(callback) {
        $("#bPhaseVoltage").read((err, data) => {
            if (err) {
                Tool.printRed("Read PhaseVoltageExist err");
                Tool.printRed(err);
                return;
            }
            callback(data);
        });
    }
    public static TurnOnRunningLED(cb) {
        $("#LED-Running").turnOn(cb);
    }
    public static TurnOffRunningLED(cb) {
        $("#LED-Running").turnOff(cb);
    }
    public static TurnOnSettingLED(cb) {
        $("#LED-Setting").turnOn(cb);
    }
    public static TurnOffSettingLED(cb) {
        $("#LED-Setting").turnOff(cb);
    }
    public static TurnOnBuzzer(cb) {
        $("#outBuzzer").turnOn(cb);
    }
    public static TurnOffBuzzer(cb) {
        $("#outCtrlWatchDog").turnOff(cb);
    }
    public static TurnOnCtrlWatchDog(cb) {
        $("#outCtrlWatchDog").turnOn(cb);
    }
    public static TurnOffCtrlWatchDog(cb) {
        $("#outBuzzer").turnOff(cb);
    }
    public static ResetMcu() {
        Tool.printGreen("Reset Mcu");
        $("#outResetMcu").turnOff();
        setTimeout(() => {
            $("#outResetMcu").turnOn();
        }, 500);
    }
    public static TurnOnWindEngine(cb) {
        $("#outWindEngine").turnOn(cb);
    }
    public static TurnOffWindEngine(cb) {
        $("#outWindEngine").turnOff(cb);
    }
    public static TurnOnWindVent(cb) {
        $("#outRelayRY4").turnOn();
        $("#outRelayRY2").turnOn(cb);
    }
    public static TurnOffWindVent(cb) {
        $("#outRelayRY4").turnOff();
        $("#outRelayRY2").turnOff(cb);
    }
    // public static TurnOnRelayRY4(cb) {
    //     $("#outRelayRY4").turnOn(cb);
    // }
    // public static TurnOffRelayRY4(cb) {
    //     $("#outRelayRY4").turnOff(cb);
    // }
    // public static TurnOnRelayRY2(cb) {
    //     $("#outRelayRY2").turnOn(cb);
    // }
    // public static TurnOffRelayRY2(cb) {
    //     $("#outRelayRY2").turnOff(cb);
    // }
    public static TurnOnFire(cb) {
        $("#outCtrolFire").turnOn(cb);
    }
    public static TurnOffFire(cb) {
        $("#outCtrolFire").turnOff(cb);
    }
    public static TurnOnGPS(cb) {
        $("#outGPSPower").turnOn(cb);
    }
    public static TurnOffGPS(cb) {
        $("#outGPSPower").turnOff(cb);
    }
    public static TurnOnMiniPCIe(cb) {
        $("#outMiniPCIePower").turnOn(cb);
    }
    public static TurnOffMiniPCIe(cb) {
        $("#outMiniPCIePower").turnOff(cb);
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
