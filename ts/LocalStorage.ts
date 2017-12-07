import * as fs from "fs";
import * as path from "path";
import { AppConfig } from "./AppConfig";
import { Tool } from "./utility";

const APP_VERSION = "1.1.2";
// require("../package.json").version;

const UI_VERSION = "1.0";

import {
    IBakingInfo,
    IBaseSetting,
    IDefaultCurve,
    IfAlarmThreshold,
    IfConfigFile,
    IfQualityLevel,
    IfTobaccoType,
    IInfoCollect,
    IResultInfo,
    IRunningCurveInfo,
    ISysInfo,
    RunningStatus,
} from "./BakingCfg";
// export interface IfDefaultCurve {
//     dryList: number[][];
//     wetList: number[][];
//     durList: number[];
// }

const C_ROOT_DIR = "/home/root/baking";
const C_DATA_DIR = "/data";
const C_FILE_STATUS_NAME = "bakingStatus.json"; // current job status:pause, ID, stage, step, 烟叶的情况
const C_FILE_DEFAULT_CURVE_NAME = "defaultBakingCurve.json";  // default baking Curves
const C_FILE_LOG = "_baking.log"; // job started, job durationg, job time,
// tabacco level , history data, at each directory
const C_MACHINE_ID = "RUFF-0001";

Tool.printGreen(path.dirname(__filename));

const objConfig: IfConfigFile = AppConfig.getAppConfig();

const DEFAULT_CURVE: IDefaultCurve = {
    dryList: objConfig.baking_config.default_curve.dryList,
    wetList: objConfig.baking_config.default_curve.wetList,
    durList: objConfig.baking_config.default_curve.durList,
};

export class LocalStorage {

