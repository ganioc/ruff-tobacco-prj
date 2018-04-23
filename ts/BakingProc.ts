import Spawn = require("child_process");
import Events = require("events");
import fs = require("fs");
import { Promise } from "promise";
import { clearInterval, setInterval, setTimeout } from "timers";
import * as util from "util";
import { Alarm } from "./Alarm";
import { AppConfig } from "./AppConfig";
import {
    IBakingInfo, IBaseSetting, IDefaultCurve, IInfoCollect,
    IResultInfo, IRunningCurveInfo, IRunningOption, ISettingCurveInfo,
    ISysInfo,
    ITrapBaking,
    ITrapInfo,
    RunningStatus,
    IfCurrentStageInfo,
} from "./BakingCfg";
import { BakingCurve } from "./BakingCurve";
import { ControlMcu } from "./ControlMcu";
import { ControlPeriph } from "./ControlPeripheral";
import { LocalStorage } from "./LocalStorage";
import { ProtobufDecode } from "./ProtobufDecode";
import { ILooseObject, Tool } from "./utility";

const SAVE_COUNTER_MAX = 12; // 12 * 10 = 120 seconds

export class RunningHandle {

    public static timeDeltaCheckStatus: number;  // tobacco temperature checking period
    public static HistoryCounter: number; // currrent batch ID
    public static bTempForUpperRack: boolean;

    public timerHandler: NodeJS.Timer;

    public timerTrap: NodeJS.Timer;

    public emitter: Events.EventEmitter;

    public runningStatus: RunningStatus;

    public bakingCurve: BakingCurve;  // current baking curve object, 当前的数据结构
    private bBakingFinished: boolean; // work done
    private callback: () => void;  // ?
    private nSaveCounter: number;
    private decoder: ProtobufDecode;

    constructor(options) {
        // Set temp chekcing cycle
        if (options.timeDelta !== undefined) {
            RunningHandle.timeDeltaCheckStatus = options.timeDelta;
        } else {
            RunningHandle.timeDeltaCheckStatus = 10000; // default it's 10 seconds , otherwise , it will be 60 seconds
        }

        Tool.print("RunningHandle init()");

        this.runningStatus = RunningStatus.WAITING;  // default status is "waiting"

        RunningHandle.HistoryCounter = 1; // default = 1

        this.bakingCurve = new BakingCurve({  // init current baking curve
            curve: [],
            timeDelta: RunningHandle.timeDeltaCheckStatus,
        });

        this.bBakingFinished = false;  // 标志位

        this.emitter = new Events.EventEmitter();

        RunningHandle.bTempForUpperRack = true;

        this.nSaveCounter = 0;
    }

