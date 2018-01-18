/**
 */
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
    public static bOnline: boolean; // 是否网络在线
    public decodeRegisterResponse: DecodePB;
    public decodeRecoProfile: DecodePB;
    public decodeProfile: DecodePB;
    public decodeBatchDetail: DecodePB;
    public decodeBatchSummary: DecodePB;
    public decodeBatchProfile: DecodePB;
    public decodeUpdateRequest: DecodePB;
    public decodeConfig: DecodePB;

    public appBaking: RunningHandle;
    public mqtt: MqttApp; // Mqtt Client
    public TOKEN: string;
    private client: HttpsApp; // https client
    private info: IfMachineInfo;
    private timer: NodeJS.Timer;
    private mqttTimer: NodeJS.Timer;
    private version: string;
    private data: IfConfigFile;

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

        this.appBaking = option.baking;

        ProtobufDecode.bOnline = false;
        this.mqtt = undefined;

        this.client = new HttpsApp(httpoption);
        this.timer = undefined;
        this.TOKEN = "";

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
            currentBatchId: "",
            batchStartTime: 0,
            loadWeatherTemperature: 0,
            loadWeatherHumidity: 0,
        };
    }

    public init(options): void {

        const proc = new Promise((resolve, reject) => {
            Tool.printGreen("Protobu decoder init()==>");

            // check token, network connectivity at the same time
            this.client.login(Tool.MachineSN, (err, buf) => {
                if (err) {
                    console.log(err);
                    reject("NONETWORK");
                    return;
                }
                // should I check the content of buf?
                console.log(buf.length);
                this.TOKEN = buf.toString();
                console.log("TOKEN:");
                Tool.printBlue(this.TOKEN);

                if (buf.length <= 16) {
                    console.log("Wrong TOKEN format");
                    reject("NONETWORK");
                } else {
                    resolve(this.TOKEN);
                }
            });

            // create mqtt client
        }).then((d) => {
            // read local storage for machine Info
            Tool.print("There is network, TOKEN:" + d);
            ProtobufDecode.bOnline = true;

            return new Promise((resolve, reject) => {
                if (fs.existsSync(LocalStorage.getMachineFile())) {
                    Tool.print("Machine Already exist: ");
                    // read out the machine info
                    fs.readFile(LocalStorage.getMachineFile(), (err, data1) => {
                        if (err) {
                            Tool.printRed("Read MachineInfo file fail");
                            reject("NOEXIST");
                            return;
                        }
                        let obj: any;
                        try {
                            obj = JSON.parse(data1.toString());
                            if (JSON.stringify(obj.mqttResponse) === "{}") {
                                throw new Error("wrong machineinfo format");
                            }
                        } catch (e) {
                            Tool.printRed("parse MachineInfo data error");
                            Tool.printRed(e);
                            reject("NOEXIST");
                            return;
                        }
                        this.info = JSON.parse(JSON.stringify(obj));
                        console.log(this.info);
                        resolve("OK");
                    });

                } else {
                    Tool.print("Not exist: ");
                    reject("NOEXIST");
                }
            });
        }, (d) => {
            ProtobufDecode.bOnline = false;
            Tool.printRed("There is no network");
            return Promise.reject(d);
        }).then((obj: any) => {
            return Promise.resolve(obj);
        }, (d: any) => {
            return new Promise((resolve, reject) => {
                if (d === "NONETWORK") {
                    reject(d);
                    return;
                }
                // register to the server
                this.client.register(Tool.MachineSN, this.TOKEN, (err, buf) => {
                    if (err) {
                        reject("NOK");
                        return;
                    }

                    if (buf.length <= 25) {
                        Tool.printRed("wrong register feedback " + buf.length);
                        reject("NOK");
                        return;
                    }

                    let objRegisterResponse: IfMqttResponse;
                    try {
                        objRegisterResponse = this.decodeRegisterResponse.decode(new Uint8Array(buf));
                    } catch (e) {
                        Tool.printRed("parse registerresponse data error");
                        Tool.printRed(e);

                        reject("NOK");
                        return;
                    }

                    const objAll = {
                        mqttResponse: objRegisterResponse,
                        currentBatchId: "",
                    };
                    // save it to local file
                    fs.writeFileSync(LocalStorage.getMachineFile(), JSON.stringify(objAll));
                    Tool.print("Save to machine file");
                    this.info = JSON.parse(JSON.stringify(objAll));
                    console.log("objAll");
                    console.log(objAll);
                    resolve("OK");
                });
            });
        }).then((obj: any) => {

            Tool.printBlue("Machine info");

            console.log(this.info);
            // create the mqtt client
            this.mqtt = new MqttApp({
                address: this.info.mqttResponse.mqttSslEndpoint,
                port: 1884,
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
        });

        /*
        .then((d) => {
            // backgorund work
            this.timer = setInterval(() => {
                this.client.login(Tool.MachineSN, (err, buf) => {
                    if (err) {
                        console.log(err);
                        ProtobufDecode.bOnline = false;
                        return;
                    }
                    ProtobufDecode.bOnline = true;
                    console.log(buf.length);
                    this.TOKEN = buf.toString();
                    Tool.printBlue(this.TOKEN);
                });
            }, 24 * 3600 * 1000);

            // 要根据工作状态来决定什么时候上报
            // this.mqttTimer = setInterval(() => {
            //     this.mqtt.updateReport();
            // }, 20000);
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
                const update = {
                    deviceId: this.info.mqttResponse.dyId,
                    appVersion: this.version,
                };
                this.client.updateConfig(this.decodeUpdateRequest.encode(update), this.TOKEN, (err, buf) => {
                    if (err) {
                        console.log(err);
                        ProtobufDecode.bOnline = false;
                        reject("NOK");
                        return;
                    }

                    ProtobufDecode.bOnline = true;
                    const config: any = this.decodeConfig.decode(new Uint8Array(buf));

                    console.log(config);
                    const types: IfTobaccoType[] = [];
                    const levels: IfQualityLevel[] = [];
                    const dryList: number[][] = [];
                    const wetList: number[][] = [];
                    const duringList: number[] = [];
                    // should it use '_'?
                    config.tobacco_type.forEach((element) => {
                        types.push({
                            name: element.name,
                            id: element.id,
                        });
                    });
                    config.quality_level.forEach((element) => {
                        levels.push({
                            name: element.name,
                            id: element.id,
                        });
                    });
                    config.default_curve.dry_list.forEach((element) => {
                        dryList.push([element.start_temperature, element.end_temperature]);
                    });
                    config.default_curve.wet_list.forEach((element) => {
                        wetList.push([element.start_temperature, element.end_temperature]);
                    });
                    config.default_curve.during_list.forEach((element) => {
                        duringList.push(element);
                    });
                    data.baking_config.quality_level = levels;
                    data.baking_config.tobacco_type = types;
                    data.baking_config.default_curve = {
                        dryList: dryList,
                        wetList: wetList,
                        durList: duringList,
                    };
                    data.baking_config.alarm_threshold.max_temp = config.alarm_threshold.max_temperature;
                    data.baking_config.alarm_threshold.min_temp = config.alarm_threshold.max_temperature;
                    data.baking_config.alarm_threshold.dry_temp_alarm_limit = config.alarm_threshold.dry_temperature_alarm_limit;
                    data.baking_config.alarm_threshold.dry_temp_alarm_period = config.alarm_threshold.dry_temperature_alarm_period;
                    data.baking_config.alarm_threshold.dry_temp_alarm_limit_2 = config.alarm_threshold.dry_temperature_alarm_limit2;
                    data.baking_config.alarm_threshold.dry_temp_alarm_period_2 = config.alarm_threshold.dry_temperature_alarm_period2;
                    data.baking_config.alarm_threshold.wet_temp_alarm_limit = config.alarm_threshold.wet_temperature_alarm_limit;
                    data.baking_config.alarm_threshold.wet_temp_alarm_period = config.alarm_threshold.wet_temperature_alarm_period;
                    data.baking_config.alarm_threshold.alarm_checking_period = config.alarm_threshold.alarm_checking_period;
                    data.baking_config.base_setting.AirFlowPattern = config.base_setting.airflow_pattern;
                    data.baking_config.base_setting.ControllerName = config.base_setting.controller_name;
                    data.baking_config.base_setting.GPSInfo.Latitude = ControlPeriph.gpsLatitude;
                    data.baking_config.base_setting.GPSInfo.Longitude = ControlPeriph.gpsLongitude;
                    data.baking_config.base_setting.InnerHeight = config.base_setting.inner_height;
                    data.baking_config.base_setting.LocName = config.base_setting.location_name;
                    data.baking_config.base_setting.WallMaterial = config.base_setting.wall_material;

                    AppConfig.setAppConfig(data);
                    if (config.update_tag === 1) {
                        this.client.updateApp(Tool.MachineSN, this.TOKEN, (err1, buf1) => {
                            console.log(err1);
                            ProtobufDecode.bOnline = false;
                            return;
                        });

                        ProtobufDecode.bOnline = true;
                    }
                });
            });
        }, (e) => {
            return new Promise((resolve, reject) => {
                console.log("End of promise");
            });
        });
    */
    }
    // bakingData: any
    public createBatch(): void {
        let data: IInfoCollect;

        Tool.printYellow("CreateBatch()");

        const proc = new Promise((resolve, reject) => {
            LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
                if (err) {
                    reject("NOK");
                    return;
                }
                data = JSON.parse(JSON.stringify(o));
                resolve("OK");
            });
        }).then((val) => {
            Tool.printGreen("Create batch");

            const currentTime: number = new Date().getTime();

            let type: string;
            let quality: string;
            this.info.batchStartTime = currentTime;

            this.info.loadWeatherTemperature = ControlPeriph.temp4;
            this.info.loadWeatherHumidity = ControlPeriph.temp2;

            // type to be added
            switch (data.BakingInfo.TobaccoType) {
                case 0:
                    type = "K326";
                    break;
                default:
                    type = "K326";
                    break;
            }
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

            const batch = {
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
                loadMaturityLv_0Percentage: data.BakingInfo.MaturePercent1,
                loadMaturityLv_1Percentage: data.BakingInfo.MaturePercent2,
                loadMaturityLv_2Percentage: data.BakingInfo.MaturePercent3,
                loadMaturityLv_3Percentage: data.BakingInfo.MaturePercent4,
                loadMaturityLv_4Percentage: data.BakingInfo.MaturePercent5,
            };

            console.log(batch);

            this.client.createBatch(this.decodeBatchDetail.encode(batch), this.TOKEN, (err, buf) => {
                if (err) {
                    console.log(err);
                    ProtobufDecode.bOnline = false;
                    return;
                }

                ProtobufDecode.bOnline = true;
                const batchSummary = this.decodeBatchSummary.decode(new Uint8Array(buf));
                Tool.printYellow("batchSummary:");
                console.log(batchSummary);
                this.info.currentBatchId = batchSummary.batchId;

                // save it to the machine.json, added by Yang
                LocalStorage.saveMachineInfo(this.info);

                return;
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
                }
                data = JSON.parse(JSON.stringify(o));
                resolve("OK");
            });
        }).then((val) => {
            Tool.printGreen("Update batch");

            let type: string;
            let quality: string;
            // type to be added
            switch (data.BakingInfo.TobaccoType) {
                case 0:
                    type = "K326";
                    break;
                default:
                    type = "K326";
                    break;
            }
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

            // after weights will be calculated from types
            const rating: any[] = [];
            resultData.forEach((element) => {
                let name: string;
                switch (element.level) {
                    case 0:
                        name = "优等";
                        break;
                    case 1:
                        name = "中等";
                        break;
                    case 2:
                        name = "下等";
                        break;
                    default:
                        name = "未评级";
                        break;
                }
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
                startTime: this.info.batchStartTime,
                endTime: new Date().getTime(),
                afterTopWeight: 0,
                afterMiddleWeight: 0,
                afterBottomWeight: 0,
                variety: type,
                barnAirflowDirection: data.BaseSetting.AirFlowPattern,
                barnWallTexture: data.BaseSetting.WallMaterial === 0 ? "板式" : "砖混",
                loadWeatherTemperature: this.info.loadWeatherTemperature,
                loadTopWeight: data.BakingInfo.UpperWeight,
                loadWeatherHumidity: this.info.loadWeatherHumidity,
                loadMiddleWeight: data.BakingInfo.MiddleWeight,
                loadBottomWeight: data.BakingInfo.LowerWeight,
                loadTool: data.BakingInfo.LoadingMethod === 1 ? "烟竿" : "烟夹",
                loadToolCount: data.BakingInfo.PieceQuantity.toString(),
                loadToolWeight: data.BakingInfo.PieceWeight.toString(),
                loadQuality: quality,
                loadMaturityLv_0Percentage: data.BakingInfo.MaturePercent1,
                loadMaturityLv_1Percentage: data.BakingInfo.MaturePercent2,
                loadMaturityLv_2Percentage: data.BakingInfo.MaturePercent3,
                loadMaturityLv_3Percentage: data.BakingInfo.MaturePercent4,
                loadMaturityLv_4Percentage: data.BakingInfo.MaturePercent5,
            };

            console.log(batch);
            this.client.updateBatch(this.decodeBatchDetail.encode(batch), this.TOKEN, (err, buf) => {
                if (err) {
                    console.log(err);
                    ProtobufDecode.bOnline = false;
                    return;
                }

                ProtobufDecode.bOnline = true;
                return;
            });
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

            let type: string;
            let quality: string;
            // type to be added
            switch (data.BakingInfo.TobaccoType) {
                case 0:
                    type = "K326";
                    break;
                default:
                    type = "K326";
                    break;
            }
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
                loadWeatherTemperature: this.info.loadWeatherTemperature,
                loadTopWeight: data.BakingInfo.UpperWeight,
                loadWeatherHumidity: this.info.loadWeatherHumidity,
                loadMiddleWeight: data.BakingInfo.MiddleWeight,
                loadBottomWeight: data.BakingInfo.LowerWeight,
                loadTool: data.BakingInfo.LoadingMethod === 1 ? "烟竿" : "烟夹",
                loadToolCount: data.BakingInfo.PieceQuantity,
                loadToolWeight: data.BakingInfo.PieceWeight.toString(),
                loadQuality: quality,
                loadMaturityLv_0Percentage: data.BakingInfo.MaturePercent1,
                loadMaturityLv_1Percentage: data.BakingInfo.MaturePercent2,
                loadMaturityLv_2Percentage: data.BakingInfo.MaturePercent3,
                loadMaturityLv_3Percentage: data.BakingInfo.MaturePercent4,
                loadMaturityLv_4Percentage: data.BakingInfo.MaturePercent5,
            };

            this.client.getRecoProfile(this.decodeRecoProfile.encode(profileRequest), this.TOKEN, (err, buf) => {
                if (err) {
                    console.log(err);
                    ProtobufDecode.bOnline = false;
                    callback("network error", null);
                    return;
                }

                ProtobufDecode.bOnline = true;
                const profile: any = this.decodeProfile.decode(new Uint8Array(buf));
                console.log(profile);
                const items: any[] = profile.items;

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
                };
                callback(null, curve);
            });
        });
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
                ProtobufDecode.bOnline = false;
                return;
            }

            ProtobufDecode.bOnline = true;
            return;
        });
    }

    public fake() {
        console.log("to get the cloud curve");
    }
}
