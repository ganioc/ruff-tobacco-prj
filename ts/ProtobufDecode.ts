import * as fs from "fs";
import { Promise } from "promise";
import { DecodePB } from "./DecodePB";
import { MqttApp } from "./MqttApp";
import { Tool } from "./utility";
import { AppConfig } from "./AppConfig";
import { LocalStorage } from "./LocalStorage";
import { HttpsApp, IfHttpsApp } from "./HttpsApp";
import { IfMachineInfo, IfMqttResponse, IfTobaccoType, IfQualityLevel } from "./BakingCfg";
import { setInterval } from "timers";
import { RunningHandle } from "./BakingProc";
import {
    IBakingInfo, IBaseSetting, IDefaultCurve, IInfoCollect,
    IResultInfo, IRunningCurveInfo, IRunningOption, ISettingCurveInfo,
    ISysInfo,
    ITrapBaking,
    ITrapInfo,
    RunningStatus,
    IfConfigFile,
} from "./BakingCfg";
import { ControlPeriph } from "./ControlPeripheral";
import * as util from "util";

const protoFile = __dirname + "/../data/awesome.proto";

const httpoption: IfHttpsApp = {
    hostname: "api.shdingyun.com",
    port: 443,
};

export class ProtobufDecode {
    public decodeRegisterResponse: DecodePB;
    public decodeRecoProfile: DecodePB;
    public decodeProfile: DecodePB;
    public decodeBatchDetail: DecodePB;
    public decodeBatchSummary: DecodePB;
    public decodeBatchProfile: DecodePB;
    public decodeUpdateRequest: DecodePB;
    public decodeConfig: DecodePB;
    public decodeScoredProfile: DecodePB;
    public decodeResume: DecodePB;
    public decodeAlertDetail: DecodePB;
    public decodeQRCode: DecodePB;

    public appBaking: RunningHandle;
    public mqtt: MqttApp; // Mqtt Client
    public TOKEN: string;
    private client: HttpsApp; // https client
    private info: IfMachineInfo;
    private timer: NodeJS.Timer;
    private mqttTimer: NodeJS.Timer;
    private version: string;
    private data: IfConfigFile;
    private updateTag: boolean;
    private alarmTags: boolean[];
    private batchProfile: any;
    private batchInfo: any;

    constructor(option) {
        this.decodeRegisterResponse = new DecodePB({
            path: protoFile,
            className: "awesomepackage.RegisterResponse",
        });

        this.decodeRecoProfile = new DecodePB({
            path: protoFile,
            className: "awesomepackage.RecoProfileRequest",
        });

        this.decodeProfile = new DecodePB({
            path: protoFile,
            className: "awesomepackage.Profile",
        });

        this.decodeBatchDetail = new DecodePB({
            path: protoFile,
            className: "awesomepackage.BatchDetail",
        });

        this.decodeBatchSummary = new DecodePB({
            path: protoFile,
            className: "awesomepackage.BatchSummary",
        });

        this.decodeBatchProfile = new DecodePB({
            path: protoFile,
            className: "awesomepackage.BatchProfile",
        });

        this.decodeUpdateRequest = new DecodePB({
            path: protoFile,
            className: "awesomepackage.UpdateRequest",
        });

        this.decodeProfile = new DecodePB({
            path: protoFile,
            className: "awesomepackage.Profile",
        });

        this.decodeConfig = new DecodePB({
            path: protoFile,
            className: "awesomepackage.Config",
        });

        this.decodeScoredProfile = new DecodePB({
            path: protoFile,
            className: "awesomepackage.ScoredProfile",
        });

        this.decodeResume = new DecodePB({
            path: protoFile,
            className: "awesomepackage.ResumeResponse",
        });

        this.decodeAlertDetail = new DecodePB({
            path: protoFile,
            className: "awesomepackage.AlertDetail",
        });

        this.decodeQRCode = new DecodePB({
            path: protoFile,
            className: "awesomepackage.DeviceQRCodeDetail",
        });

        this.appBaking = option.baking;
        this.alarmTags = [];
        for (let i = 0; i < 10; i++) {
            this.alarmTags.push(true);
        }

        this.mqtt = undefined;

        this.client = new HttpsApp(httpoption);
        this.timer = undefined;
        this.TOKEN = "undefined";

        this.info = {
            mqttResponse: {
                imei: "",
                dyId: "",
                dypassword: "",
                mqttTcpEndpoint: "",
                mqttSslEndpoint: "",
                mqttWssEndpoint: "",
                mqttUsername: "",
                mqttKey: "",
            },
            currentBatchId: 0,
        };
    }

