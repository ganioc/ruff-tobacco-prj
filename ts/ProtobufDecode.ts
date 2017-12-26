/**
 * A wrapper for ProtobufDecode function
 */
import * as fs from "fs";
import { Promise } from "promise";
import { DecodePB } from "./DecodePB";
import { MqttApp } from "./MqttApp";
import { Tool } from "./utility";
import { LocalStorage } from "./LocalStorage";
import { HttpsApp, IfHttpsApp } from "./HttpsApp";
import { IfMachineInfo, IfMqttResponse } from "./BakingCfg";
import { setInterval } from "timers";
import { RunningHandle } from "./BakingProc";

const protoFile = __dirname + "/../data/awesome.proto";

const option: IfHttpsApp = {
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

    public appBaking: RunningHandle;
    public mqtt: MqttApp; // Mqtt Client
    public TOKEN: string;
    private client: HttpsApp; // https client
    private info: IfMachineInfo;
    private timer: NodeJS.Timer;
    private mqttTimer: NodeJS.Timer;

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

        this.appBaking = option.handle;
        ProtobufDecode.bOnline = false;
        this.mqtt = undefined;

        this.client = new HttpsApp(option);
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
                console.log(buf.length);
                this.TOKEN = buf.toString();
                Tool.printBlue(this.TOKEN);
                resolve(this.TOKEN);
            });

            // create mqtt client
        }).then((d) => {
            // read local storage for machine Info
            Tool.printBlue("There is network, TOKEN:" + d);
            ProtobufDecode.bOnline = true;

            return new Promise((resolve, reject) => {
                if (fs.existsSync(LocalStorage.getMachineFile())) {
                    Tool.print("Machine Already exist: ");
                    // read out the machine info
                    fs.readFile(LocalStorage.getMachineFile(), (err, data) => {
                        if (err) {
                            Tool.printRed("Read MachineInfo file fail");
                            reject("NOEXIST");
                            return;
                        }
                        let obj: any;
                        try {
                            obj = JSON.parse(data.toString());
                        } catch (e) {
                            Tool.printRed("parse MachineInfo data error");
                            Tool.printRed(e);
                            reject("NOEXIST");
                            return;
                        }
                        this.info = JSON.parse(JSON.stringify(obj));
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
                    }
                    let objRegisterResponse: IfMqttResponse;
                    try {
                        objRegisterResponse = this.decodeRegisterResponse.decode(new Uint8Array(buf));
                    } catch (e) {
                        Tool.printRed("parse registerresponse data error");
                        Tool.printRed(e);

                        reject("NOK");
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
                    console.log("Info");
                    console.log(this.info);
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
                handle: this.appBaking,
            });
            this.mqtt.start();

            return Promise.resolve("OK");
        }).then((d) => {
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

            this.mqttTimer = setInterval(() => {
                this.mqtt.updateReport();
            }, 5000);
        });
    }
}
