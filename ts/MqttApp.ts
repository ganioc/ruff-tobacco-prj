/**
 * Hope we can use MQTT protocol here.
 */
import Mqtt = require("mqtt");
import { Promise } from "promise";
import { Tool } from "./utility";
import { LocalStorage } from "./LocalStorage";
import { RunningHandle } from "./BakingProc";
import { ControlPeriph } from "./ControlPeripheral";
import {
    IBakingInfo, IBaseSetting, IDefaultCurve, IInfoCollect,
    IResultInfo, IRunningCurveInfo, IRunningOption, ISettingCurveInfo,
    ISysInfo,
    ITrapBaking,
    ITrapInfo,
    RunningStatus,
} from "./BakingCfg";
import { Alarm } from "./Alarm";

const ADDRESS = "127.0.0.1";
const PORT = "1883";

export interface IfStructReport {
    reported: {
        stage_mode: string;  // keep, heat
        stage: number; // 1
        dry_bulb_temperature_target: number;
        wet_bulb_temperature_target: number;
        control_loc: string;  // top, bottom
        circulation_speed: number; // 0,低速; 1, 高速
        moisture_removal: number; // 0 , off; 1, on
        stage_remain_min: number; // in minutes
        transducer_communication: number; // 1 norml, 0 abnormal
        bottom_dry_bulb_temp: number; //
        bottom_wet_bulb_temp: number;
        top_dry_bulb_temp: number;
        top_wet_bulb_temp: number;
        overload: number; // 0 normal, 1 abnormal
        voltage: number; // AC power source voltage, 247
        phase_loss: number; // 0 normal, 1 abnormal
        combustion_fan: number; // 0 stop, 1 running
        GPS: string; // "xxxx, xxxx"
    };
}

export class MqttApp {
    private appBaking: RunningHandle;
    private address: string;
    private port: number;
    private conn;
    private client; // mqtt client
    private name: string;
    private key: string;
    private clientId: string;
    private counterError: number;
    private updateTopic: string;
    private lost: boolean;

    constructor(option) {
        this.appBaking = option.baking;
        this.address = option.address || ADDRESS;
        this.port = option.port || PORT;
        this.name = option.name;
        this.key = option.key;
        this.clientId = option.clientId;
        this.updateTopic = "$baidu/iot/shadow/" + this.clientId + "/update";

        this.counterError = 0;

        this.lost = false;

        Tool.printBlue("Init CloudApp");
    }
    public start(): void {
        Tool.print("CloudApp start()");
        Tool.print("Register to cloud server");

        this.counterError = 0;

        Tool.printBlue(this.address + ":" + this.port);

        console.log({
            keepalive: 1000,
            protocolId: "MQIsdp",
            protocolVersion: 3,
            clientId: this.clientId,
            username: this.name,
            password: this.key,
        });

        this.client = Mqtt.connect(
            this.address + ":" + this.port,
            {
                keepalive: 1000,
                protocolId: "MQIsdp",
                protocolVersion: 3,
                clientId: this.clientId,
                username: this.name,
                password: this.key,
            },
        );
        this.client.on("close", () => {
            this.lost = true;
            Tool.printRed("MQTT to baidu closed");

            setTimeout(() => {
                this.reconnect();
            }, 100000);
        });
        this.client.on("error", (err) => {
            Tool.printRed("MQTT baidu, error");
            console.log(err);

            this.counterError++;

            if (this.counterError > 100) {
                this.reconnect();
            }
        });
        this.client.on("connect", () => {
            this.lost = false;
            Tool.printBlue("\nMQTT baidu Connected\n");

            // subscribe

        });

    }
    public updateReport() {
        if (this.lost) {
            return;
        }

        let data: IfStructReport;
        let info: IInfoCollect;
        const proc = new Promise((resolve, reject) => {
            LocalStorage.loadBakingStatusAsync((err, o: IInfoCollect) => {
                if (err) {
                    reject("NOK");
                    return;
                }
                info = JSON.parse(JSON.stringify(o));
                resolve("OK");
            });
        }).then((value) => {
            let mode: string;
            let stage: number;
            stage = this.appBaking.bakingCurve.indexBakingElement;

            if (info.RunningCurveInfo.TempCurveDryList[stage][0] === info.RunningCurveInfo.TempCurveDryList[stage][1]) {
                mode = "keep";
            } else {
                mode = "heat";
            }

            data = {
                reported: {
                    stage_mode: mode,  // keep, heat
                    stage: this.appBaking.bakingCurve.indexBakingElement, // 1
                    dry_bulb_temperature_target: this.appBaking.bakingCurve.getTempDryTarget(),
                    wet_bulb_temperature_target: this.appBaking.bakingCurve.getTempWetTarget(),
                    control_loc: RunningHandle.bTempForUpperRack === true ? "top" : "bottom",  // top, bottom
                    circulation_speed: ControlPeriph.bWindGateHighSpeed === true ? 1 : 0, // 0,低速; 1, 高速
                    moisture_removal: (ControlPeriph.VentAngle > 0.01) ? 1 : 0, // 0 , off; 1, on
                    stage_remain_min: info.RunningCurveInfo.TempDurationList[stage] * 60 - this.appBaking.bakingCurve.getCurrentStageElapsedTime() / 60, // in minutes
                    transducer_communication: (ControlPeriph.temp1 === 0 || ControlPeriph.temp2 === 0 || ControlPeriph.temp3 === 0 || ControlPeriph.temp4 === 0) ? 0 : 1, // 1 norml, 0 abnormal
                    bottom_dry_bulb_temp: ControlPeriph.temp1, //
                    bottom_wet_bulb_temp: ControlPeriph.temp3,
                    top_dry_bulb_temp: ControlPeriph.temp4,
                    top_wet_bulb_temp: ControlPeriph.temp2,
                    overload: Alarm.bOverload ? 1 : 0, // 0 normal, 1 abnormal
                    voltage: ControlPeriph.ADC4 * 87.2, // AC power source voltage, 247
                    phase_loss: Alarm.bPhaseLost ? 1 : 0, // 0 normal, 1 abnormal
                    combustion_fan: ControlPeriph.CheckBurningGate() === true ? 1 : 0, // 0 stop, 1 running
                    GPS: info.BaseSetting.GPSInfo.Latitude + "," + info.BaseSetting.GPSInfo.Longitude, // "xxxx, xxxx"
                },
            };
            Tool.print(JSON.stringify(data));
            this.client.publish(this.updateTopic, JSON.stringify(data), { qos: 1, retain: false });
            Tool.printGreen("Update report to cloud");
        });
    }
    public downloadCurve() {
        Tool.print("Download cuve from cloud server");
    }
    private reconnect() {
        this.start();
    }
}
