
import { Promise } from "promise";
import { ControlPeriph } from "./ControlPeripheral";
import { Tool } from "./utility";

export class JustTest {
    public static test() {
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
            Tool.printGreen("Test port ==>");
            return "OK";
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

                    JustTest.test();
                    resolve("OK");
                }, 1000);
            });
        });

    }
}
