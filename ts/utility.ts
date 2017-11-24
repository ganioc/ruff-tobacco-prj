import Spawn = require("child_process");
import * as path from "path";
import { Promise } from "promise";

export class Tool {

    public static MachineSN: string;

    public static readMachineSN() {

        const proc = new Promise((resolve) => {
            const ls = Spawn.spawn("cat", ["/sys/fsl_otp/HW_OCOTP_CFG0"]);

            ls.stdout.on("data", (data) => {
                console.log(data);
                this.MachineSN = parseInt(data.toString().slice(2, 10), 16).toString();
                Tool.printYellow("MachineSN:" + this.MachineSN);
            });
            ls.on("exit", (code) => {
                Tool.print("MachineID exit:" + code);
                resolve("next SN");
            });
        });

        proc.then((msg) => {
            const ls = Spawn.spawn("cat", ["/sys/fsl_otp/HW_OCOTP_CFG1"]);

            ls.stdout.on("data", (data) => {
                console.log(data);
                this.MachineSN = this.MachineSN + parseInt(data.toString().slice(2, 10), 16).toString();
                Tool.printYellow("MachineSN:" + this.MachineSN);

            });
            ls.on("exit", (code) => {
                Tool.print("MachineID exit:" + code);
            });
        });

    }

    public static printCust(option: string, str: any) {
        console.log(option, str);
    }
    public static print(str: any) {
        const filename = path.basename(__filename);
        console.log(str);
    }
    public static printRed(str: any) {
        Tool.printCust("\x1b[31m%s\x1b[0m", str);
    }
    public static printBlue(str: any) {
        Tool.printCust("\x1b[34m%s\x1b[0m", str);
    }
    public static printYellow(str: any) {
        Tool.printCust("\x1b[33m%s\x1b[0m", str);
    }
    public static printGreen(str: any) {
        Tool.printCust("\x1b[32m%s\x1b[0m", str);
    }
    public static printMagenta(str: any) {
        Tool.printCust("\x1b[35m%s\x1b[0m", str);
    }
    public static printBlink(str: any) {
        Tool.printCust("\x1b[5m%s\x1b[0m", str);
    }
    // File manipulation

}

export interface ILooseObject {
    [key: string]: any;
}