    public static getDataDirec(): string {
        Tool.printBlue(C_ROOT_DIR + C_DATA_DIR + "/");
        return (C_ROOT_DIR + C_DATA_DIR + "/");
    }
    public static getStatusFileName(): string {
        Tool.printBlue(C_FILE_STATUS_NAME);
        return C_FILE_STATUS_NAME;
    }
    public static getStatusFileDirec(): string {
        Tool.printBlue(C_ROOT_DIR + "/" + C_FILE_STATUS_NAME);
        return C_ROOT_DIR + "/" + C_FILE_STATUS_NAME;
    }
    public static getRootDir(): string {
        return C_ROOT_DIR;
    }
    public static getDefaultCurveDirec(): string {
        Tool.printBlue(C_ROOT_DIR + "/" + C_FILE_DEFAULT_CURVE_NAME);
        return C_ROOT_DIR + "/" + C_FILE_DEFAULT_CURVE_NAME;
    }
    /*
    public static saveSysInfo() {

    }
    public static loadSysInfo() {

    }
    public static saveBaseSetting() {

    }
    public static loadBaseSetting(): ISysInfo {

    }
    public static getBakingStatus(): IInfoCollect {

    }
    */
    public static initSysInfo(): ISysInfo {
        return {
            Date: new Date().getTime(),
            bInRunning: RunningStatus.WAITING,
            bTempForUpperRack: true,
            HistoryCounter: 1,
            AppVersion: APP_VERSION,
            UIVersion: UI_VERSION,
        };
    }
    public static initBaseSetting(): IBaseSetting {
        return {
            AirFlowPattern: "fall",
            ControllerName: "No Name",
            GPSInfo: { Longitude: 0, Latitude: 0 },
            InnerHeight: 3,
            WallMaterial: 0,
            LocName: "Some Place",
        };
    }
    public static initBakingInfo(): IBakingInfo {
        return {
            TobaccoType: 0,
            HistoryCounter: 1, // default is 1
            LoadingMethod: 1,
            LowerWeight: 0,
            MaturePercent1: 0,
            MaturePercent2: 0,
            MaturePercent3: 0,
            MaturePercent4: 0,
            MaturePercent5: 0,
            MiddleWeight: 0,
            PieceQuantity: 1,
            PieceWeight: 0,
            Quality: 3,
            UpperWeight: 0,
            bTempForUpperRack: false, // 是上棚吗?
        };
    }
    public static initRunningCurveInfo(): IRunningCurveInfo {
        return {
            CurrentStage: 0,          // 当前阶段
            CurrentStageRunningTime: 0, // 当前阶段已运行时间
            TempCurveDryList: DEFAULT_CURVE.dryList,
            TempCurveWetList: DEFAULT_CURVE.wetList,
            TempDurationList: DEFAULT_CURVE.durList,
        };
    }
    public static initResultInfo(): IResultInfo {
        return {
            content: [
                {
                    level: "a",
                    weight: 0,
                },
                {
                    level: "b",
                    weight: 0,
                },
                {
                    level: "c",
                    weight: 0,
                },
                {
                    level: "d",
                    weight: 0,
                },
                {
                    level: "e",
                    weight: 0,
                },
                {
                    level: "f",
                    weight: 0,
                },
            ],
        };
    }
    public static initBakingStatus(): IInfoCollect {
        const info: IInfoCollect = {
            SysInfo: LocalStorage.initSysInfo(),
            BaseSetting: LocalStorage.initBaseSetting(),
            BakingInfo: LocalStorage.initBakingInfo(),
            RunningCurveInfo: LocalStorage.initRunningCurveInfo(),
            ResultInfo: LocalStorage.initResultInfo(),
        };
        return info;
    }
    public static loadDefaultCurve() {
        return LocalStorage.initDefaultCurve();
    }
    public static initDefaultCurve() {
        return {
            TempCurveDryList: DEFAULT_CURVE.dryList,
            TempCurveWetList: DEFAULT_CURVE.wetList,
            TempDurationList: DEFAULT_CURVE.durList,
        };
    }
    public static strInitBakingStatus(): string {
        return JSON.stringify(LocalStorage.initBakingStatus());
    }
    public static strInitDefaultCurve(): string {
        return JSON.stringify(LocalStorage.initDefaultCurve());
    }
    public static checkLogDirecExist(dir: string) {
        Tool.printMagenta(LocalStorage.getDataDirec() + dir);
        if (fs.existsSync(LocalStorage.getDataDirec() + dir)) {
            Tool.print("Already exist: ");
        } else {
            Tool.print("Not exist: ");
            fs.mkdirSync(LocalStorage.getDataDirec() + dir);
        }
    }
    public static checkFileExist(): void {
        // /home/root/baking/
        Tool.printMagenta(LocalStorage.getRootDir() + "---->");
        if (fs.existsSync(LocalStorage.getRootDir())) {
            Tool.print("Already exist: ");
        } else {
            Tool.print("Not exist: ");
            fs.mkdirSync(LocalStorage.getRootDir());
        }
        // /home/root/baking/data/
        Tool.printMagenta(LocalStorage.getDataDirec() + "---->");
        if (fs.existsSync(LocalStorage.getDataDirec())) {
            Tool.print("Already exist: ");
        } else {
            Tool.print("Not exist: ");
            fs.mkdirSync(LocalStorage.getDataDirec());
        }

        // status file, bakingStatus.json
        Tool.printMagenta(LocalStorage.getStatusFileDirec() + "---->");
        if (fs.existsSync(LocalStorage.getStatusFileDirec())) {
            Tool.print("Already exist: ");
        } else {
            Tool.print("BakingProc: Not exist, create it: ");
            fs.writeFileSync(LocalStorage.getStatusFileDirec(), LocalStorage.strInitBakingStatus());
            // Only save default parameters, 5 parameters
        }

        // default curve value
        Tool.printMagenta(LocalStorage.getDefaultCurveDirec() + "---->");
        if (fs.existsSync(LocalStorage.getDefaultCurveDirec())) {
            Tool.print("Already exist: ");

        } else {
            Tool.print("Not exist: ");
            fs.writeFileSync(LocalStorage.getDefaultCurveDirec(),
                LocalStorage.strInitDefaultCurve());
        }
    }
    public static loadBakingStatus(): IInfoCollect {
        // read it from the disk
        const data = fs.readFileSync(LocalStorage.getStatusFileDirec());
        let obj: any;
        try {
            obj = JSON.parse(data.toString());
        } catch (e) {
            Tool.printRed("loadBakingStatus");
            Tool.printRed(e);
            return undefined;
        }
        return obj;
    }
    public static saveBakingStatus(obj: IInfoCollect) {
        Tool.print("saveBakingStatus");
        fs.writeFileSync(LocalStorage.getStatusFileDirec(),
            JSON.stringify(obj));
    }

    public static loadAppVersion() {
        // const data = fs.readFileSync("../package.json");
        // let obj: any;
        // try {
        //     obj = JSON.parse(data.toString());
        // } catch (e) {
        //     Tool.printRed("load App version fail");
        //     Tool.printRed(e);
        //     return undefined;
        // }
        // APP_VERSION = obj.version;
    }
    public static getAppVersion(): string {
        return APP_VERSION;
    }
    public static getUiVersion(): string {
        return UI_VERSION;
    }
}
/*

    // 以下的数据是要存在磁盘上的
    public sysInfo: ISysInfo;   // current task status
    public baseSetting: IBaseSetting;            // 设置参数
    public bakingInfo: IBakingInfo;              // 烘烤参数
    public runningCurveInfo: IRunningCurveInfo;  // 当前运行曲线的参数
    public resultInfo: IResultInfo;          // 烘烤的结果
    public defaultCurve: ISettingCurveInfo; // 默认的曲线

*/
