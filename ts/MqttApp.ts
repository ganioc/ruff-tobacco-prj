/**
 * Hope we can use MQTT protocol here.
 */
import Mqtt = require("mqtt");
import { Promise } from "promise";
import { Tool } from "./utility";

const ADDRESS = "127.0.0.1";
const PORT = "1883";

export interface IfStructRepot {
    requestId: {
        UUID: number;
        timeStamp: number;
    };
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
        gps: string; // "xxxx, xxxx"
    };
}

export class MqttApp {
    private address: string;
    private port: number;
    private conn;
    private client; // mqtt client
    private name: string;
    private key: string;
    private clientId: string;
    private counterError: number;

    constructor(option) {
        this.address = option.address || ADDRESS;
        this.port = option.port || PORT;
        this.name = option.name;
        this.key = option.key;
        this.clientId = option.clientId;

        this.counterError = 0;

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
        this.client.on("clsoe", () => {
            Tool.printRed("MQTT to baidu closed");

            // setTimeout(() => {
            //     this.reconnect();
            // }, 15000);
        });
        this.client.on("error", (err) => {
            Tool.printRed("MQTT baidu, error");
            console.log(err);

            this.counterError++;

            if (this.counterError > 10) {
                this.reconnect();
            }
        });
        this.client.on("connect", () => {
            Tool.printBlue("\nMQTT baidu Connected\n");

            // subscribe

        });

    }
    public updateReport() {
        Tool.printGreen("Update report to cloud");
    }
    public downloadCurve() {
        Tool.print("Download cuve from cloud server");
    }
    private reconnect() {
        this.start();
    }
}
