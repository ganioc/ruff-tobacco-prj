
import { Promise } from "promise";
import { ControlMcu } from "./ControlMcu";
import { ControlPeriph } from "./ControlPeripheral";
import { Tool } from "./utility";

export class JustTest {

    private comm: ControlMcu;

    constructor(public commMCU: ControlMcu) {
        this.comm = commMCU;
    }
    public test() {
        Tool.printMagenta("********** Just Test ports **********");

        const proc = new Promise((resolve, reject) => {
            Tool.printGreen("Test upper Rack ==>");

            ControlPeriph.CheckUpperRack((data) => {
                if (data === 1) {
                    Tool.print("Upper Rack");
                } else if (data === 0) {
                    Tool.print("Lower Rack");
                } else {
                    Tool.printRed("Wrong result checkupperRack");
                }
            });
            resolve("OK");
        }).then((val) => {
            Tool.printGreen("Test Temp and ADC ==>");
            return new Promise((resolve, reject) => {
                ControlPeriph.fetchParamsWithPromise(this.comm, () => {
                    resolve("OK");
                });
            });
        }).then((val) => {
            Tool.printGreen("Test Running LED ==>");
            return new Promise((resolve, reject) => {
                ControlPeriph.TurnOnRunningLED(() => {
                    Tool.print("On");
                });
                setTimeout(() => {
                    ControlPeriph.TurnOffRunningLED(() => {
                        Tool.print("Off");
                    });
                    resolve("OK");
                }, 2000);
            });
        }).then((val) => {
            Tool.printGreen("Test Setting LED ==>");
            return new Promise((resolve, reject) => {
                ControlPeriph.TurnOnSettingLED(() => {
                    Tool.print("On");
                });
                setTimeout(() => {
                    ControlPeriph.TurnOffSettingLED(() => {
                        Tool.print("Off");
                    });
                    resolve("OK");
                }, 2000);
            });
        }).then((val) => {
            Tool.printGreen("Test Buzzer ==>");
            return new Promise((resolve, reject) => {
                ControlPeriph.TurnOnBuzzer(() => {
                    Tool.print("On");
                });
                setTimeout(() => {
                    ControlPeriph.TurnOffBuzzer(() => {
                        Tool.print("Off");
                    });
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            Tool.printGreen("Test Ctrl Watchdog ==>");
            return new Promise((resolve, reject) => {
                ControlPeriph.ToggleWatchDog();
                setTimeout(() => {
                    ControlPeriph.ToggleWatchDog();
                    resolve("OK");
                }, 1000);
            });
        }).then((val) => {
            Tool.printGreen("Test open fire gate ==>");
            return new Promise((resolve, reject) => {
                ControlPeriph.TurnOnBakingFire(() => {
                    Tool.print("on");
                });
                setTimeout(() => {
                    ControlPeriph.TurnOffBakingFire(() => {
                        Tool.print("off");
                        resolve("OK");
                    });
                }, 2000);
            });
        }).then((val) => {
            Tool.printGreen("Test open up vent gate ==>");
            return new Promise((resolve, reject) => {
                ControlPeriph.IncreaseVentAngle(40, () => {
                    Tool.print("on 40 degree");
                    resolve("OK");
                });
            });
        }).then((val) => {
            Tool.printGreen("Test open down vent gate ==>");
            return new Promise((resolve, reject) => {

                ControlPeriph.DecreaseVentAngle(40, () => {
                    Tool.print("off 40 degree");
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    Tool.printGreen("\nRead bPhaseVoltage 1:" + data);
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    Tool.printGreen("\nRead bPhaseVoltage 2:" + data);
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    Tool.printGreen("\nRead bPhaseVoltage 3:" + data);
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    Tool.printGreen("\nRead bPhaseVoltage 4:" + data);
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    Tool.printGreen("\nRead bPhaseVoltage 5:" + data);
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });

        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    Tool.printGreen("\nRead bPhaseVoltage 6:" + data);
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });

        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    Tool.printGreen("\nRead bPhaseVoltage 7:" + data);
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tool.printGreen("\nDelay 100ms");
                    resolve("OK");
                }, 100);
            });

        }).then((val) => {
            return new Promise((resolve, reject) => {
                ControlPeriph.CheckPhaseVoltageExist((data) => {
                    Tool.printGreen("\nRead bPhaseVoltage 8:" + data);
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tool.printGreen("\nFinished");
                    resolve("OK");
                }, 1000);
            });

        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    Tool.printGreen("\nRewind\n");
                    resolve("OK");
                }, 1000);
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {

                    this.test();
                }, 1000);
            });
        });

    }
}
