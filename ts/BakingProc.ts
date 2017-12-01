// Baking curves
import Events = require("events");
import fs = require("fs");
import { clearInterval, setInterval } from "timers";
import * as _ from "underscore";
import * as util from "util";
import { Alarm } from "./Alarm";
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

        Tool.print("Update sys settings");

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

        LocalStorage.checkLogDirecExist(RunningHandle.HistoryCounter.toString());

        LocalStorage.saveBakingStatus(info);

        // reset peripheral stage
        Tool.printYellow("Init peripheral status:");
        ControlPeriph.TurnOffBakingFire(() => {
            Tool.print("Turn off baking fire");
        });
        ControlPeriph.StopWindVent(() => {
            Tool.print("Stop wind vent");
        });

    }

    public reset() {

        if (this.runningStatus === RunningStatus.STOPPED) {
            this.runningStatus = RunningStatus.WAITING;
            Tool.print("BakingProc: reset to Waiting mode");

            const info: IInfoCollect = LocalStorage.loadBakingStatus();

            info.SysInfo.bInRunning = RunningStatus.WAITING;

            // create the data/ new project directory
            RunningHandle.HistoryCounter++;
            Tool.print("BakingProc: Current HistoryCounter + 1 is:" + RunningHandle.HistoryCounter);

            info.BakingInfo.HistoryCounter = RunningHandle.HistoryCounter;

            LocalStorage.checkLogDirecExist(RunningHandle.HistoryCounter.toString());

            /// -

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

            info.RunningCurveInfo.CurrentStage = 0;
            info.RunningCurveInfo.CurrentStageRunningTime = 0;

            info.SysInfo.bInRunning = RunningStatus.RUNNING;

        } else if (this.runningStatus === RunningStatus.PAUSED) {
            this.runningStatus = RunningStatus.RUNNING;

            info.SysInfo.bInRunning = RunningStatus.RUNNING;
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
    public loadSettingCurveInfo() {
        return LocalStorage.loadDefaultCurve();
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
            WetTempAlarm: 1, // 1 alarm, 0 no alarm;
            DryTempAlarm: 1,
            VoltageLowAlarm: 1,
            ACAlarmPhaseA: 1,
            ACAlarmPhaseB: 1,
            ACAlarmPhaseC: 1,
            GPRSAlarm: 1,
            GPSAlarm: 1,

            // temp value
            PrimaryDryTemp: ControlPeriph.temp1,
            PrimaryWetTemp: ControlPeriph.temp2,
            SecondaryDryTemp: ControlPeriph.temp3,
            SecondaryWetTemp: ControlPeriph.temp4,

            bWindGateHighSpeed: ControlPeriph.bWindGateHighSpeed, // true - hi speed, false - low speed
            bBurningGateOn: false,     // true - on, false - off
            bVentOn: false,
            Voltage: 231,  // 电压值
            Date: new Date().getTime(),  // 当前时间

            HistoryCounter: info.BakingInfo.HistoryCounter,
            Status: info.SysInfo.bInRunning,
        };

        // 根据实际的测试情况进行修改
        if (info.SysInfo.bTempForUpperRack === true) {
            obj.PrimaryDryTemp = ControlPeriph.temp4;
            obj.PrimaryWetTemp = ControlPeriph.temp2;
            obj.SecondaryDryTemp = ControlPeriph.temp1;
            obj.SecondaryWetTemp = ControlPeriph.temp3;

        } else {
            obj.PrimaryDryTemp = ControlPeriph.temp1;
            obj.PrimaryWetTemp = ControlPeriph.temp3;
            obj.SecondaryDryTemp = ControlPeriph.temp2;
            obj.SecondaryWetTemp = ControlPeriph.temp4;

        }

        // check dry temp
        obj.DryTempAlarm = Alarm.checkDryTemp(info, obj.PrimaryDryTemp, obj.PrimaryWetTemp);

        // check wet temp
        obj.WetTempAlarm = Alarm.checkWetTemp(info, obj.PrimaryWetTemp, obj.PrimaryDryTemp);

        // 燃烧门的状态
        obj.bBurningGateOn = ControlPeriph.bBurningGateOn;
        // 风门状态
        obj.bVentOn = (ControlPeriph.VentAngle > 0.1) ? true : false;

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

    public ResetToDefault() {
        // check it's in waiting state
        if (this.runningStatus !== RunningStatus.WAITING) {
            Tool.printRed("Must be waiting state to reset to default");
            return;
        }

        // remove baking directory
        fs.rmdirSync(LocalStorage.getRootDir());

        // Cause it to restart
        throw new Error("Reset to Default State");
    }

    private getBakingElementList() {
        return this.bakingCurve.getBakingElementList();
    }
    private getIndexBakingElement() {
        return this.bakingCurve.indexBakingElement;
    }

    private getRunningOption(dryList, wetList, durList): number[][] {
        const len = durList.length;

        const result = [];

        for (let i = 0; i < len; i++) {
            result.push([dryList[i][0], dryList[i][1], wetList[i][0], wetList[i][1], durList[i]]);
        }
        return result;
    }

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
}