    public init(): void {

        const proc = new Promise((resolve, reject) => {
            Tool.printGreen("Protobu decoder init()==>");

            // register to the server
            Tool.print("Register to network");
            this.client.register(Tool.MachineSN, this.TOKEN, (err, buf) => {
                if (err) {
                    reject("NOK");
                } else if (buf.length <= 25) {
                    Tool.printRed("Wrong register fb length:" + buf.length);
                    reject("NOK");
                } else {
                    let objRegisterResponse: IfMqttResponse;
                    let bError = false;
                    try {
                        objRegisterResponse = this.decodeRegisterResponse.decode(new Uint8Array(buf));
                    } catch (e) {
                        Tool.printRed("parse registerresponse data error");
                        Tool.printRed(e);

                        bError = true;
                    }
                    if (bError) {
                        reject("NOK");
                    } else {
                        const objAll: IfMachineInfo = {
                            mqttResponse: objRegisterResponse,
                            currentBatchId: 0,
                        };
                        // save it to local file
                        fs.writeFileSync(LocalStorage.getMachineFile(), JSON.stringify(objAll));
                        Tool.print("Save to machine file");
                        this.info = JSON.parse(JSON.stringify(objAll));
                        console.log("objAll");
                        console.log(objAll);
                        resolve("OK");
                    }
                }
            });
        }).then((obj: any) => {
            Tool.printBlue("Intermediate OK");
            return Promise.resolve(obj);
        }, (d: any) => {
            return new Promise((resolve, reject) => {
                // read local storage for machine Info
                let bError = false;

                if (fs.existsSync(LocalStorage.getMachineFile())) {
                    Tool.print("Machine Already exist: ");
                    // read out the machine info
                    fs.readFile(LocalStorage.getMachineFile(), (err, data1) => {
                        if (err) {
                            Tool.printRed("Read MachineInfo file fail");
                            reject("NOEXIST");

                        } else {
                            let obj: any;
                            try {
                                obj = JSON.parse(data1.toString());
                                if (JSON.stringify(obj.mqttResponse) === "{}" || obj.mqttResponse.dyId === "") {
                                    throw new Error("wrong machineinfo format");
                                }
                            } catch (e) {
                                Tool.printRed("parse MachineInfo data error");
                                Tool.printRed(e);
                                bError = true;
                            }
                            if (bError) {
                                reject("NOEXIST");
                            } else {
                                this.info = JSON.parse(JSON.stringify(obj));
                                console.log(this.info);
                                resolve("OK");
                            }
                        }
                    });
                } else {
                    Tool.print("Machine info Not exist: ");
                    reject("NOEXIST");
                }
            });
        }).then((obj: any) => {
            return new Promise((resolve, reject) => {
                const data = {
                    id: this.info.mqttResponse.dyId,
                    password: this.info.mqttResponse.dypassword,
                };
                this.client.login(JSON.stringify(data), Tool.MachineSN, (err, buf) => {
                    if (err) {
                        Tool.printRed("login failure:");
                        console.log(err);
                    } else {
                        this.TOKEN = buf.toString();
                        console.log("TOKEN:");
                        Tool.printBlue(this.TOKEN);

                        if (buf.length <= 16) {
                            console.log("Wrong TOKEN format");
                        } else {
                            resolve(this.TOKEN);
                        }
                    }
                });
            })
        }).then((obj: any) => {

            Tool.printBlue("Machine info");
            console.log(this.info);
            // create the mqtt client
            this.mqtt = new MqttApp({
                address: this.info.mqttResponse.mqttTcpEndpoint,
                port: 1883,
                name: this.info.mqttResponse.mqttUsername,
                key: this.info.mqttResponse.mqttKey,
                clientId: this.info.mqttResponse.dyId,
                baking: this.appBaking,
            });
            this.mqtt.start();

            return Promise.resolve("OK");
        }).then((d) => {
            console.log("happy ending");
        }, (error) => {
            console.log("wrong ending");
        }).then((d) => {
            // background work
            this.timer = setInterval(() => {
                const data = {
                    id: this.info.mqttResponse.dyId,
                    password: this.info.mqttResponse.dypassword,
                };
                this.client.login(JSON.stringify(data), Tool.MachineSN, (err, buf) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log(buf.length);
                    this.TOKEN = buf.toString();
                    Tool.printBlue(this.TOKEN);
                });
            }, 24 * 3600 * 1000);

            // 要根据工作状态来决定什么时候上报
            this.mqttTimer = setInterval(() => {
                if (this.mqtt === undefined) {
                    return;
                }
                console.log("app status: " + this.appBaking.runningStatus);
                if (this.appBaking.runningStatus === RunningStatus.RUNNING || this.appBaking.runningStatus === RunningStatus.PAUSED) {
                    this.mqtt.updateReport(true);
                } else {
                    this.mqtt.updateReport(false);
                }
            }, 60000);
        }).then((d) => {
            return new Promise((resolve, reject) => {
                LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
                    if (err) {
                        reject("NOK");
                        return;
                    }
                    const infoCollect: IInfoCollect = JSON.parse(JSON.stringify(o));
                    this.version = infoCollect.SysInfo.AppVersion;
                    resolve("OK");
                });
            });
        }).then((d) => {
            return new Promise((resolve, reject) => {
                this.data = AppConfig.getAppConfig();
                resolve("OK");
            });
        }).then((d) => {
            return new Promise((resolve, reject) => {
                this.updateConfig((err) => {
                    if (err) {
                        this.updateConfig((err1) => {
                            if (err1) {
                                this.updateConfig(() => { });
                            }
                        })
                    }
                });
            });
        }, (e) => {
            return new Promise((resolve, reject) => {
                console.log("End of promise");
            });
        });
    }

    public updateConfig(callback: (err?: Error) => void): void {

        const update = {
            deviceId: this.info.mqttResponse.dyId,
            appVersion: LocalStorage.getAppVersion(),
        };
        this.client.updateConfig(this.decodeUpdateRequest.encode(update), this.TOKEN, (err, buf) => {
            if (err) {
                console.log(err);
                return;
            }
            const config: any = this.decodeConfig.decode(new Uint8Array(buf));
            console.log(config);

            if (JSON.stringify(config) === "{}" || config.tobaccoType === undefined) {
                callback(new Error("Update config retry..."));
                return;
            }

            const types: IfTobaccoType[] = [];
            const levels: IfQualityLevel[] = [];
            const curves: {
                dryList: number[][],
                wetList: number[][],
                durList: number[],
            }[] = [];
            config.tobaccoType.forEach((element) => {
                types.push({
                    name: element.name,
                    id: element.id === undefined ? 0 : element.id,
                });
            });
            config.qualityLevel.forEach((element) => {
                levels.push({
                    name: element.name,
                    id: element.id === undefined ? 0 : element.id,
                });
            });
            config.defaultCurve.forEach((curve) => {
                const dryList: number[][] = [];
                const wetList: number[][] = [];
                const duringList: number[] = [];
                curve.dryList.forEach((drytemp) => {
                    dryList.push([drytemp.startTemperature, drytemp.endTemperature]);
                });
                curve.wetList.forEach((wettemp) => {
                    wetList.push([wettemp.startTemperature, wettemp.endTemperature]);
                });
                curve.duringList.forEach((time) => {
                    duringList.push(time);
                });
                curves.push({
                    dryList: dryList,
                    wetList: wetList,
                    durList: duringList,
                });
            });

            this.data.baking_config.quality_level = levels;
            this.data.baking_config.tobacco_type = types;
            this.data.baking_config.default_curves = curves;
            this.data.baking_config.alarm_threshold.max_temp = config.alarmThreshold.maxTemperature;
            this.data.baking_config.alarm_threshold.min_temp = config.alarmThreshold.maxTemperature;
            this.data.baking_config.alarm_threshold.dry_temp_alarm_limit = config.alarmThreshold.dryTemperatureAlarmLimit;
            this.data.baking_config.alarm_threshold.dry_temp_alarm_period = config.alarmThreshold.dryTemperatureAlarmPeriod;
            this.data.baking_config.alarm_threshold.dry_temp_alarm_limit_2 = config.alarmThreshold.dryTemperatureAlarmLimit2;
            this.data.baking_config.alarm_threshold.dry_temp_alarm_period_2 = config.alarmThreshold.dryTemperatureAlarmPeriod2;
            this.data.baking_config.alarm_threshold.wet_temp_alarm_limit = config.alarmThreshold.wetTemperatureAlarmLimit;
            this.data.baking_config.alarm_threshold.wet_temp_alarm_period = config.alarmThreshold.wetTemperatureAlarmPeriod;
            this.data.baking_config.alarm_threshold.alarm_checking_period = config.alarmThreshold.alarmCheckingPeriod;

            // 默认的参数曲线不能够随便存的。
            AppConfig.setAppConfig(this.data);
            LocalStorage.updateDefaultCurves();
            this.updateTag = config.updateTag === 1 ? true : false;

        });
    }

    public getUpdateTag(): boolean {
        return this.updateTag;
    }

    public update() {
        this.client.updateApp(this.info.mqttResponse.dyId, this.TOKEN, (err, buf) => {
            console.log(err);
            return;
        });
    }

    public saveBatch(): void {
        let data: IInfoCollect;

        Tool.printYellow("CreateBatch()");

        const proc = new Promise((resolve, reject) => {
            LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
                if (err) {
                    reject("NOK");
                    return;
                } else {
                    data = JSON.parse(JSON.stringify(o));
                    resolve("OK");
                }

            });
        }).then((val) => {
            const currentTime: number = new Date().getTime();

            let type: string = this.data.baking_config.tobacco_type[data.BakingInfo.TobaccoType].name;
            let quality: string;

            switch (data.BakingInfo.Quality) {
                case 0:
                    quality = "优";
                    break;
                case 1:
                    quality = "良";
                    break;
                case 2:
                    quality = "中";
                    break;
                case 3:
                    quality = "差";
                    break;
                default:
                    quality = "未填写";
                    break;
            }

            this.batchInfo = {
                batchId: 0,
                deviceId: this.info.mqttResponse.dyId,
                startTime: new Date().getTime(),
                endTime: new Date().getTime(),
                variety: type,
                barnAirflowDirection: data.BaseSetting.AirFlowPattern,
                barnWallTexture: data.BaseSetting.WallMaterial === 0 ? "板式" : "砖混",
                loadWeatherTemperature: ControlPeriph.temp4, // top_dry_bulb_temp
                loadTopWeight: data.BakingInfo.UpperWeight,
                loadWeatherHumidity: ControlPeriph.temp2, // top_wet_bulb_temp
                loadMiddleWeight: data.BakingInfo.MiddleWeight,
                loadBottomWeight: data.BakingInfo.LowerWeight,
                loadTool: data.BakingInfo.LoadingMethod === 1 ? "烟竿" : "烟夹",
                loadToolCount: data.BakingInfo.PieceQuantity.toString(),
                loadToolWeight: data.BakingInfo.PieceWeight.toString(),
                loadQuality: quality,
                loadMaturityLv_0Percentage: data.BakingInfo.MaturePercent3,
                loadMaturityLv_1Percentage: data.BakingInfo.MaturePercent2,
                loadMaturityLv_2Percentage: data.BakingInfo.MaturePercent1,
                loadMaturityLv_3Percentage: data.BakingInfo.MaturePercent4,
                loadMaturityLv_4Percentage: data.BakingInfo.MaturePercent5,
            };
        });
    }

    // bakingData: any
    public createBatch(): void {

        Tool.printYellow("CreateBatch()");

        console.log(this.batchInfo);

        this.client.createBatch(this.decodeBatchDetail.encode(this.batchInfo), this.TOKEN, (err, buf) => {
            if (err) {
                console.log(err);
                return;
            }

            const batchSummary = this.decodeBatchSummary.decode(new Uint8Array(buf));
            Tool.printYellow("batchSummary:");
            console.log(batchSummary);
            this.info.currentBatchId = batchSummary.batchId;

            // save it to the machine.json, added by Yang
            LocalStorage.saveMachineInfo(this.info);

            Tool.printGreen("Create profile");
            this.batchProfile.batchId = this.info.currentBatchId;
            console.log(this.batchProfile);

            this.client.updateProfile(this.decodeBatchProfile.encode(this.batchProfile), this.TOKEN, (err, buf) => {
                if (err) {
                    console.log(err);
                }
            });
        });
    }

    public updateBatch(resultData: any) {
        let data: IInfoCollect;
        const proc = new Promise((resolve, reject) => {
            LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
                if (err) {
                    reject("NOK");
                    return;
                } else {
                    data = JSON.parse(JSON.stringify(o));
                    resolve("OK");
                }

            });
        }).then((val) => {
            Tool.printGreen("Update batch");

            let type: string = this.data.baking_config.tobacco_type[data.BakingInfo.TobaccoType].name;
            let quality: string;
            switch (data.BakingInfo.Quality) {
                case 0:
                    quality = "优";
                    break;
                case 1:
                    quality = "良";
                    break;
                case 2:
                    quality = "中";
                    break;
                case 3:
                    quality = "差";
                    break;
                default:
                    quality = "未填写";
                    break;
            }

            const rating: any[] = [];
            resultData.forEach((element) => {
                let name: string = this.data.baking_config.quality_level[element.level].name;
                if (element.weight !== 0) {
                    rating.push({
                        rating: name,
                        weight: element.weight,
                    });
                }
            });
            const batch = {
                batchId: this.info.currentBatchId,
                deviceId: this.info.mqttResponse.dyId,
                ratings: rating,
                startTime: 0,
                endTime: new Date().getTime(),
                afterTopWeight: 0,
                afterMiddleWeight: 0,
                afterBottomWeight: 0,
                variety: type,
                barnAirflowDirection: data.BaseSetting.AirFlowPattern,
                barnWallTexture: data.BaseSetting.WallMaterial === 0 ? "板式" : "砖混",
                loadWeatherTemperature: 0,
                loadTopWeight: data.BakingInfo.UpperWeight,
                loadWeatherHumidity: 0,
                loadMiddleWeight: data.BakingInfo.MiddleWeight,
                loadBottomWeight: data.BakingInfo.LowerWeight,
                loadTool: data.BakingInfo.LoadingMethod === 1 ? "烟竿" : "烟夹",
                loadToolCount: data.BakingInfo.PieceQuantity.toString(),
                loadToolWeight: data.BakingInfo.PieceWeight.toString(),
                loadQuality: quality,
                loadMaturityLv_0Percentage: data.BakingInfo.MaturePercent3,
                loadMaturityLv_1Percentage: data.BakingInfo.MaturePercent2,
                loadMaturityLv_2Percentage: data.BakingInfo.MaturePercent1,
                loadMaturityLv_3Percentage: data.BakingInfo.MaturePercent4,
                loadMaturityLv_4Percentage: data.BakingInfo.MaturePercent5,
            };

            console.log(batch);
            this.client.updateBatch(this.decodeBatchDetail.encode(batch), this.TOKEN, (err, buf) => {
                if (err) {
                    console.log(err);
                }
            });
        });
    }

    public getRecoProfileRetry(callback: (err, d: any) => void) {
        this.getRecoProfile((err, d) => {
            if (err) {
                this.getRecoProfile((err1, d1) => {
                    if (err1) {
                        this.getRecoProfile((err2, fb2) => {
                            if (err2) {
                                callback(err2, null);
                                return;
                            }
                            callback(null, fb2);
                        });
                        return;
                    }
                    callback(null, d1)
                });
                return;
            }
            callback(null, d);
        });
    }

    public getRecoProfile(callback: (err, d: any) => void) {
        let data: IInfoCollect;
        const proc = new Promise((resolve, reject) => {
            LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
                if (err) {
                    reject("NOK");
                    callback("error", null);
                    return;
                }
                data = JSON.parse(JSON.stringify(o));
                resolve("OK");
            });
        }).then((val) => {
            Tool.printGreen("Get recommend profile");

            let type: string = this.data.baking_config.tobacco_type[data.BakingInfo.TobaccoType].name;
            let quality: string;
            switch (data.BakingInfo.Quality) {
                case 0:
                    quality = "优";
                    break;
                case 1:
                    quality = "良";
                    break;
                case 2:
                    quality = "中";
                    break;
                case 3:
                    quality = "差";
                    break;
                default:
                    quality = "未填写";
                    break;
            }

            const profileRequest = {
                batchId: this.info.currentBatchId,
                deviceId: this.info.mqttResponse.dyId,
                variety: type,
                barnAirflowDirection: data.BaseSetting.AirFlowPattern,
                barnWallTexture: data.BaseSetting.WallMaterial === 0 ? "板式" : "砖混",
                loadWeatherTemperature: ControlPeriph.temp4,
                loadTopWeight: data.BakingInfo.UpperWeight,
                loadWeatherHumidity: ControlPeriph.temp2,
                loadMiddleWeight: data.BakingInfo.MiddleWeight,
                loadBottomWeight: data.BakingInfo.LowerWeight,
                loadTool: data.BakingInfo.LoadingMethod === 1 ? "烟竿" : "烟夹",
                loadToolCount: data.BakingInfo.PieceQuantity,
                loadToolWeight: data.BakingInfo.PieceWeight.toString(),
                loadQuality: quality,
                loadMaturityLv_0Percentage: data.BakingInfo.MaturePercent3,
                loadMaturityLv_1Percentage: data.BakingInfo.MaturePercent2,
                loadMaturityLv_2Percentage: data.BakingInfo.MaturePercent1,
                loadMaturityLv_3Percentage: data.BakingInfo.MaturePercent4,
                loadMaturityLv_4Percentage: data.BakingInfo.MaturePercent5,
            };
            console.log(profileRequest);

            this.client.getRecoProfile(this.decodeRecoProfile.encode(profileRequest), this.TOKEN, (err, buf) => {
                if (err) {
                    console.log(err);
                    callback("network error", null);
                    return;
                }

                const profile: any = this.decodeScoredProfile.decode(new Uint8Array(buf));
                console.log(profile);
                if (JSON.stringify(profile) === "{}" || profile.series === undefined) {
                    callback("Parse error", null);
                    return;
                }
                const distance = profile.distance;
                const score = profile.score;
                const items: any[] = profile.series.items;

                const curveDryList: number[][] = [];
                const curveWetList: number[][] = [];
                const curvedurList: number[] = [];

                for (let i = 0; i < items.length; i++) {
                    if (i === 0) {
                        curveDryList.push([items[0].targetDryBulbTemp, items[0].targetDryBulbTemp]);
                        curveWetList.push([items[0].targetWetBulbTemp, items[0].targetWetBulbTemp]);
                        curvedurList.push(items[0].minutes / 60);
                    } else {
                        curveDryList.push([items[i - 1].targetDryBulbTemp, items[i].targetDryBulbTemp]);
                        curveWetList.push([items[i - 1].targetWetBulbTemp, items[i].targetWetBulbTemp]);
                        curvedurList.push(items[i].minutes / 60);
                    }
                }
                const curve = {
                    Index: 0,
                    NumOfCurves: 1,
                    TempCurveDryList: curveDryList,
                    TempCurveWetList: curveWetList,
                    TempDurationList: curvedurList,
                    score: score,
                };
                callback(null, curve);
            });
        });
    }

    public saveProfile(data: any) {
        const items: any[] = [];
        for (let i = 0; i < data.TempDurationList.length; i++) {
            items.push({
                targetDryBulbTemp: data.TempCurveDryList[i][1],
                targetWetBulbTemp: data.TempCurveWetList[i][1],
                minutes: data.TempDurationList[i] * 60,
            });
        }
        const profile = {
            items: items,
        };
        this.batchProfile = {
            batchId: this.info.currentBatchId,
            deviceId: this.info.mqttResponse.dyId,
            profile: profile,
        };
    }

    public updateProfile(data: any) {
        Tool.printGreen("Update profile");

        const items: any[] = [];
        for (let i = 0; i < data.TempDurationList.length; i++) {
            items.push({
                targetDryBulbTemp: data.TempCurveDryList[i][1],
                targetWetBulbTemp: data.TempCurveWetList[i][1],
                minutes: data.TempDurationList[i] * 60,
            });
        }
        const profile = {
            items: items,
        };
        const batchProfile = {
            batchId: this.info.currentBatchId,
            deviceId: this.info.mqttResponse.dyId,
            profile: profile,
        };
        console.log(items);
        console.log(batchProfile);

        this.client.updateProfile(this.decodeBatchProfile.encode(batchProfile), this.TOKEN, (err, buf) => {
            if (err) {
                console.log(err);
            }
        });
    }

    public fake() {
        console.log("to get the cloud curve");
    }

    public resumeRetry(callback: (err, stage, minutes, curve) => void) {
        this.resume((err, stage, minutes, curve) => {
            if (err) {
                this.resume((err1, stage1, minutes1, curve1) => {
                    if (err1) {
                        this.resume((err2, stage2, minutes2, curve2) => {
                            if (err2) {
                                callback(err2, 0, 0, null);
                                return;
                            }
                            callback(null, stage2, minutes2, curve2);
                        });
                        return;
                    }
                    callback(null, stage1, minutes1, curve1)
                });
                return;
            }
            callback(null, stage, minutes, curve);
        });
    }


    public resume(callback: (err, stage, minutes, curve) => void) {
        Tool.printGreen("Cloud resume stat");

        this.client.resume(this.info.mqttResponse.dyId, this.TOKEN, (err, buf) => {
            if (err) {
                console.log(err);
                callback(err, 0, 0, null);
                return;
            }

            const resumeStat = this.decodeResume.decode(new Uint8Array(buf))
            console.log(resumeStat);
            if (JSON.stringify(resumeStat) == "{}" || resumeStat.profile === undefined) {
                callback("protobuf err", 0, 0, null);
                return;
            }
            const stage: number = resumeStat.stage === undefined ? 0 : resumeStat.stage;
            const minutes: number = resumeStat.remainMinutes === undefined ? 0 : resumeStat.remainMinutes;
            const items: any[] = resumeStat.profile.items;
            const curveDryList: number[][] = [];
            const curveWetList: number[][] = [];
            const curvedurList: number[] = [];

            for (let i = 0; i < items.length; i++) {
                if (i === 0) {
                    curveDryList.push([items[0].targetDryBulbTemp, items[0].targetDryBulbTemp]);
                    curveWetList.push([items[0].targetWetBulbTemp, items[0].targetWetBulbTemp]);
                    curvedurList.push(items[0].minutes / 60);
                } else {
                    curveDryList.push([items[i - 1].targetDryBulbTemp, items[i].targetDryBulbTemp]);
                    curveWetList.push([items[i - 1].targetWetBulbTemp, items[i].targetWetBulbTemp]);
                    curvedurList.push(items[i].minutes / 60);
                }
            }
            const curve = {
                dryList: curveDryList,
                wetList: curveWetList,
                durList: curvedurList,
            };

            callback(null, stage, minutes, curve);
        })
    }

    public stop() {
        Tool.printGreen("Cloud stop state");

        this.client.stop(this.info.mqttResponse.dyId, this.TOKEN, (err, buf) => {
            if (err) {
                console.log(err);
                return;
            }
        })
    }

    public alarm(type, wet, dry, target, alarmTag) {
        if (this.info.mqttResponse.dyId === "" || this.TOKEN.length < 15) {
            return;
        }
        let report: boolean;
        let reportType;
        let detail;
        if (alarmTag === true && this.alarmTags[type] === true) {
            report = true;
            this.alarmTags[type] = false;
        } else if (alarmTag === true && this.alarmTags[type] === false) {
            report = false;
        } else if (alarmTag === false && this.alarmTags[type] === true) {
            report = false;
        } else if (alarmTag === false && this.alarmTags[type] === false) {
            report = false;
            this.alarmTags[type] = true;
        }
        if (report === true) {
            switch (type) {
                case 1:
                    reportType = "HumidityExceed";
                    detail = {
                        type: "wet_exceed",
                        dry_temperature: dry,
                        wet_temperature: wet,
                    }
                    break;
                case 2:
                    reportType = "TemperatureLimit";
                    detail = {
                        type: "dry_limit",
                        actual_temperature: dry,
                    }
                    break;
                case 3:
                    reportType = "Temperature2";
                    detail = {
                        type: "dry_deviation",
                        target_temperature: target,
                        actual_temperature: dry,
                    }
                    break;
                case 4:
                    reportType = "Temperature4";
                    detail = {
                        type: "dry_deviation",
                        target_temperature: target,
                        actual_temperature: dry,
                    }
                    break;
                case 5:
                    reportType = "HumidityLimit";
                    detail = {
                        type: "wet_limit",
                        actual_temperature: wet,
                    }
                    break;
                case 6:
                    reportType = "Humidity2";
                    detail = {
                        type: "wet_deviation",
                        target_temperature: target,
                        actual_temperature: wet,
                    }
                    break;
                case 7:
                    reportType = "Voltage";
                    detail = {
                        type: "voltage",
                        voltage: wet,
                    }
                    break;
                case 8:
                    reportType = "PhaseLost";
                    detail = {
                        type: "phase_lost",
                    }
                    break;
                case 9:
                    reportType = "Overload";
                    detail = {
                        type: "overload",
                    }
                    break;
            }
            const data = {
                alertId: 0,
                deviceId: this.info.mqttResponse.dyId,
                type: reportType,
                triggerTime: 0,
                resolveTime: 0,
                lastAlertTime: 0,
                state: "ALERT",
                detail: JSON.stringify(detail),
            }
            this.client.alert(this.decodeAlertDetail.encode(data), this.TOKEN, (err, buf) => {
                if (err) {
                    console.log(err);
                }
            });
        }
    }

    public getId(): string {
        if (Tool.readMachineSNFromRuffd() === "")
            return "NOK";
        const data = {
            deviceId: Tool.readMachineSNFromRuffd(),
        }
        const bytes: Uint8Array = this.decodeQRCode.encode(data);
        return new Buffer(bytes).toString("base64");
    }
}
