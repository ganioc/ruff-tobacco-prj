// Baking curves
import Events = require("events");
import fs = require("fs");
import { clearInterval, setInterval } from "timers";
import * as _ from "underscore";
import * as util from "util";
import {
    IBakingInfo, IBaseSetting, IDefaultCurve, IInfoCollect,
    IResultInfo, IRunningCurveInfo, IRunningOption, ISettingCurveInfo,
    ISysInfo,
    ITrapBaking,
    ITrapInfo,
    RunningStatus,
} from "./BakingCfg";
import { BakingCurve } from "./BakingCurve";
import { ControlMcu } from "./ControlMcu";
import { ControlPeriph } from "./ControlPeripheral";
import { LocalStorage } from "./LocalStorage";
import { ILooseObject, Tool } from "./utility";

export class RunningHandle {

    public static timeDeltaCheckStatus: number;  // tobacco temperature checking period
    public static HistoryCounter: number; // currrent batch ID

    public timerHandler: NodeJS.Timer;

    public timerTrap: NodeJS.Timer;

    public emitter: Events.EventEmitter;

    public runningStatus: RunningStatus;

    public bakingCurve: BakingCurve;  // current baking curve object, 当前的数据结构
    private bBakingFinished: boolean; // work done
    private callback: () => void;  // ?

    constructor(options) {
        // Set temp chekcing cycle
        if (options.timeDelta !== undefined) {
            RunningHandle.timeDeltaCheckStatus = options.timeDelta;
        } else {
            RunningHandle.timeDeltaCheckStatus = 10000; // default it's 10 seconds , otherwise , it will be 60 seconds
        }

        Tool.print("RunningHandle init()");

        this.runningStatus = RunningStatus.WAITING;  // default status is "waiting"

        RunningHandle.HistoryCounter = 0; // default 0

        this.bakingCurve = new BakingCurve({  // init current baking curve
            curve: [],
            timeDelta: RunningHandle.timeDeltaCheckStatus,
        });

        this.bBakingFinished = false;  // 标志位

        this.emitter = new Events.EventEmitter();

        // this.resetStatusEmpty(); // 初始化这些参数

        Tool.print("RunningHandle init() end");
    }
    // public getBakingStatus(): string {
    //     // this.resetStatusEmpty();

    //     if (this.getBakingElementList().length > 0) {
    //         this.runningCurveInfo.CurrentStage = this.bakingCurve.indexBakingElement;
    //         this.runningCurveInfo.CurrentStageRunningTime =
    //             this.getBakingElementList()[this.getIndexBakingElement()].getTimeElapsed();
    //     } else {
    //         this.runningCurveInfo.CurrentStage = 0;
    //         this.runningCurveInfo.CurrentStageRunningTime = 0;
    //     }

    //     const obj: IInfoCollect = {
    //         BakingInfo: this.bakingInfo,
    //         BaseSetting: this.baseSetting,
    //         ResultInfo: this.resultInfo,
    //         RunningCurveInfo: this.runningCurveInfo,
    //         SysInfo: this.sysInfo,
    //     };

