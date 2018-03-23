import * as fs from "fs";
import * as path from "path";
import { AppConfig } from "./AppConfig";
import { Tool } from "./utility";

const APP_VERSION = "1.2.7";
// require("../package.json").version;

const UI_VERSION = "1.1";

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
    IfCurrentStageInfo,
    IfMachineInfo,
} from "./BakingCfg";
import { inspect } from "util";
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
const C_FILE_MACHINE = "/home/root/machine.json"; // to store machine's device_id, code, mqtt user, code

// 再存一份在当前工作的 log 目录下面
// 放两份,currentStage.json, currentStage1.json
// currentStageRunningTime.json, currentStageRunningTime1.json
const C_FILE_CURRENT_STAGE = "/home/root/baking/currentStage.json";
const C_FILE_CURRENT_STAGE_BACKUP = "/home/root/baking/currentStageBackup.json";
// const C_FILE_CURRENT_STAGE_RUNNING_TIME = "/home/root/baking/currentStageRunningTime.json";

Tool.printGreen(path.dirname(__filename));

let objConfig: IfConfigFile = AppConfig.getAppConfig();

// const DEFAULT_CURVE: IDefaultCurve = {
//     dryList: objConfig.baking_config.default_curve.dryList,
//     wetList: objConfig.baking_config.default_curve.wetList,
//     durList: objConfig.baking_config.default_curve.durList,
// };

let DEFAULT_CURVES: IDefaultCurve[] = [];

objConfig.baking_config.default_curves.forEach((item) => {
    DEFAULT_CURVES.push({
        dryList: item.dryList,
        wetList: item.wetList,
        durList: item.durList,
    });
});

