declare var $: any;

import { Promise } from "promise";
import { setTimeout } from "timers";

import { ControlGPRS } from "./ControlGPRS";
import { ControlMcu } from "./ControlMcu";
import { Tool } from "./utility";

// a tuning parameter
const DEGREE_DELTA = 180;

export interface IfControlPeriphOption {
    max_angle: number;
    min_angle: number;
    speed: number;
}

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

    // public static bWindGateHighSpeed: boolean;
    public static bBurningGateOn: boolean;
    public static VentAngle: number;  // 0~ 90 degree
    public static MAX_VENT_ANGLE: number;
    public static MIN_VENT_ANGLE: number;
    public static VENT_SPEED: number;

    public static bToggleWD: boolean;

    public static vHiLowWindEngine: number;
    public static bWindGateHighSpeed: number;

    public static vGPRSSignal: number;

    // default value when power on
    public static init(option: IfControlPeriphOption) {
        ControlPeriph.bBurningGateOn = false;
        // ControlPeriph.bVentOn = false;
        ControlPeriph.VentAngle = 0; // default angle is 0
        ControlPeriph.MAX_VENT_ANGLE = option.max_angle;
        ControlPeriph.MIN_VENT_ANGLE = option.min_angle;
        ControlPeriph.VENT_SPEED = option.speed;

        Tool.print("Max angle:" + ControlPeriph.MAX_VENT_ANGLE);
        Tool.print("Min angle:" + ControlPeriph.MIN_VENT_ANGLE);
        Tool.print("Vent speed degree/second :" + ControlPeriph.VENT_SPEED);
        Tool.print("Default angle:" + ControlPeriph.VentAngle);

        ControlPeriph.bToggleWD = true;

        ControlPeriph.gpsLatitude = 0.0;
        ControlPeriph.gpsLatitude = 0.0;

        ControlPeriph.StopWindVent(() => {
            Tool.print("Stop the vent");
        });
        ControlPeriph.vHiLowWindEngine = 0;
        ControlPeriph.bWindGateHighSpeed = -1;

        ControlPeriph.ADC1 = 0;
        ControlPeriph.ADC2 = 0;
        ControlPeriph.ADC3 = 0;
        ControlPeriph.ADC4 = 0;
        ControlPeriph.ADC5 = 0;
        ControlPeriph.ADC6 = 0;
        ControlPeriph.ADC7 = 0;

        ControlPeriph.temp1 = 0;
        ControlPeriph.temp2 = 0;
        ControlPeriph.temp3 = 0;
        ControlPeriph.temp4 = 0;

        ControlPeriph.vGPRSSignal = 0;

        // reset VentGateAngle to default value here?
        // ControlPeriph.ResetVent();

    }

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
        // Switch LED bewteen Running and Setting, dont be surprised
        $("#LED-Setting").turnOn(cb);
    }
    public static TurnOffRunningLED(cb) {
        $("#LED-Setting").turnOff(cb);
    }
    public static TurnOnSettingLED(cb) {
        $("#LED-Running").turnOn(cb);
    }
    public static TurnOffSettingLED(cb) {
        $("#LED-Running").turnOff(cb);
    }
    public static Buzzer() {
        ControlPeriph.TurnOnBuzzer(() => {
            Tool.printBlue("Buzzer on");
        });
        setTimeout(() => {
            ControlPeriph.TurnOffBuzzer(() => {
                Tool.printBlue("Buzzer off");
            });
        }, 100);
    }
    public static Buzzer2() {
        Tool.printBlue("Buzzer on");

        ControlPeriph.TurnOnBuzzer(() => {
            setTimeout(() => {
                ControlPeriph.TurnOffBuzzer(() => {
                    Tool.printBlue("Buzzer off");
                });
            }, 500);
        });
    }
    public static TurnOnBuzzer(cb) {
        $("#outBuzzer").turnOn(cb);
    }
    public static TurnOffBuzzer(cb) {
        $("#outBuzzer").turnOff(cb);
    }
    public static TurnOnCtrlWatchDog(cb) {
        $("#outCtrlWatchDog").turnOn(cb);
    }
    public static TurnOffCtrlWatchDog(cb) {
        $("#outCtrlWatchDog").turnOff(cb);
    }
    public static ResetMcu() {
        Tool.printGreen("Reset Mcu");
        // $("#outResetMcu").turnOff();
        // setTimeout(() => {
        //     $("#outResetMcu").turnOn();
        // }, 500);
    }
    public static TurnOnWindEngine(cb) {
        $("#outWindEngine").turnOff(cb);
    }
    public static TurnOffWindEngine(cb) {
        $("#outWindEngine").turnOn(cb);
    }
    public static TurnOnWindVent(cb) {
        $("#outRelayRY4").turnOn();
        $("#outRelayRY2").turnOn(cb);
    }
    public static TurnOffWindVent(cb) {
        $("#outRelayRY4").turnOff();
        $("#outRelayRY2").turnOn(cb);
    }
    public static StopWindVent(cb) {
        $("#outRelayRY4").turnOff();
        $("#outRelayRY2").turnOff(cb);
    }
    public static ToggleWatchDog() {
        if (ControlPeriph.bToggleWD === true) {
            ControlPeriph.bToggleWD = false;
            $("#outCtrlWatchDog").turnOff();

        } else {
            ControlPeriph.bToggleWD = true;
            $("#outCtrlWatchDog").turnOn();
        }
    }
    public static ResetVent() {

        Tool.printYellow("Reset Vent angle to 0 degree");
        const angle = 90;

        const delay = angle / ControlPeriph.VENT_SPEED;
        // in seconds
        ControlPeriph.TurnOffWindVent(() => {
            Tool.printBlue("Turn off Vent , angle:" + angle);
            Tool.printBlue("Turn off Vent for :" + delay + " seconds");
        });
        setTimeout(() => {
            ControlPeriph.StopWindVent(() => {
                Tool.printRed("vent end");
            });
            ControlPeriph.VentAngle -= angle;
            if (ControlPeriph.VentAngle < 0) {
                ControlPeriph.VentAngle = 0;
            }
        }, delay * 1000 + DEGREE_DELTA);
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
        return ControlPeriph.bBurningGateOn;
    }
    public static GetVentAngle(): number {
        return ControlPeriph.VentAngle;
    }
    /*
        Still send open command after the angle is 90 degree

    **/
    public static IncreaseVentAngle(angle: number, cb) {
        Tool.print("ControlPeriph: increase vent angle");

        if (angle > 90) {
            Tool.print("Too big value for vent");
            cb(0);
            return;
        }

        const delay = angle / ControlPeriph.VENT_SPEED;

        // if (ControlPeriph.VentAngle > 89.8) {
        //     ControlPeriph.VentAngle = 90;
        //     Tool.printRed("No need to control angle, already 0 deg, but do it a little");
        //     delay = 2 * DEGREE_DELTA;
        // }

        // in seconds
        ControlPeriph.TurnOnWindVent(() => {
            Tool.printBlue("Turn on Vent , angle:" + angle);
            Tool.printBlue("Turn on Vent for :" + delay + " seconds");
        });
        setTimeout(() => {
            ControlPeriph.StopWindVent(() => {
                Tool.printRed("Vent stop");
            });
            ControlPeriph.VentAngle += angle;
            if (ControlPeriph.VentAngle > 90) {
                ControlPeriph.VentAngle = 90;
            }
            cb(angle);
        }, delay * 1000 - DEGREE_DELTA);
    }
    /**
     *
     */
    public static DecreaseVentAngle(angle: number, cb) {
        Tool.print("ControlPeriph: decrease vent angle");
        const delay = angle / ControlPeriph.VENT_SPEED;

        if (angle > 90) {
            Tool.print("Too big value for vent");
            cb(0);
            return;
        }

        // if (ControlPeriph.VentAngle < 0.02) {
        //     ControlPeriph.VentAngle = 0;
        //     Tool.printRed("No need to control angle, already 0 deg, but do it a little");
        //     delay = 2 * DEGREE_DELTA;
        // }

        // in seconds
        ControlPeriph.TurnOffWindVent(() => {
            Tool.printBlue("Turn off Vent , angle:" + angle);
            Tool.printBlue("Turn off Vent for :" + delay + " seconds");
        });
        setTimeout(() => {
            ControlPeriph.StopWindVent(() => {
                Tool.printRed("vent end");
            });
            ControlPeriph.VentAngle -= angle;
            if (ControlPeriph.VentAngle < 0) {
                ControlPeriph.VentAngle = 0;
            }
            cb(angle);
        }, delay * 1000 - DEGREE_DELTA);
    }

    public static TurnOnBakingFire(cb) {
        Tool.print("ControlPeriph: Turn on baking fire");
        ControlPeriph.bBurningGateOn = true;
        $("#outCtrolFire").turnOn(cb);
    }
    public static TurnOffBakingFire(cb) {
        Tool.print("ControlPeriph: Turn off baking fire");
        ControlPeriph.bBurningGateOn = false;
        $("#outCtrolFire").turnOff(cb);
    }
    public static fetchParamsWithPromise(commMCU: ControlMcu, callback) {
        const proc = new Promise((resolve, reject) => {
            Tool.printGreen("Fetch Params GetTemp ==>");

            commMCU.GetTemp((err, data) => {
                if (err !== null) {

                    // ControlPeriph.temp1 = 0;
                    // ControlPeriph.temp2 = 0;
                    // ControlPeriph.temp3 = 0;
                    // ControlPeriph.temp4 = 0;

                    Tool.printRed("GetTempError error");
                    resolve("OK");
                } else {
                    Tool.printGreen("GetTemp");
                    Tool.print(data.content.toString());
                    Tool.print(data.type.toString());

                    if (data.type.toString() === "TEMP") {
                        const temp1 = parseFloat(data.content.slice(0, 8).toString());
                        const temp2 = parseFloat(data.content.slice(8, 16).toString());
                        const temp3 = parseFloat(data.content.slice(16, 24).toString());
                        const temp4 = parseFloat(data.content.slice(24, 32).toString());

                        ControlPeriph.temp1 = (temp1 > 100) ? ControlPeriph.temp1 : temp1;
                        ControlPeriph.temp2 = (temp2 > 100) ? ControlPeriph.temp2 : temp2;
                        ControlPeriph.temp3 = (temp3 > 100) ? ControlPeriph.temp3 : temp3;
                        ControlPeriph.temp4 = (temp4 > 100) ? ControlPeriph.temp4 : temp4;
                    } else {
                        Tool.printRed("Wrong type rx:" + data.type.toString());
                    }



                    Tool.printYellow(ControlPeriph.temp1);
                    Tool.printYellow(ControlPeriph.temp2);
                    Tool.printYellow(ControlPeriph.temp3);
                    Tool.printYellow(ControlPeriph.temp4);

                    // It's a proper time to check the temp values
                    // Or let bakingTask to handle it

                    resolve("OK");
                }
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            Tool.printGreen("Get ADC ==>");
            return new Promise((resolve, reject) => {
                commMCU.GetADC((err, data) => {
                    if (err !== null) {
                        // ControlPeriph.ADC1 = 0;
                        // ControlPeriph.ADC2 = 0;
                        // ControlPeriph.ADC3 = 0;
                        // ControlPeriph.ADC4 = 0;
                        // ControlPeriph.ADC5 = 0;
                        // ControlPeriph.ADC6 = 0;
                        // ControlPeriph.ADC7 = 0;
                        Tool.printRed("GetADC error");
                        resolve("OK");

                    } else {
                        Tool.printGreen("GetADC");
                        Tool.print(data.content.toString());
                        Tool.print(data.type.toString());

                        if (data.type.toString() === "ADC*") {

                            const ADC1: number = parseFloat(data.content.slice(0, 8).toString());
                            const ADC2: number = parseFloat(data.content.slice(8, 16).toString());
                            const ADC3: number = parseFloat(data.content.slice(16, 24).toString());
                            const ADC4: number = parseFloat(data.content.slice(24, 32).toString());
                            const ADC5: number = parseFloat(data.content.slice(32, 40).toString());
                            const ADC6: number = parseFloat(data.content.slice(40, 48).toString());
                            const ADC7: number = parseFloat(data.content.slice(48, 56).toString());

                            ControlPeriph.ADC1 = (ADC1 >= 0.00 && ADC1 < 3.4) ? ADC1 : ControlPeriph.ADC1; // phaseA
                            ControlPeriph.ADC2 = (ADC2 >= 0.00 && ADC2 < 3.4) ? ADC2 : ControlPeriph.ADC2; // phaseB
                            ControlPeriph.ADC3 = (ADC3 >= 0.00 && ADC3 < 3.4) ? ADC3 : ControlPeriph.ADC3; // A+B
                            ControlPeriph.ADC4 = (ADC4 > 0.00 && ADC4 < 3.4) ? ADC4 : ControlPeriph.ADC4; // 220V voltage
                            ControlPeriph.ADC5 = (ADC5 >= 0.00 && ADC5 < 3.4) ? ADC5 : ControlPeriph.ADC5; // windgate I
                            ControlPeriph.ADC6 = (ADC6 >= 0.00 && ADC6 < 3.4) ? ADC6 : ControlPeriph.ADC6; // MB 5V
                            ControlPeriph.ADC7 = (ADC7 >= 0.00 && ADC7 < 3.4) ? ADC7 : ControlPeriph.ADC7; // Batt 4.5V

                            // ControlPeriph.ADC1 = ADC1;
                            // ControlPeriph.ADC2 = ADC2;
                            // ControlPeriph.ADC3 = ADC3;
                            // ControlPeriph.ADC4 = ADC4;
                            // ControlPeriph.ADC5 = ADC5;
                            // ControlPeriph.ADC6 = ADC6;
                            // ControlPeriph.ADC7 = ADC7;
                        } else {
                            Tool.printRed("Wrong type rx:" + data.type.toString());
                        }
                        Tool.printYellow(ControlPeriph.ADC1);
                        Tool.printYellow(ControlPeriph.ADC2);
                        Tool.printYellow(ControlPeriph.ADC3);
                        Tool.printYellow(ControlPeriph.ADC4);
                        Tool.printYellow(ControlPeriph.ADC5);
                        Tool.printYellow(ControlPeriph.ADC6);
                        Tool.printYellow(ControlPeriph.ADC7);

                        // It's a proper time to check if the voltage is out of limit
                        resolve("OK");
                    }
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        });
        // .then((val) => {
        //     return new Promise((resolve, reject) => {
        //         commMCU.GetTime((err, data) => {
        //             if (err !== null) {
        //                 Tool.printRed("GetTimeError error");
        //                 resolve("OK");
        //                 return;
        //             } else {
        //                 resolve("OK");
        //             }
        //             // Tool.printGreen("GetTime");
        //             // Tool.print(data.content.toString());
        //         });
        //     });
        // });

    }

    public static fetchFastParamsWithPromise(callback) {

        const proc = new Promise((resolve, reject) => {
            Tool.printGreen("Fetch Fast Params ==>");
            resolve("OK");
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    // Tool.printGreen("\nRead bPhaseVoltage 1:" + data);
                    ControlPeriph.vHiLowWindEngine = 0 + data;
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    // Tool.printGreen("\nRead bPhaseVoltage 2:" + data);
                    ControlPeriph.vHiLowWindEngine += data;
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    // Tool.printGreen("\nRead bPhaseVoltage 3:" + data);
                    ControlPeriph.vHiLowWindEngine += data;
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    // Tool.printGreen("\nRead bPhaseVoltage 4:" + data);
                    ControlPeriph.vHiLowWindEngine += data;
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    // Tool.printGreen("\nRead bPhaseVoltage 5:" + data);
                    ControlPeriph.vHiLowWindEngine += data;
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    // Tool.printGreen("\nRead bPhaseVoltage 6:" + data);
                    ControlPeriph.vHiLowWindEngine += data;
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                if (ControlPeriph.vHiLowWindEngine >= 6) {
                    // hi speed
                    ControlPeriph.bWindGateHighSpeed = 1;
                } else if (ControlPeriph.vHiLowWindEngine === 0) {
                    Tool.printRed("Wind gate stopped, should we alram?");
                } else {
                    // low speed
                    ControlPeriph.bWindGateHighSpeed = 0;
                }
                resolve("OK");
            });
        });

    }
}