    //     return JSON.stringify(obj);
    // }
    public printStatus() {
        // Tool.print("SysInfo:");
        // Tool.print(this.sysInfo);
        // Tool.print("BaseSetting:");
        // Tool.print(this.baseSetting);
        // Tool.print("BakingInfo:");
        // Tool.print(this.bakingInfo);
        // Tool.print("RunningCurveInfo:");
        // Tool.print(this.runningCurveInfo);
        // Tool.print("ResultInfo:");
        // Tool.print(this.resultInfo);
        // Tool.print("defaultCurve:");
        // Tool.print(this.defaultCurve);
    }
    public init(options) {
        Tool.print("AppBaking init({})");
        Tool.print("\nCheck local storage");

        // Read parameters from local storage file
        // Create it with default value if not exist
        LocalStorage.checkFileExist();

        // Read IInfo stored on disk
        const info: IInfoCollect = LocalStorage.loadBakingStatus();

        // check upperRack or lowerRack, GPIO status
        Tool.print("Check upper\/lower rack position");

        ControlPeriph.CheckUpperRack((data) => {
            if (data === 0) {
                info.SysInfo.bTempForUpperRack = false;
            } else if (data === 1) {
                info.SysInfo.bTempForUpperRack = true;
            } else {
                Tool.printRed("Wrong result checkupperRack");
            }
        });

        // check windgate speed
        // this.runningCurveInfo.bWindGateHighSpeed = ControlPeriph.CheckWindGateHighSpeed();

        // check burninggate on
        // this.runningCurveInfo.bBurningGateOn = ControlPeriph.CheckBurningGate();

        // check bVentOn state
        // this.runningCurveInfo.bVentOn = ControlPeriph.CheckVentOn();

        Tool.print("Update sys settings");
        // this.saveStatus();
        // this.printStatus();

        // configure bakingCurve parameters
        this.bakingCurve = new BakingCurve({
            curve: this.getRunningOption(
                info.RunningCurveInfo.TempCurveDryList,
                info.RunningCurveInfo.TempCurveWetList,
                info.RunningCurveInfo.TempDurationList,
            ),
            timeDelta: RunningHandle.timeDeltaCheckStatus,
        });

        // Where to recover : current state, remain time?

        if (info.SysInfo.bInRunning === RunningStatus.PAUSED) {
            this.runningStatus = RunningStatus.PAUSED;
            this.bBakingFinished = false;
            return;
        } else if (info.SysInfo.bInRunning === RunningStatus.STOPPED) {
            this.runningStatus = RunningStatus.STOPPED;
            this.bBakingFinished = true;
            return;
        } else if (info.SysInfo.bInRunning === RunningStatus.RUNNING) {
            this.runningStatus = RunningStatus.PAUSED;
            this.bBakingFinished = false;
            return;
        } else if (info.SysInfo.bInRunning === RunningStatus.WAITING) {
            this.runningStatus = RunningStatus.WAITING;
            this.bBakingFinished = false;
        }

        RunningHandle.HistoryCounter = info.BakingInfo.HistoryCounter;

        // this.setHistoryCounter(this.bakingInfo.HistoryCounter);
        // Tool.print("BakingProc: Current HistoryCounter is:" + this.bakingInfo.HistoryCounter);

        // if directory not existed , create it
        // if there is not a subdirectory (Store the log file) , create it
        // this.createDataDirec();

        // this.runningStatus = RunningStatus.WAITING;
        // this.runningCurveInfo.CurrentStage = 0;
        // this.runningCurveInfo.CurrentStageRunningTime = 0;
        LocalStorage.checkLogDirecExist(RunningHandle.HistoryCounter.toString());

        LocalStorage.saveBakingStatus(info);
    }
    // public createDataDirec() {
    //     if (fs.existsSync(LocalStorage.getDataDirec() + this.bakingInfo.HistoryCounter)) {
    //         Tool.print("Already exist: " + LocalStorage.getDataDirec() + this.bakingInfo.HistoryCounter);
    //     } else {
    //         Tool.print("Not exist: " + LocalStorage.getDataDirec() + this.bakingInfo.HistoryCounter);
    //         fs.mkdirSync(LocalStorage.getDataDirec() + this.bakingInfo.HistoryCounter);
    //     }
    // }
    public reset() {

        if (this.runningStatus === RunningStatus.STOPPED) {
            this.runningStatus = RunningStatus.WAITING;
            Tool.print("BakingProc: reset to Waiting mode");

            const info: IInfoCollect = LocalStorage.loadBakingStatus();
            info.SysInfo.bInRunning = RunningStatus.WAITING;

            LocalStorage.saveBakingStatus(info);

            // copy status file to the project direc
            this.backupRunningStatus();

            this.bBakingFinished = false;

            this.init({});

        } else {
            Tool.print("BakingProc: reset no function in mode - " + this.runningStatus);
        }
    }
    public start() {
        Tool.print("BakingProc: Into start()");

        let info: IInfoCollect = LocalStorage.loadBakingStatus();

        if (this.runningStatus === RunningStatus.WAITING) {
            this.runningStatus = RunningStatus.RUNNING;

            // create the data/ new project directory
            RunningHandle.HistoryCounter++;
            Tool.print("BakingProc: Current HistoryCounter + 1 is:" + RunningHandle.HistoryCounter);

            info.BakingInfo.HistoryCounter = RunningHandle.HistoryCounter;

            LocalStorage.checkLogDirecExist(RunningHandle.HistoryCounter.toString());

            info.RunningCurveInfo.CurrentStage = 0;
            info.RunningCurveInfo.CurrentStageRunningTime = 0;
        } else if (this.runningStatus === RunningStatus.PAUSED) {
            this.runningStatus = RunningStatus.RUNNING;
        } else {
            return;
        }

        Tool.print("BakingProc: resetStage");
        Tool.print("BakingProc: stage " + info.RunningCurveInfo.CurrentStage);
        Tool.print("BakingProc: elapsed time " + info.RunningCurveInfo.CurrentStageRunningTime);

        this.bakingCurve.resetStage(
            info.RunningCurveInfo.CurrentStage,
            info.RunningCurveInfo.CurrentStageRunningTime,
        );

        this.bBakingFinished = false;

        LocalStorage.saveBakingStatus(info);

        Tool.print("timeDeltaCheckStatus: " + RunningHandle.timeDeltaCheckStatus + " seconds");

        this.timerHandler = setInterval(() => {

            this.checkStatus();

            info = LocalStorage.loadBakingStatus();

            info.RunningCurveInfo.CurrentStage = this.bakingCurve.indexBakingElement;
            info.RunningCurveInfo.CurrentStageRunningTime = this.bakingCurve.getCurrentStageElapsedTime();

            LocalStorage.saveBakingStatus(info);

        }, RunningHandle.timeDeltaCheckStatus);
    }

