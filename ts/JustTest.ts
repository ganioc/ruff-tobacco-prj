
import * as  https from "https";

import { Promise } from "promise";
import { inspect } from "util";
import { ControlMcu } from "./ControlMcu";
import { ControlPeriph } from "./ControlPeripheral";

import { DecodePB, IfBatchDetail, IfBatchRating, IfRecoProfileRequest } from "./DecodePB";
import { HttpsApp, IfHttpsApp } from "./HttpsApp";

const protoFile = __dirname + "/../data/awesome.proto";
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

    public testHttps() {
        Tool.printYellow("--------------------------------------");
        const option: IfHttpsApp = {
            hostname: "api.shdingyun.com",
            port: 443,
        };
        const client = new HttpsApp(option);
        let TOKEN: string = "";

        TOKEN = "eyJhbGciOiJIUzUxMiJ9.eyJhdXRob3JpdGllcyI6IkFVVEhfREVWSUNFIiwic3ViIjoiMzc0ODAzNTQ2MDMwMzcxNDc3MiIsImV4cCI6MTUxMjU3MDgwNX0.YdxrBDbd3oaS0gCquWHzgDomIitRJhlV61dye0NywZQkHzkL_UcQcCMEdswvTFTgqqm-r4unx0-05gHC1xjYhw";

        const decodeRecoProfile = new DecodePB({
            path: protoFile,
            className: "awesomepackage.RecoProfileRequest",
        });

        const decodeProfile = new DecodePB({
            path: protoFile,
            className: "awesomepackage.Profile",
        });

        const decodeBatchDetail = new DecodePB({
            path: protoFile,
            className: "awesomepackage.BatchDetail",
        });
        const decodeBatchSummary = new DecodePB({
            path: protoFile,
            className: "awesomepackage.BatchSummary",
        });

        const mUpdateBatchDetail = {
            batchId: 2419,
            deviceId: "2LOPekIWQQ",
            startTime: 1512026685764,
            endTime: 1512026685764,
            ratings: [{ rating: "CCC", weight: 122 }, { rating: "AAA", weight: 3444 }],
            afterTopWeight: 1,
            afterMiddleWeight: 1,
            afterBottomWeight: 1,
            variety: "as",
            barnAirflowDirection: "dsf",
            barnWallTexture: "sdf",
            loadWeatherTemperature: 23,
            loadTopWeight: 2,
            loadWeatherHumidity: 23,
            loadMiddleWeight: 23,
            loadBottomWeight: 65,
            loadTool: "sd",
            loadToolCount: "sdf",
            loadToolWeight: "sdf",
            loadQuality: "sdf",
            loadMaturityLv_0Percentage: 2,
            loadMaturityLv_1Percentage: 3,
            loadMaturityLv_2Percentage: 4,
            loadMaturityLv_3Percentage: 5,
            loadMaturityLv_4Percentage: 6,
        };

        // client.updateBatch(
        // decodeBatchDetail.encode(mUpdateBatchDetail),
        // TOKEN,
        // (err, buf) => {
        //     // comments
        //     if (err) {
        //         console.log(err);
        //         return;
        //     }
        //     Tool.printYellow("---- got put ----");
        //     console.log(buf.length);

        //     const objProfile = decodeBatchSummary.decode(new Uint8Array(buf));
        //     Tool.printYellow("--------final recovered object");
        //     console.log(objProfile);

        //     Tool.printYellow("---- end of getRecoProfile ----");
        // });

        const mRecoProfile = {
            batchId: 2419,
            deviceId: "2LOPekIWQQ",
            variety: "99",
            barnAirflowDirection: "asdf",
            barnWallTexture: "adsfs",
            loadWeatherTemperature: 12,
            loadTopWeight: 13,
            loadWeatherHumidity: 14,
            loadMiddleWeight: 15,
            loadBottomWeight: 16,
            loadTool: "aaa",
            loadingToolCount: 18,
            loadToolWeight: "asdf",
            loadQuality: "asfd",
            loadMaturityLv_0Percentage: 2,
            loadMaturityLv_1Percentage: 3,
            loadMaturityLv_2Percentage: 4,
            loadMaturityLv_3Percentage: 5,
            loadMaturityLv_4Percentage: 6,
        };

        client.getRecoProfile(
            decodeRecoProfile.encode(mRecoProfile),
            TOKEN,
            (err, buf) => {
                // comments
                if (err) {
                    console.log(err);
                    return;
                }
                Tool.printYellow("---- got put ----");
                console.log(buf.length);

                const objProfile = decodeProfile.decode(new Uint8Array(buf));
                Tool.printYellow("--------final recovered object");
                console.log(objProfile);

                Tool.printYellow("---- end of getRecoProfile ----");
            });
    }
}
