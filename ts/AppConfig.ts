import * as fs from "fs";
import * as path from "path";

import {
    IfConfigFile,

    IInfoCollect,

    RunningStatus,
} from "./BakingCfg";

import { LocalStorage } from "./LocalStorage";
import { Tool } from "./utility";

export class AppConfig {
    public static getAppConfig(): IfConfigFile {

        const C_CONFIG_FILE_NAME = path.dirname(__filename) + "/../../app.data/app_config.json";

        const data = fs.readFileSync(C_CONFIG_FILE_NAME);

        let objConfig: IfConfigFile;

        console.log("run getAppConfig()");

        try {
            objConfig = JSON.parse(data.toString());
        } catch (e) {
            Tool.printRed(e);
            // return {
            //     devices: {},
            //     baking_config: {
            //         default_curve: {
            //             dryList: [[30, 30]],
            //             wetList: [[30, 30]],
            //             durList: [1],
            //         },
            //         tobacco_type: [{ name: "Tobacco 1", id: 1 }],
            //         quality_level: [{ name: "good", id: 1 }],
            //         alarm_threshold: {
            //             max_temp: 0,
            //             min_temp: 0,
            //             alarm_checking_period: 0,
            //             dry_temp_alarm_period: 0,
            //             dry_temp_alarm_limit: 0,
            //             dry_temp_alarm_period_2: 0,
            //             dry_temp_alarm_limit_2: 0,
            //             wet_temp_alarm_period: 0,
            //             wet_temp_alarm_limit: 0,
            //         },
            //         base_setting: LocalStorage.initBaseSetting(),
            //     },
            // };
        }
        return objConfig;
    }

    public static setAppConfig(config: IfConfigFile): void {
        const C_CONFIG_FILE_NAME = path.dirname(__filename) + "/../../app.data/app_config.json";
        fs.writeFileSync(C_CONFIG_FILE_NAME, JSON.stringify(config));
        console.log("run setAppConfig()");
    }
}