    public pause() {
        const info: IInfoCollect = LocalStorage.loadBakingStatus();

        if (this.runningStatus === RunningStatus.RUNNING) {

            this.runningStatus = RunningStatus.PAUSED;
            info.SysInfo.bInRunning = RunningStatus.PAUSED;
            // 记录当前阶段和运行时间, 已经都被记录过了, 在interval里面

            LocalStorage.saveBakingStatus(info);

            clearInterval(this.timerHandler);
            Tool.print("BakingProc: App paused\n");
        } else {
            Tool.print("BakingProc: pause has no effect in mode: " + this.runningStatus);

        }

    }
    public stop() {
        const info: IInfoCollect = LocalStorage.loadBakingStatus();

        if (this.runningStatus === RunningStatus.RUNNING) {
            this.runningStatus = RunningStatus.STOPPED;

            info.SysInfo.bInRunning = RunningStatus.STOPPED;

            // ????
            info.RunningCurveInfo.CurrentStage = 0;
            info.RunningCurveInfo.CurrentStageRunningTime = 0;

            // this.saveRunningStatus();

            LocalStorage.saveBakingStatus(info);

            clearInterval(this.timerHandler);

            Tool.print("BakingProc:App stopped\n");
        } else {
            Tool.print("BakingProc: sto has no effect in mode: " + this.runningStatus);
        }
    }