    public init(option) {
        Tool.print("AppBaking init({})");
        Tool.print("\nCheck local storage");
        if (this.decoder === undefined) {
            this.decoder = option.decoder;
        }
        Tool.print("\nCheck local storage");

        // Read parameters from local storage file
        // Create it with default value if not exist

        LocalStorage.checkFileExist();

        // Read IInfo stored on disk, can use sync mode
        const info: IInfoCollect = LocalStorage.loadBakingStatusSync();

        // ----------read from app.json config file ----------
        // read parameters from App.json, AppConfig
        const appConfig = AppConfig.getAppConfig();

        info.SysInfo.TobaccoType = appConfig.baking_config.tobacco_type;
        info.SysInfo.QualityLevel = appConfig.baking_config.quality_level;

        // update version number
        info.SysInfo.AppVersion = LocalStorage.getAppVersion();
        info.SysInfo.UIVersion = LocalStorage.getUiVersion();

        // baking curve will not be changed by config file
        // info.RunningCurveInfo.TempCurveDryList =
        //     info.RunningCurveInfo.TempCurveDryList;
        // info.RunningCurveInfo.TempCurveWetList =
        //     info.RunningCurveInfo.TempCurveWetList;
        // info.RunningCurveInfo.TempDurationList =
        //     info.RunningCurveInfo.TempDurationList;

        // ---------- read from app.json End ----------

        // check upperRack or lowerRack, GPIO status
        Tool.print("Check upper rack position");

        ControlPeriph.CheckUpperRack((data) => {
            Tool.printGreen("CheckUpperRack");
            console.log(data);

            // if (data === 0) {
            //     info.SysInfo.bTempForUpperRack = true;
            //     RunningHandle.bTempForUpperRack = true;
            //     info.BakingInfo.bTempForUpperRack = true;

            // } else if (data === 1) {
            //     info.SysInfo.bTempForUpperRack = true;
            //     RunningHandle.bTempForUpperRack = true;
            //     info.BakingInfo.bTempForUpperRack = true;

            // } else {
            //     Tool.printRed("Wrong result checkupperRack");
            // }
            RunningHandle.bTempForUpperRack = info.SysInfo.bTempForUpperRack;
            info.BakingInfo.bTempForUpperRack = info.SysInfo.bTempForUpperRack;

            // move in
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
                info.SysInfo.bInRunning = RunningStatus.PAUSED;
                this.bBakingFinished = false;
            } else if (info.SysInfo.bInRunning === RunningStatus.STOPPED) {
                this.runningStatus = RunningStatus.STOPPED;
                info.SysInfo.bInRunning = RunningStatus.STOPPED;
                this.bBakingFinished = true;

            } else if (info.SysInfo.bInRunning === RunningStatus.RUNNING) {
                this.runningStatus = RunningStatus.PAUSED;
                info.SysInfo.bInRunning = RunningStatus.PAUSED;
                this.bBakingFinished = false;

            } else if (info.SysInfo.bInRunning === RunningStatus.WAITING) {
                this.runningStatus = RunningStatus.WAITING;
                info.SysInfo.bInRunning = RunningStatus.WAITING;
                this.bBakingFinished = false;
            }

            Tool.printRed("check sysinfo bInrunning " + info.SysInfo.bInRunning + " " + this.runningStatus);

            RunningHandle.HistoryCounter = info.BakingInfo.HistoryCounter;

            LocalStorage.checkLogDirecExist(RunningHandle.HistoryCounter.toString());

            LocalStorage.saveBakingStatusSync(info);

            // add by yang. It's wrong to reset it here
            // LocalStorage.resetCurrentStageSync();

            // reset peripheral stage
            Tool.printYellow("Init peripheral status:");

            Tool.printGreen("status is:" + this.runningStatus);

            ControlPeriph.TurnOffBakingFire(() => {
                Tool.print("Turn off baking fire");
            });

            ControlPeriph.StopWindVent(() => {
                Tool.print("Stop wind vent");
            });

            ControlPeriph.ResetVent();

        });
    }

    public reset() {

        if (this.runningStatus === RunningStatus.STOPPED) {

            const info: IInfoCollect = LocalStorage.loadBakingStatusSync();

            this.runningStatus = RunningStatus.WAITING;

            Tool.print("BakingProc: reset to Waiting mode");
            info.SysInfo.bInRunning = RunningStatus.WAITING;

            // create the data/ new project directory
            RunningHandle.HistoryCounter++;
            Tool.print("BakingProc: Current HistoryCounter + 1 is:" + RunningHandle.HistoryCounter);

            info.BakingInfo.HistoryCounter = RunningHandle.HistoryCounter;

            // add on 2018-1-10, should synchronize with sysinfo
            info.SysInfo.HistoryCounter = RunningHandle.HistoryCounter;

            // change to default upperRack position
            info.SysInfo.bTempForUpperRack = true;
            info.BakingInfo.bTempForUpperRack = true;

            LocalStorage.checkLogDirecExist(RunningHandle.HistoryCounter.toString());

            LocalStorage.saveBakingStatusSync(info);

            // copy status file to the project direc
            this.backupRunningStatus();

            this.bBakingFinished = false;

            this.init({});

        } else {
            Tool.print("BakingProc: reset no function in mode - " + this.runningStatus);
        }
    }

    public start() {
        this.startInAsync();
    }

    public startInAsync() {
        let info: IInfoCollect;
        let currentObj: IfCurrentStageInfo;

        const proc = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve("OK");
            }, 250);
        }).then((val) => {
            return new Promise((resolve, reject) => {
                Tool.printGreen("Start In Async mode ==>");
                LocalStorage.loadCurrentStageAsync((err, o: IfCurrentStageInfo) => {
                    if (err) {
                        Tool.printRed("Read current stage file failure");

                        reject("NOK");
                        return;
                    }

                    try {
                        currentObj = JSON.parse(JSON.stringify(o));
                    } catch (e) {
                        Tool.printRed(e);
                        reject("NOK");
                        return;
                    }
                    resolve("OK");
                });

            });

        }).then((val) => {
            return new Promise((resolve, reject) => {
                resolve("OK");
            });
        }, (fb) => { // read backup file
            return new Promise((resolve, reject) => {
                LocalStorage.loadCurrentStageBackupAsync((err, o: IfCurrentStageInfo) => {
                    if (err) {
                        Tool.printRed("Read current stage backup file failure");
                        const stageInfo = LocalStorage.getStageFromDirec();
                        // Temporarily, should read length from config
                        currentObj = {
                            CurrentStage: stageInfo.CurrentStage > 19 ? 0 : stageInfo.CurrentStage,  // Or read the directory number under data/
                            CurrentStageRunningTime: 0,
                        };
                        resolve("OK");
                        return;
                    }

                    try {
                        currentObj = JSON.parse(JSON.stringify(o));
                    } catch (e) {
                        Tool.printRed(e);
                        const stageInfo = LocalStorage.getStageFromDirec();
                        currentObj = {
                            CurrentStage: stageInfo.CurrentStage > 19 ? 0 : stageInfo.CurrentStage,  // Or read the directory number under data/
                            CurrentStageRunningTime: 0,
                        };
                    }
                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
                    if (err) {
                        Tool.printRed(err);
                        Tool.printRed("Wrong read bakingStatus, treat as a new baking task");
                        info = LocalStorage.initBakingStatus();
                        resolve("OK");
                        return;
                    }
                    try {
                        info = JSON.parse(JSON.stringify(o));
                    } catch (e) {
                        Tool.printRed(e);
                        Tool.printRed("Treat as a new baking task");
                        info = LocalStorage.initBakingStatus();
                    }

                    resolve("OK");
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                if (this.runningStatus === RunningStatus.WAITING) {

                    this.runningStatus = RunningStatus.RUNNING;
                    info.SysInfo.bInRunning = RunningStatus.RUNNING;
                    info.RunningCurveInfo.CurrentStage = 0; // Not used
                    info.RunningCurveInfo.CurrentStageRunningTime = 0; // Not used

                    currentObj.CurrentStageRunningTime = 0;
                    currentObj.CurrentStageRunningTime = 0;

                } else if (this.runningStatus === RunningStatus.PAUSED) {
                    this.runningStatus = RunningStatus.RUNNING;

                    info.SysInfo.bInRunning = RunningStatus.RUNNING;
                } else {
                    reject("NOK");
                    return;
                }

                Tool.print("BakingProc: resetStage");
                Tool.print("BakingProc: stage " + currentObj.CurrentStage);
                Tool.print("BakingProc: elapsed time " + currentObj.CurrentStageRunningTime);
                resolve("OK");
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                this.bakingCurve.resetStage(
                    currentObj.CurrentStage,
                    currentObj.CurrentStageRunningTime,
                );

                this.bBakingFinished = false;
                resolve("OK");
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                LocalStorage.saveBakingStatusAsync(info, (err, data) => {
                    if (err) {
                        Tool.printRed("save baking status async fail");
                        Tool.printRed(err);
                        reject(err);
                        return;
                    }
                    resolve(data);
                });
            });
        }).then((val) => {
            return new Promise((resolve, reject) => {
                Tool.print("timeDeltaCheckStatus: " + RunningHandle.timeDeltaCheckStatus + " seconds");

                // Added by Yang Jun, 2017-12-14
                clearInterval(this.timerHandler);

                this.nSaveCounter = 0;

                this.timerHandler = setInterval(() => {

                    // main function to do the temp checking
                    this.checkStatus();

                    this.nSaveCounter++;

                    // save current stage and elapsed time every 10*12 seconds
                    if (this.nSaveCounter >= SAVE_COUNTER_MAX) {
                        this.nSaveCounter = 0;

                        currentObj.CurrentStage = this.bakingCurve.indexBakingElement;
                        currentObj.CurrentStageRunningTime = this.bakingCurve.getCurrentStageElapsedTime();

                        LocalStorage.saveCurrentStageAsync(currentObj, (err, data) => {
                            Tool.print("save current stage");
                        });

                        LocalStorage.saveCurrentStageBackupAsync(currentObj, (err, data) => {
                            Tool.print("save current stage backup");
                        });
                    }
                }, RunningHandle.timeDeltaCheckStatus);
                resolve("OK");
            });
        }).then((fb) => {
            Tool.print(fb);
            return;
        }, (err) => {
            Tool.print(err);
            return;
        });

    }
    public pause() {
        this.pauseAsync();
    }
    public pauseAsync() {
        let info: IInfoCollect;

        LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
            if (err) {
                Tool.printRed("pauseAsync load fail");
                return;
            }

            info = JSON.parse(JSON.stringify(o));

            if (this.runningStatus === RunningStatus.RUNNING) {

                // 记录当前阶段和运行时间, 已经都被记录过了, 在interval里面
                this.runningStatus = RunningStatus.PAUSED;
                info.SysInfo.bInRunning = RunningStatus.PAUSED;

                clearInterval(this.timerHandler);
                Tool.print("BakingProc: App paused\n");

                LocalStorage.saveBakingStatusAsync(info, (err2, data) => {
                    if (err2) {
                        Tool.printRed("pauseasync save fail");
                        return;
                    }

                });

            } else {
                Tool.print("BakingProc: pause has no effect in mode: " + this.runningStatus);

            }

        });
    }

    public stop() {
        const info: IInfoCollect = LocalStorage.loadBakingStatusSync();

        if (this.runningStatus === RunningStatus.RUNNING ||
            this.runningStatus === RunningStatus.PAUSED) {
            this.runningStatus = RunningStatus.STOPPED;

            info.SysInfo.bInRunning = RunningStatus.STOPPED;

            // ????
            info.RunningCurveInfo.CurrentStage = 0;
            info.RunningCurveInfo.CurrentStageRunningTime = 0;

            LocalStorage.saveBakingStatusSync(info);

            LocalStorage.resetCurrentStageSync();

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
        const info: IInfoCollect = LocalStorage.loadBakingStatusSync();
        // info.SysInfo.AppVersion = LocalStorage.getAppVersion();
        // info.SysInfo.UIVersion = LocalStorage.getUiVersion();
        return info.SysInfo;
    }
    // public loadRunningCurveInfo(): IRunningCurveInfo {
    //     const info: IInfoCollect = LocalStorage.loadBakingStatus();
    //     return info.RunningCurveInfo;
    // }
    public loadSettingCurveInfo(content: any) {
        let mIndex = 0;

        if (content.Index === undefined) {
            mIndex = 0;
        } else {
            mIndex = content.Index;
        }

        return LocalStorage.loadDefaultCurve(mIndex);
    }
    public updateRunningCurveInfoAsync(data: any) {
        Tool.printMagenta("update RunningCurveInfo");
        let info: IInfoCollect;

        LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
            if (err) {
                Tool.printRed("updateRunningCurveInfoAsync fail");
                return;
            }
            info = JSON.parse(JSON.stringify(o));

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

            LocalStorage.saveBakingStatusAsync(info, (err2, data2) => {
                if (err2) {
                    Tool.printRed("updateRunningCurveInfoAsync fail save");
                }
            });

        });
    }

    public updateResult(data: any) {
        Tool.printMagenta("update ResultInfo");
        Tool.print(data);

        let info: IInfoCollect;

        if (data instanceof Array) {

            LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
                if (err) {
                    Tool.printRed("udpateresult fail");
                    return;
                }
                info = JSON.parse(JSON.stringify(o));
                info.ResultInfo.content = [];

                data.forEach((element) => {
                    info.ResultInfo.content.push(element);
                });
                LocalStorage.saveBakingStatusAsync(info, (err2, data2) => {
                    if (err2) {
                        Tool.printRed("udpateresult fail save");
                        return;
                    }
                });
            });

        } else {
            Tool.printRed("Wrong result format");
        }

    }
    // public loadBakingInfo(): IBakingInfo {
    //     const info: IInfoCollect = LocalStorage.loadBakingStatus();
    //     return info.BakingInfo;
    // }

    public updateBakingInfoAsync(data: any, cb) {
        Tool.printMagenta("Update BakingInfo");
        let info: IInfoCollect;

        LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
            if (err) {
                Tool.printRed("updateBakingInfoAsync fail");
                return;
            }
            info = JSON.parse(JSON.stringify(o));
            for (const k in data) {
                if (k !== "HistoryCounter" && info.BakingInfo[k] !== undefined) {
                    info.BakingInfo[k] = data[k];
                }
            }
            Tool.printMagenta("After update");
            console.log(info.BakingInfo);

            LocalStorage.saveBakingStatusAsync(info, (err2, data2) => {
                if (err2) {
                    Tool.printRed("updateBakingInfoAsync fail save");
                    return;
                }
                cb();
            });
        });

        // create batch according to info.bakingInfo
    }

    public loadInfoCollectAsync(callback: (obj: IInfoCollect) => void) {
        LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
            if (err) {
                Tool.printRed("loadbasesettingasync fail");
                return;
            }
            o.BaseSetting.GPSInfo.Latitude = ControlPeriph.gpsLatitude;
            o.BaseSetting.GPSInfo.Longitude = ControlPeriph.gpsLongitude;
            callback(o);
        });
    }
    // public loadBaseSetting(): IBaseSetting {
    //     const info: IInfoCollect = LocalStorage.loadBakingStatus();
    //     return info.BaseSetting;
    // }
    public updateBaseSettingAsync(data: any) {
        Tool.printMagenta("Update BaseSetting");

        let info: IInfoCollect;

        LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
            if (err) {
                Tool.printRed("udpateBasesettingAsync fail");
                return;
            }
            info = JSON.parse(JSON.stringify(o));
            for (const k in data) {
                if (info.BaseSetting[k] !== undefined) {
                    info.BaseSetting[k] = data[k];
                }
            }

            if (data.AirFlowPattern === "rise") {
                info.SysInfo.bTempForUpperRack = false;
                RunningHandle.bTempForUpperRack = info.SysInfo.bTempForUpperRack;
                info.BakingInfo.bTempForUpperRack = info.SysInfo.bTempForUpperRack;
                info.BaseSetting.AirFlowPattern = "rise";

            } else if (data.AirFlowPattern === "fall") {
                info.SysInfo.bTempForUpperRack = true;
                RunningHandle.bTempForUpperRack = info.SysInfo.bTempForUpperRack;
                info.BakingInfo.bTempForUpperRack = info.SysInfo.bTempForUpperRack;
                info.BaseSetting.AirFlowPattern = "fall";
            } else {
                Tool.printRed("Unrecognized airflowpattern");
            }

            LocalStorage.saveBakingStatusAsync(info, (err2, data2) => {
                if (err2) {
                    Tool.printRed("updateBaseSettingAsync fail save");
                }
            });
        });

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
    public getTrapInfoAsync(cb: (err, data) => void) {
        // let info: IInfoCollect;

        const obj: ITrapInfo = {
            WetTempAlarm: 1, // 1 alarm, 0 no alarm;
            DryTempAlarm: 1,
            VoltageLowAlarm: 1,
            ACAlarmPhaseA: 1,
            ACAlarmPhaseB: 1,
            ACAlarmPhaseC: 1,
            GPRSAlarm: 0,
            GPSAlarm: 1,

            // temp value
            PrimaryDryTemp: ControlPeriph.temp1,
            PrimaryWetTemp: ControlPeriph.temp2,
            SecondaryDryTemp: ControlPeriph.temp3,
            SecondaryWetTemp: ControlPeriph.temp4,

            bWindGateHighSpeed: ControlPeriph.bWindGateHighSpeed, // true - hi speed, false - low speed
            bBurningGateOn: ControlPeriph.CheckBurningGate(),     // true - on, false - off
            bVentOn: (ControlPeriph.VentAngle > 0.01) ? true : false,
            Voltage: ControlPeriph.ADC4 * 87.2,  // 电压值
            Date: new Date().getTime(),  // 当前时间

            HistoryCounter: 0,
            Status: 0,

            vGPRSSignalLevel: ControlPeriph.vGPRSSignal,
            vWifiSignalLevel: 0,

            Lattitude: 0,
            Longitude: 0,
        };

        const proc = new Promise((resolve, reject) => {
            Tool.printGreen("getTrapInfoAsync ==>");

            // LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
            //     if (err) {
            //         reject("NOK");
            //         return;
            //     }
            //     info = JSON.parse(JSON.stringify(o));
            //     resolve("OK");
            // });
            resolve("OK");

        }).then((val) => {
            return new Promise((resolve, reject) => {

                // obj.HistoryCounter = info.BakingInfo.HistoryCounter; //
                obj.HistoryCounter = RunningHandle.HistoryCounter;
                // obj.Status = info.SysInfo.bInRunning;
                obj.Status = this.runningStatus;

                // 根据实际的测试情况进行修改
                if (RunningHandle.bTempForUpperRack === true) {
                    obj.PrimaryDryTemp = ControlPeriph.temp4;
                    obj.PrimaryWetTemp = ControlPeriph.temp2;
                    obj.SecondaryDryTemp = ControlPeriph.temp1;
                    obj.SecondaryWetTemp = ControlPeriph.temp3;

                } else {
                    obj.PrimaryDryTemp = ControlPeriph.temp1;
                    obj.PrimaryWetTemp = ControlPeriph.temp3;
                    obj.SecondaryDryTemp = ControlPeriph.temp4;
                    obj.SecondaryWetTemp = ControlPeriph.temp2;

                }

                // check dry temp
                obj.DryTempAlarm = Alarm.checkDryTemp((this.runningStatus === RunningStatus.RUNNING), this.bakingCurve.getTempDryTarget(), obj.PrimaryDryTemp, obj.PrimaryWetTemp);

                // check wet temp
                obj.WetTempAlarm = Alarm.checkWetTemp((this.runningStatus === RunningStatus.RUNNING), this.bakingCurve.getTempWetTarget(), obj.PrimaryWetTemp, obj.PrimaryDryTemp);

                obj.VoltageLowAlarm = Alarm.checkVoltageLow(ControlPeriph.ADC4 * 87.2);

                obj.ACAlarmPhaseA = Alarm.checkPhaseA(ControlPeriph.ADC1,
                    ControlPeriph.ADC2,
                    ControlPeriph.ADC3);  // 缺相告警

                obj.ACAlarmPhaseB = 0;

                obj.ACAlarmPhaseC = 0;

                if (ControlPeriph.ADC1 < 0.03 && ControlPeriph.ADC2 < 0.03 && ControlPeriph.ADC3 < 0.03) {
                    obj.bWindGateHighSpeed = -1;
                }

                obj.GPRSAlarm = Alarm.checkGPRS();

                obj.GPSAlarm = Alarm.checkGPS();

                // 燃烧门的状态
                obj.bBurningGateOn = ControlPeriph.bBurningGateOn;
                // 风门状态
                obj.bVentOn = (ControlPeriph.VentAngle > 0.5) ? true : false;

                cb(null, obj);
                resolve("OK");

            });
        });
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

        LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
            if (err) {
                Tool.printRed("backupRunningStatus fail");
                return;
            }
            fs.writeFile(LocalStorage.getDataDirec() + this.bakingCurve.getNameOfHistoryCounter()
                + "/" + LocalStorage.getStatusFileName(), JSON.stringify(o), (err2) => {
                    if (err2) {
                        Tool.printRed("backupRunningStatus fail at 2nd step");
                    }
                });

        });

        // fs.writeFileSync(LocalStorage.getDataDirec() + this.bakingCurve.getNameOfHistoryCounter()
        //     + "/" + LocalStorage.getStatusFileName(), JSON.stringify(LocalStorage.loadBakingStatus()));
    }

    public ResetToDefault() {
        // check it's in waiting state
        if (this.runningStatus !== RunningStatus.WAITING) {
            Tool.printRed("Must be waiting state to reset to default");
            return;
        }

        // remove baking directory
        // fs.rmdirSync(LocalStorage.getRootDir());
        const deleteFolderRecursive = (path) => {
            let files = [];
            if (fs.existsSync(path)) {
                files = fs.readdirSync(path);
                files.forEach((file, index) => {
                    const curPath = path + "/" + file;
                    if (fs.lstatSync(curPath).isDirectory()) { // recurse
                        deleteFolderRecursive(curPath);
                    } else { // delete file
                        fs.unlinkSync(curPath);
                    }
                });
                fs.rmdirSync(path);
            }
        };
        Tool.printRed("Delete:" + LocalStorage.getRootDir());
        deleteFolderRecursive(LocalStorage.getRootDir());

        // Cause it to restart
        // throw new Error("Reset to Default State");
    }

    // add by yangjun 2018-3-16
    // for continue baking from cloud info
    // data is from commQT.emitter.on("get", (data:IfPacket))
    public fetchInfoFromCloudAsync(callback) {

        this.decoder.resumeRetry((err, stage, minutes, curve) => {
            if (err) {
                callback("Fail to fetch");
                return;
            }
            Tool.print("Info from cloud");
            Tool.print("stage:" + stage);
            Tool.print("minutes:" + (curve.durList[stage] * 60 - minutes));

            function saveContinueInfoFromCloud(curve, currentStage, currentStageRunningTime) {
                const info: IInfoCollect = LocalStorage.loadBakingStatusSync();
                info.RunningCurveInfo.CurrentStage = currentStage;
                info.RunningCurveInfo.CurrentStageRunningTime = currentStageRunningTime;
                info.RunningCurveInfo.TempCurveDryList = curve.dryList;
                info.RunningCurveInfo.TempCurveWetList = curve.wetList;
                info.RunningCurveInfo.TempDurationList = curve.durList;

                LocalStorage.saveBakingStatusSync(info);

                const stageInfo = {
                    CurrentStage: currentStage,
                    CurrentStageRunningTime: currentStageRunningTime, // 分钟
                };

                LocalStorage.saveCurrentStageSync(stageInfo);
                LocalStorage.saveCurrentStageBackupSync(stageInfo);
            }

            this.runningStatus = RunningStatus.PAUSED;
            this.bBakingFinished = false;

            saveContinueInfoFromCloud(curve, stage, (curve.durList[stage] * 60 - minutes) * 60);

            callback(undefined);
        });
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

        Tool.printYellow("\n===========CheckStatus()=========== " + this.runningStatus);

        if (this.bakingCurve.run() === false) {

            // Stop the baking
            this.stop();

            Tool.printYellow("######################### ");
            Tool.printYellow("BakingCurve work finished ");
            Tool.printYellow("######################### ");

            this.bBakingFinished = true;

            // stop the fire
            ControlPeriph.TurnOffBakingFire(() => {
                console.log("Stop the fire");
            });

            // stop the vent
            ControlPeriph.StopWindVent(() => {
                Tool.print("Stop the vent");
            });

            // This is a good time to save current baking curve to the data subdirectory
            // this.backupRunningStatus();

        } else {
            Tool.printYellow(" ------ BakingCurve is running -----");
        }
    }


}
