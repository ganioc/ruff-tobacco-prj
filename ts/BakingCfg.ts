/**
 */

export enum ObjType {
    SysInfo = 10,
    SettingCurveInfo,
    RunningCurveInfo,
    ResultInfo,
    TrapInfo,
    RunningState,
    BakingInfo,
    BaseSetting,
    TrapBaking,
    TrapUpdateCurve,
    TrapYesNo,  // 20
    CloudCurveInfo, // 21
    UDisk, // 22
}

export enum BakingType {
    SEGMENT = 1,
    SLOPE,
}
export enum MoistureProperty {
    DRY = 10,
    WET,
}
export enum RunningStatus {
    WAITING = 1, // no baking parameters loaded
    // you can set sys info here
    PAUSED,  // baking parameters loaded, not running yet
    // you can change parameters at any time
    RUNNING, // baking according to temp Curve
    STOPPED, // finished baking,
    // need to be transfered to waiting
}

export interface IDefaultCurve {
    dryList: number[][];
    wetList: number[][];
    durList: number[];
}
// confirmed by XX
export interface ISysInfo {
    Date: number; // Current Time
    bInRunning: number; //
    bTempForUpperRack: boolean; //
    HistoryCounter: number; // Running Batch ID
    // TobaccoType: string; // 烟叶种类
    AppVersion: string;
    UIVersion: string;
    TobaccoType: IfTobaccoType[];
    QualityLevel: IfQualityLevel[];
}
export interface IGPSInfo {
    Longitude: number;
    Latitude: number;
}
// confirmed by XX
export interface IBaseSetting {
    GPSInfo: IGPSInfo;               // Longitude , Altitude
    AirFlowPattern: string;         // "rise", // rise , fall
    InnerHeight: number;            // 23, // in meter
    WallMaterial: number;           // 0 - 板式， 1 - 砖混
    ControllerName: string;         // "NoName",
    LocName: string;                // "SomePlace",
    // Date: number;
}

// Confirmed by XXm
export interface IBakingInfo {
    TobaccoType: number;
    UpperWeight: number;
    MiddleWeight: number;
    LowerWeight: number;
    MaturePercent1: number;
    MaturePercent2: number;
    MaturePercent3: number;
    MaturePercent4: number;
    MaturePercent5: number;
    LoadingMethod: number; // 1 - 烟竿 2- 烟夹
    Quality: number; // 0-优，1- 良， 2- zhong 3- 差
    HistoryCounter: number; // Running Batch ID
    PieceQuantity: number;
    PieceWeight: number;
    bTempForUpperRack: boolean;
}
// confirmed by XX, default curve
export interface ISettingCurveInfo {
    TempCurveDryList: number[][];
    TempCurveWetList: number[][]; // 度,23.1, 一位小数点
    TempDurationList: number[];  // 分钟单位
}
// confirmed by XX
export interface IRunningCurveInfo {
    CurrentStage: number;
    CurrentStageRunningTime: number; // 分钟
    TempCurveDryList: number[][];
    TempCurveWetList: number[][];
    TempDurationList: number[];
    // bWindGateHighSpeed: boolean; // true - hi speed, false - low speed
    // bBurningGateOn: boolean; // true - on, false - off
    // bVentOn: boolean;
    // Date: number; // 当前时间
}
export interface IQuality {
    level: string;
    weight: number;
}
// Confirmed by XX
export interface IResultInfo {
    content: IQuality[];
}

export interface IInfoCollect {
    SysInfo: ISysInfo;
    BaseSetting: IBaseSetting;
    BakingInfo: IBakingInfo;
    RunningCurveInfo: IRunningCurveInfo;
    ResultInfo: IResultInfo;
}
// confirmed by XX
export interface ITrapInfo {
    WetTempAlarm: number;  // 1 alarm, 0 no alarm;
    DryTempAlarm: number;
    VoltageLowAlarm: number;
    ACAlarmPhaseA: number;
    ACAlarmPhaseB: number;
    ACAlarmPhaseC: number;
    GPRSAlarm: number;
    GPSAlarm: number;

    // temp value
    PrimaryDryTemp: number;
    PrimaryWetTemp: number;
    SecondaryDryTemp: number;
    SecondaryWetTemp: number;

    bWindGateHighSpeed: number; // 1 - hi speed, 0 - low speed, -1 - stop
    bBurningGateOn: boolean;     // true - on, false - off
    bVentOn: boolean;

    Voltage: number;  // 电压值
    Date: number;     // 当前时间

    HistoryCounter: number; // Running Batch ID

    Status: number;

    vGPRSSignalLevel: number;
    vWifiSignalLevel: number;

    Lattitude: number;
    Longitude: number;

}
// confirmed by XX
export interface ITrapBaking {
    PrimaryTargetDryTemp: number;
    PrimaryTargetWetTemp: number;
    CurrentStage: number;
    CurrentStageRunningTime: number;
    bRunStatus: boolean;  // true, 烘烤结束
}
// test every 1 minute
// export interface TestPoint {
//     timeStamp: string;
//     temp1: string;
//     temp2: string;
//     humi1: string;
//     humi2: string;
// }
export interface ITrapUpdateCurve {
    TempCurveDryList: number[][];
    TempCurveWetList: number[][];
    TempDurationList: number[];
}

export interface IRunningOption {
    curve: number[][];
    timeDelta: number;
}

//
export interface ITempLog {
    temp1: number;
    temp2: number;
    temp3: number;
    temp4: number;
    timeElapsed: number;
    timeStamp: number; // relative to startTimeStamp
}
export interface IElementOption {
    tempBegin: number;
    tempEnd: number;
    duration: number;
    moistureType: number;
    timeDelta: number;
}
export interface IElementLog {
    dryLogs: any[];
    wetLogs: any[];
}

export class Baking {
    public static getBakingType(n: number): string {
        if (n === BakingType.SEGMENT) {
            return "SEGMENT";

        } else if (n === BakingType.SLOPE) {
            return "SLOPE";
        }
    }

}

// For baing config file, app.json
export interface IfTobaccoType {
    name: string;
    id: number;
}
export interface IfQualityLevel {
    name: string;
    id: number;
}
export interface IfAlarmThreshold {
    max_temp: number;
    min_temp: number;
    alarm_checking_period: number;
    dry_temp_alarm_period: number;
    dry_temp_alarm_limit: number;
    dry_temp_alarm_period_2: number;
    dry_temp_alarm_limit_2: number;
    wet_temp_alarm_period: number;
    wet_temp_alarm_limit: number;
}
export interface IfConfigFile {
    devices: any;
    baking_config: {
        default_curve: IDefaultCurve;
        tobacco_type: IfTobaccoType[];
        quality_level: IfQualityLevel[];
        alarm_threshold: IfAlarmThreshold;
        base_setting: IBaseSetting;
    };
}
export interface IfMqttResponse {
    imei: string;
    dyId: string;
    dypassword: string;
    mqttTcpEndpoint: string;
    mqttSslEndpoint: string;
    mqttWssEndpoint: string;
    mqttUsername: string;
    mqttKey: string;
}
export interface IfMachineInfo {
    mqttResponse: IfMqttResponse;
    currentBatchId: string;
    batchStartTime: number;
    loadWeatherTemperature: number;
    loadWeatherHumidity: number;
}

export interface IfCurrentStageInfo {
    CurrentStage: number;
    CurrentStageRunningTime: number; // 分钟
}
export interface IfTrapYesNo {
    TextHeader: string;
    Text: string;
    Type: number;
    TimeOut: number;
    Reply: string;
}