    public printTestResult() {
        console.log("-- Print out history temp data --");

        console.log("-- End of history temp data --");
    }
    public loadSysInfo(): ISysInfo {
        const info: IInfoCollect = LocalStorage.loadBakingStatus();
        return info.SysInfo;
    }
    public loadRunningCurveInfo(): IRunningCurveInfo {
        const info: IInfoCollect = LocalStorage.loadBakingStatus();
        return info.RunningCurveInfo;
    }
    public updateRunningCurveInfo(data: any) {
        Tool.printMagenta("update RunningCurveInfo");
        Tool.print(data);

        const info: IInfoCollect = LocalStorage.loadBakingStatus();

        // if (data.CurrentStage === undefined) {
        //     info.RunningCurveInfo.CurrentStage = 0;
        //     info.RunningCurveInfo.CurrentStageRunningTime = 0;
        // }

        info.RunningCurveInfo.TempCurveDryList = [];
        info.RunningCurveInfo.TempCurveWetList = [];
        info.RunningCurveInfo.TempDurationList = [];

        if (data.TempCurveDryList.length !== data.TempCurveWetList.length) {
            Tool.printRed("Wrong format runningcurveinfo");
            return;
        }

        console.log(util.inspect(data.TempCurveDryList));

        data.TempCurveDryList.forEach((element) => {
            info.RunningCurveInfo.TempCurveDryList.push(element);
        });

        console.log(util.inspect(data.TempCurveWetList));

        data.TempCurveWetList.forEach((element) => {
            info.RunningCurveInfo.TempCurveWetList.push(element);
        });

        console.log(util.inspect(data.TempDurationList));

        data.TempDurationList.forEach((element) => {
            info.RunningCurveInfo.TempDurationList.push(element);
        });

        Tool.printBlue("Update this.runningCurveInfo");
        console.log(util.inspect(info.RunningCurveInfo));

        this.bakingCurve = new BakingCurve({
            curve: this.getRunningOption(
                info.RunningCurveInfo.TempCurveDryList,
                info.RunningCurveInfo.TempCurveWetList,
                info.RunningCurveInfo.TempDurationList,
            ),
            timeDelta: RunningHandle.timeDeltaCheckStatus,
        });

        // this.bakingCurve.resetStage(
        //     info.RunningCurveInfo.CurrentStage,
        //     info.RunningCurveInfo.CurrentStageRunningTime,
        // );

        LocalStorage.saveBakingStatus(info);
    }
    public loadResultInfo(): IResultInfo {
        const info: IInfoCollect = LocalStorage.loadBakingStatus();
        return info.ResultInfo;
    }
    public updateResult(data: any) {
        Tool.printMagenta("update ResultInfo");
        Tool.print(data);

        const info: IInfoCollect = LocalStorage.loadBakingStatus();

        if (data instanceof Array) {
            info.ResultInfo.content = [];

            data.forEach((element) => {
                info.ResultInfo.content.push(element);
            });

            LocalStorage.saveBakingStatus(info);

        } else {
            Tool.printRed("Wrong result format");
        }

    }
    public loadBakingInfo(): IBakingInfo {
        const info: IInfoCollect = LocalStorage.loadBakingStatus();
        return info.BakingInfo;
    }
    public updateBakingInfo(data: any) {

        const info: IInfoCollect = LocalStorage.loadBakingStatus();

        Tool.printMagenta("Update BakingInfo");
        console.log(data);

        for (const k in data) {
            if (k !== "HistoryCounter" && info.BakingInfo[k] !== undefined) {
                info.BakingInfo[k] = data[k];
            }
        }
        Tool.printMagenta("After update");
        console.log(info.BakingInfo);

        LocalStorage.saveBakingStatus(info);
    }
    public loadBaseSetting(): IBaseSetting {
        const info: IInfoCollect = LocalStorage.loadBakingStatus();
        return info.BaseSetting;
    }
    public updateBaseSetting(data: any) {
        Tool.printMagenta("Update BaseSetting");

        const info: IInfoCollect = LocalStorage.loadBakingStatus();

        for (const k in data) {
            if (info.BaseSetting[k] !== undefined) {
                info.BaseSetting[k] = data[k];
            }
        }
        LocalStorage.saveBakingStatus(info);
    }
    public getRunning() {
        const obj = { State: "" };

        switch (this.runningStatus) {
            case RunningStatus.PAUSED:
                obj.State = "pause";
                break;
            case RunningStatus.RUNNING:
                obj.State = "run";
                break;
            case RunningStatus.STOPPED:
                obj.State = "stop";
                break;
            case RunningStatus.WAITING:
                obj.State = "wait";
            default:
                Tool.printRed("Unrecognized runningstauts: " + this.runningStatus);
                break;
        }
        return obj;
    }
    public getTrapInfo() {
        const info: IInfoCollect = LocalStorage.loadBakingStatus();

        const obj: ITrapInfo = {
            WetTempAlarm: 0, // 1 alarm, 0 no alarm;
            DryTempAlarm: 0,
            VoltageLowAlarm: 1,
            ACAlarmPhaseA: 0,
            ACAlarmPhaseB: 0,
            ACAlarmPhaseC: 0,
            GPRSAlarm: 0,
            GPSAlarm: 0,

            // temp value
            PrimaryDryTemp: ControlPeriph.temp1,
            PrimaryWetTemp: ControlPeriph.temp2,
            SecondaryDryTemp: ControlPeriph.temp3,
            SecondaryWetTemp: ControlPeriph.temp4,

            bWindGateHighSpeed: true, // true - hi speed, false - low speed
            bBurningGateOn: false,     // true - on, false - off
            bVentOn: false,
            Voltage: 231,  // 电压值
            Date: new Date().getTime(),  // 当前时间

            HistoryCounter: info.BakingInfo.HistoryCounter,
        };

        return obj;
    }
    public getTrapBaking() {
        const obj: ITrapBaking = {
            PrimaryTargetDryTemp: 0,
            PrimaryTargetWetTemp: 0,
            CurrentStage: 0,
            CurrentStageRunningTime: 0,
            bRunStatus: false,
        };

        obj.PrimaryTargetDryTemp = this.bakingCurve.getTempDryTarget();

        obj.PrimaryTargetWetTemp = this.bakingCurve.getTempWetTarget();

        obj.CurrentStage = this.bakingCurve.indexBakingElement;

        obj.CurrentStageRunningTime = this.bakingCurve.getCurrentStageElapsedTime();

        obj.bRunStatus = this.bBakingFinished;

        return obj;
    }

