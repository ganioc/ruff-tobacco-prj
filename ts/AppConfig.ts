import * as fs from "fs";
import * as path from "path";

import {
    IfConfigFile,

    IInfoCollect,

    RunningStatus,
} from "./BakingCfg";
import { Tool } from "./utility";

export class AppConfig {
    public static getAppConfig(): IfConfigFile {
        const C_CONFIG_FILE_NAME = path.dirname(__filename) + "/../../app.data/app.json";

        const data = fs.readFileSync(C_CONFIG_FILE_NAME);

        let objConfig: IfConfigFile;

        try {
            objConfig = JSON.parse(data.toString());

        } catch (e) {
            Tool.printRed(e);
            throw new Error(e);
        }
        return objConfig;

    }
}
