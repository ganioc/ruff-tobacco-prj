
import * as path from "path";

export class Tool {
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