    // save current status to data/
    // fs.writeFileSync(ROOT_DIR + DATA_DIR + "/" +
    // + "/" + stage + ".log", JSON.stringify(log));
    // reset status to empty value
    public backupRunningStatus() {
        Tool.print("Backup running status to file, usually after quality evaluation: "
            + LocalStorage.getDataDirec() + this.bakingCurve.getNameOfHistoryCounter()
            + "/" + LocalStorage.getStatusFileName());

        fs.writeFileSync(LocalStorage.getDataDirec() + this.bakingCurve.getNameOfHistoryCounter()
            + "/" + LocalStorage.getStatusFileName(), JSON.stringify(LocalStorage.loadBakingStatus()));
    }

    // public sendBakingTrap(qt: ControlQT) {
    //     this.timerTrap = setInterval(() => {

    //     }, 5000);
    // }
    // public stopBakingTrap() {
    //     clearInterval(this.timerTrap);
    // }
    private getBakingElementList() {
        return this.bakingCurve.getBakingElementList();
    }
    private getIndexBakingElement() {
        return this.bakingCurve.indexBakingElement;
    }
    // private setHistoryCounter(counter: number) {
    //     RunningHandle.HistoryCounter = counter;
    //     this.bakingInfo.HistoryCounter = counter;
    // }

    // private getDefaultBakingCurve(): string {

    //     return JSON.stringify(DEFAULT_CURVE);
    // }

    private getRunningOption(dryList, wetList, durList): number[][] {
        const len = durList.length;

        const result = [];

        for (let i = 0; i < len; i++) {
            result.push([dryList[i][0], dryList[i][1], wetList[i][0], wetList[i][1], durList[i]]);
        }
        return result;
    }

    // save current status to local storage
    // private saveRunningStatus() {
    //     Tool.print("Save running status to file: " + LocalStorage.getStatusFileDirec());

    //     // console.log(util.inspect(JSON.parse(this.getBakingStatus()), true));

    //     fs.writeFileSync(LocalStorage.getStatusFileDirec(), this.getBakingStatus());
    // }