let NUM_OF_DEFAULT_CURVES = DEFAULT_CURVES.length;

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
    public static getMachineFile(): string {
        return C_FILE_MACHINE;
    }
    public static getCurrentStageDirec(): string {
        return C_FILE_CURRENT_STAGE;
    }
    public static getCurrentStageBackupDirec(): string {
        return C_FILE_CURRENT_STAGE_BACKUP;
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
        // Get info from app.json file
        const appConfig = AppConfig.getAppConfig();

        return {
            Date: new Date().getTime(),
            bInRunning: RunningStatus.WAITING,
            bTempForUpperRack: true,
            HistoryCounter: 1,
            AppVersion: APP_VERSION,
            UIVersion: UI_VERSION,
            TobaccoType: appConfig.baking_config.tobacco_type,
            QualityLevel: appConfig.baking_config.quality_level,
        };
    }
    public static initBaseSetting(): IBaseSetting {

        return {
            AirFlowPattern: "fall",
            ControllerName: "No-Name",
            GPSInfo: { Longitude: 0, Latitude: 0 },
            InnerHeight: 3,
            WallMaterial: 0,
            LocName: "Some-Place",
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
            Quality: 1,
            UpperWeight: 0,
            bTempForUpperRack: true, // 是上棚吗?
        };
    }
    public static initRunningCurveInfo(): IRunningCurveInfo {
        return {
            CurrentStage: 0,          // 当前阶段
            CurrentStageRunningTime: 0, // 当前阶段已运行时间
            TempCurveDryList: DEFAULT_CURVES[0].dryList,
            TempCurveWetList: DEFAULT_CURVES[0].wetList,
            TempDurationList: DEFAULT_CURVES[0].durList,
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
    public static loadDefaultCurve(mIndex) {
        return LocalStorage.getDefaultCurve(mIndex);
    }
    public static getDefaultCurve(i: number) {
        let mIndex = 0;
        if (i < 0 || i >= NUM_OF_DEFAULT_CURVES) {
            mIndex = 0;
        } else {
            mIndex = i;
        }

        return {
            Index: mIndex,
            NumOfCurves: NUM_OF_DEFAULT_CURVES,
            TempCurveDryList: DEFAULT_CURVES[mIndex].dryList,
            TempCurveWetList: DEFAULT_CURVES[mIndex].wetList,
            TempDurationList: DEFAULT_CURVES[mIndex].durList,
        };
    }
    public static initDefaultCurve() {
        return {
            TempCurveDryList: DEFAULT_CURVES[0].dryList,
            TempCurveWetList: DEFAULT_CURVES[0].wetList,
            TempDurationList: DEFAULT_CURVES[0].durList,
        };
    }
    public static initCurrentStage(): IfCurrentStageInfo {
        return {
            CurrentStage: 0,
            CurrentStageRunningTime: 0,
        };
    }
    public static strInitBakingStatus(): string {
        return JSON.stringify(LocalStorage.initBakingStatus());
    }
    public static strInitDefaultCurve(): string {
        return JSON.stringify(LocalStorage.initDefaultCurve());
    }
    public static strInitCurrentStage(): string {
        return JSON.stringify(LocalStorage.initCurrentStage());
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
            Tool.print("baking/data/ Not exist, create it: ");
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

        // add 2017-12-26, for currentStage.json file
        Tool.printMagenta(LocalStorage.getCurrentStageDirec() + "---->");
        if (fs.existsSync(LocalStorage.getCurrentStageDirec())) {
            Tool.print("Already exist: ");
        } else {
            Tool.print("Not exist: ");
            fs.writeFileSync(LocalStorage.getCurrentStageDirec(),
                LocalStorage.strInitCurrentStage());
            fs.writeFileSync(LocalStorage.getCurrentStageBackupDirec(), LocalStorage.strInitCurrentStage());
        }

    }
    public static loadCurrentStageAsync(callback: (err, o: IfCurrentStageInfo) => void) {
        fs.readFile(LocalStorage.getCurrentStageDirec(), (err, data) => {
            if (err) {
                callback(err, null);
                return;
            }
            let obj: any;
            try {
                obj = JSON.parse(data.toString());
            } catch (e) {
                Tool.printRed("loadCurrentStage error");
                Tool.printRed(e);
                callback(e, null);
                return;
            }
            callback(null, obj);
        });
    }
    public static loadCurrentStageBackupAsync(callback: (err, o: IfCurrentStageInfo) => void) {
        fs.readFile(LocalStorage.getCurrentStageBackupDirec(), (err, data) => {
            if (err) {
                callback(err, null);
                return;
            }
            let obj: any;
            try {
                obj = JSON.parse(data.toString());
            } catch (e) {
                Tool.printRed("loadCurrentStageBackup error");
                Tool.printRed(e);
                callback(e, null);
                return;
            }
            callback(null, obj);
        });
    }
    public static saveCurrentStageAsync(obj: IfCurrentStageInfo, callback: (err, data) => void) {
        Tool.printYellow("saveCurrentStage");

        fs.writeFile(LocalStorage.getCurrentStageDirec(), JSON.stringify(obj), (err) => {
            if (err) {
                Tool.printRed("savecurrent stage error");
                callback(err, null);
                return;
            }
            Tool.printBlue("saveCurrentStage OK");
            callback(null, "OK");
        });
    }
    public static saveCurrentStageSync(obj: IfCurrentStageInfo) {
        Tool.printYellow("saveCurrentStage");
        fs.writeFileSync(LocalStorage.getCurrentStageDirec(), JSON.stringify(obj));
    }
    public static saveCurrentStageBackupSync(obj: IfCurrentStageInfo) {
        Tool.printYellow("saveCurrentStageBackup");
        fs.writeFileSync(LocalStorage.getCurrentStageBackupDirec(), JSON.stringify(obj));
    }
    public static resetCurrentStageSync() {
        const obj: IfCurrentStageInfo = {
            CurrentStage: 0,
            CurrentStageRunningTime: 0, // 分钟
        };
        LocalStorage.saveCurrentStageAsync(obj, () => {
            console.log("currentstage :0");
            LocalStorage.saveCurrentStageBackupAsync(obj, () => {
                console.log("back up currentstage :0");
            });
        });
    }
    public static saveCurrentStageBackupAsync(obj: IfCurrentStageInfo, callback: (err, data) => void) {
        Tool.printYellow("saveCurrentStageBackup");

        fs.writeFile(LocalStorage.getCurrentStageBackupDirec(), JSON.stringify(obj), (err) => {
            if (err) {
                Tool.printRed("savecurrent stage backup error");
                callback(err, null);
                return;
            }
            Tool.printBlue("saveCurrentStage backup OK");
            callback(null, "OK");
        });
    }
    public static loadBakingStatusAsync(callback: (err, o: IInfoCollect) => void) {
        fs.readFile(LocalStorage.getStatusFileDirec(), (err, data) => {
            if (err) {
                callback(err, null);
                return;
            }
            let obj: any;
            try {
                obj = JSON.parse(data.toString());
            } catch (e) {
                Tool.printRed("loadBakingStatus error");
                Tool.printRed(e);
                callback(e, null);
                return;
            }
            callback(null, obj);
        });
    }
    public static loadBakingStatusSync(): IInfoCollect {
        // read it from the disk
        const data = fs.readFileSync(LocalStorage.getStatusFileDirec());
        let obj: any;
        try {
            obj = JSON.parse(data.toString());
        } catch (e) {
            Tool.printRed("loadBakingStatus Failure");
            console.log(data.length);
            console.log(data.toString());
            Tool.printRed(e);
            Tool.printRed("Use default BakingStatus info");
            return LocalStorage.initBakingStatus();
        }
        return obj;
    }
    public static saveBakingStatusAsync(obj: IInfoCollect, callback: (err, data) => void) {
        Tool.printYellow("saveBakingStatus");

        fs.writeFile(LocalStorage.getStatusFileDirec(), JSON.stringify(obj), (err) => {
            if (err) {
                Tool.printRed("saveBakingStatus error");
                callback(err, null);
                return;
            }
            Tool.printBlue("saveBakingStatus OK");
            callback(null, "OK");
        });
    }
    public static saveBakingStatusSync(obj: IInfoCollect) {
        Tool.print("saveBakingStatus");
        inspect(obj);
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

    public static loadMachineInfoAsync(callback) {
        Tool.printMagenta(LocalStorage.getMachineFile() + "---->");
        if (fs.existsSync(LocalStorage.getMachineFile())) {
            Tool.print("file already exist: ");
            fs.readFile(LocalStorage.getMachineFile(), (err, data) => {
                if (err) {
                    callback(err, null);
                    return;
                }
                let obj: any;
                try {
                    obj = JSON.parse(data.toString());
                } catch (e) {
                    Tool.printRed("loadMachineInfo error");
                    Tool.printRed(e);
                    callback(e, null);
                    return;
                }
                callback(null, obj);
            });
        } else {
            Tool.print("Not exist, it's a new machine: ");
            callback("NOK", null);
        }
    }

    public static getStageFromDirec(): IfCurrentStageInfo {
        // let num: number;
        let files = [];
        let nameDirec: number = 0;

        // 找到 data/ 目录下的子目录里，值最大的目录
        files = fs.readdirSync(LocalStorage.getDataDirec());

        if (files === []) {
            return {
                CurrentStage: 0,
                CurrentStageRunningTime: 0,
            };
        }

        files.forEach((file, index) => {
            const nName: number = parseInt(file, 10);
            if (nName > nameDirec) {
                nameDirec = nName;
            }
        });
        // 找到该子目录里的 *.log 文件里面， 值最大的文件值
        let tempName: string = nameDirec + "";

        // files = fs.readdirSync(LocalStorage.getDataDirec() + tempName);

        const logFiles = fs.readdirSync(LocalStorage.getDataDirec() + tempName + "/");

        if (logFiles === []) {
            return {
                CurrentStage: 0,
                CurrentStageRunningTime: 0,
            };
        }

        nameDirec = 0;
        logFiles.forEach((file, index) => {
            const nName: number = parseInt(file, 10);
            if (nName > nameDirec) {
                nameDirec = nName;
            }
        });

        tempName = nameDirec + ""; // latest log file name

        // analyze the content of the file ... later ...

        return {
            CurrentStage: (logFiles.length > 0) ? (logFiles.length - 1) : (0),
            CurrentStageRunningTime: 0,
        };
    }

    public static saveMachineInfo(m: IfMachineInfo) {
        fs.writeFile(LocalStorage.getMachineFile(), JSON.stringify(m), (err) => {
            if (err) {
                Tool.printRed("savecurrent MachineInfo error");
                return;
            }
            Tool.printBlue("saveMachineInfo OK");
        });
    }

    public static updateDefaultCurves() {
        console.log("update default curve");
        objConfig = AppConfig.getAppConfig();
        DEFAULT_CURVES = [];
        objConfig.baking_config.default_curves.forEach((item) => {
            DEFAULT_CURVES.push({
                dryList: item.dryList,
                wetList: item.wetList,
                durList: item.durList,
            });
        });
        NUM_OF_DEFAULT_CURVES = DEFAULT_CURVES.length;
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