    // private resetStatusEmpty() {
    //     Tool.print("Reset status to default values:");
    //     this.sysInfo = {
    //         Date: new Date().getTime(),
    //         bInRunning: RunningStatus.WAITING,
    //         bTempForUpperRack: true,
    //     };
    //     this.baseSetting = {
    //         AirFlowPattern: "fall",
    //         ControllerName: "No Name",
    //         GPSInfo: { Longitude: 121.45806, Latitude: 31.22222 },
    //         InnerHeight: 3,
    //         WallMaterial: 0,
    //         LocName: "Some Place",
    //     };
    //     this.bakingInfo = {
    //         TobaccoType: 0,
    //         HistoryCounter: 0, // default is 0
    //         LoadingMethod: 1,
    //         LowerWeight: 0,
    //         MaturePercent1: 0,
    //         MaturePercent2: 0,
    //         MaturePercent3: 0,
    //         MaturePercent4: 0,
    //         MaturePercent5: 0,
    //         MiddleWeight: 0,
    //         PieceQuantity: 1,
    //         PieceWeight: 0,
    //         Quality: 3,
    //         UpperWeight: 0,
    //         bTempForUpperRack: false, // 是上棚吗?
    //     };
    //     this.runningCurveInfo = {
    //         CurrentStage: 0,          // 当前阶段
    //         CurrentStageRunningTime: 0, // 当前阶段已运行时间

    //         TempCurveDryList: [],
    //         TempCurveWetList: [],
    //         TempDurationList: [],
    //     };
    //     this.resultInfo = {
    //         content: [
    //             {
    //                 level: "a",
    //                 weight: 0,
    //             },
    //             {
    //                 level: "b",
    //                 weight: 0,
    //             },
    //             {
    //                 level: "c",
    //                 weight: 0,
    //             },
    //             {
    //                 level: "d",
    //                 weight: 0,
    //             },
    //             {
    //                 level: "e",
    //                 weight: 0,
    //             },
    //             {
    //                 level: "f",
    //                 weight: 0,
    //             },
    //         ],
    //     };
    //     this.defaultCurve = {          // 默认曲线
    //         TempCurveDryList: [],
    //         TempCurveWetList: [],
    //         TempDurationList: [],
    //     };
    // }
    // private resetRunningCurve() {
    //     if (this.defaultCurve.TempDurationList.length <= 0) {
    //         throw new Error("Empty defaultCurve");
    //     } else {
    //         this.runningCurveInfo.TempCurveDryList = [];
    //         this.runningCurveInfo.TempCurveWetList = [];
    //         this.runningCurveInfo.TempDurationList = [];
    //         // copy defaultCurve to running curve
    //         _.each(this.defaultCurve.TempCurveDryList, (item) => {
    //             this.runningCurveInfo.TempCurveDryList.push(item);
    //         });
    //         _.each(this.defaultCurve.TempCurveWetList, (item) => {
    //             this.runningCurveInfo.TempCurveWetList.push(item);
    //         });
    //         _.each(this.defaultCurve.TempDurationList, (item) => {
    //             this.runningCurveInfo.TempDurationList.push(item);
    //         });

    //     }
    // }

    private checkStatus() {

        Tool.printYellow("\n===========CheckStatus()===========" + this.runningStatus);

        if (this.bakingCurve.run() === false) {
            this.stop();
            Tool.printYellow("######################### ");
            Tool.printYellow("BakingCurve work finished ");
            Tool.printYellow("######################### ");

            this.bBakingFinished = true;

            // This is a good time to save current baking curve to the data subdirectory
            // this.backupRunningStatus();

        } else {
            Tool.printYellow(" ------ BakingCurve is running -----");
        }
    }

    // Read info from bakingStatus.json, defaultBakingCurve.json
    // Or create these 2 files
    // private checkFileExist() {
    //     // /home/root/baking/
    //     if (fs.existsSync(LocalStorage.getRootDir())) {
    //         Tool.print("Already exist: " + LocalStorage.getRootDir());
    //     } else {
    //         Tool.print("Not exist: " + LocalStorage.getRootDir());
    //         fs.mkdirSync(LocalStorage.getRootDir());
    //     }

    //     // /home/root/baking/data/
    //     if (fs.existsSync(LocalStorage.getDataDirec())) {
    //         Tool.print("Already exist: " + LocalStorage.getDataDirec());
    //     } else {
    //         Tool.print("Not exist: " + LocalStorage.getDataDirec());
    //         fs.mkdirSync(LocalStorage.getDataDirec());
    //     }

    //     // status file, bakingStatus.json
    //     if (fs.existsSync(LocalStorage.getStatusFileDirec())) {

    //         Tool.print("Already exist: " + LocalStorage.getStatusFileDirec());

    //         // Read out all
    //         // Tool.print(fs.readFileSync);

    //         /*
    //         const data = fs.readFileSync(LocalStorage.getStatusFileDirec());

    //         try {
    //             Tool.print("Parse bakingStatus.json");
    //             Tool.print(JSON.parse(data.toString()));

    //             const info: IInfoCollect = JSON.parse(data.toString());

    //             Tool.print(info.toString());

    //             this.sysInfo = info.SysInfo;
    //             this.baseSetting = info.BaseSetting;
    //             this.bakingInfo = info.BakingInfo;
    //             this.runningCurveInfo = info.RunningCurveInfo;
    //             this.resultInfo = info.ResultInfo;

    //         } catch (e) {
    //             Tool.print("Parse InfoCollect failure");
    //             return;
    //         }
    //         */
    //     } else {
    //         Tool.print("BakingProc: Not exist, create it: " + LocalStorage.getStatusFileDirec());
    //         fs.writeFileSync(LocalStorage.getStatusFileDirec(), LocalStorage.strInitBakingStatus());
    //         // Only save default parameters, 5 parameters
    //     }

    //     // default curve value
    //     if (fs.existsSync(LocalStorage.getDefaultCurveDirec())) {
    //         Tool.print("Already exist: " + LocalStorage.getDefaultCurveDirec());
    //         /*
    //                     const data = fs.readFileSync(LocalStorage.getDefaultCurveDirec());

    //                     try {
    //                         Tool.print(data.toString());

    //                         const curve: IDefaultCurve = JSON.parse(data.toString());
    //                         Tool.print(curve);

    //                         const len = curve.durList.length;

    //                         // if (len !== 3) {
    //                         //     throw new Error("default curve member is not of length : 3");
    //                         // }

    //                         for (let i = 0; i < len; i++) {
    //                             this.defaultCurve.TempCurveDryList.push(curve.dryList[i]);
    //                             this.defaultCurve.TempCurveWetList.push(curve.wetList[i]);
    //                             this.defaultCurve.TempDurationList.push(curve.durList[i]);
    //                         }

    //                         Tool.print(this.defaultCurve);

    //                     } catch (e) {
    //                         Tool.printRed("Parse Default Curve failure");
    //                         throw new Error(e);

    //                     }
    //                     */
    //     } else {
    //         Tool.print("Not exist: " + LocalStorage.getDefaultCurveDirec());

    //         if (DEFAULT_CURVE.dryList.length !== DEFAULT_CURVE.wetList.length ||
    //             DEFAULT_CURVE.wetList.length !== DEFAULT_CURVE.durList.length) {
    //             throw new Error("False DEFAULT_CURVE format");
    //         }

    //         fs.writeFileSync(LocalStorage.getDefaultCurveDirec(), this.getDefaultBakingCurve());

    //         for (let i = 0; i < DEFAULT_CURVE.durList.length; i++) {
    //             this.defaultCurve.TempCurveDryList.push(DEFAULT_CURVE.dryList[i]);
    //             this.defaultCurve.TempCurveWetList.push(DEFAULT_CURVE.wetList[i]);
    //             this.defaultCurve.TempDurationList.push(DEFAULT_CURVE.durList[i]);

    //         }

    //         Tool.print(this.defaultCurve);
    //     }

    //     this.printStatus();

    //     // if runningCurve is empty. It's the 1st time
    //     // Now runningCurveInfo is ready
    //     if (this.runningCurveInfo.TempDurationList.length < 1) {
    //         const len = this.defaultCurve.TempDurationList.length;

    //         for (let i = 0; i < len; i++) {
    //             this.runningCurveInfo.TempCurveDryList.push(
    //                 this.defaultCurve.TempCurveDryList[i],
    //             );
    //             this.runningCurveInfo.TempCurveWetList.push(
    //                 this.defaultCurve.TempCurveWetList[i],
    //             );
    //             this.runningCurveInfo.TempDurationList.push(
    //                 this.defaultCurve.TempDurationList[i],
    //             );
    //         }
    //     }
    // }
}
