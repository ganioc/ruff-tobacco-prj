const TCP_PORT = 50001; // for QT Server

import Spawn = require("child_process");
import Events = require("events");
import net = require("net");
import { inspect } from "util";
import { Tool } from "./utility";

// import spawn = require('child_process').spawn;

export enum InfoType {
    Val_SysInfo = 10,
    Val_SettingCurveInfo = 11,
    Val_RunningCurveInfo = 12,
    Val_ResultInfo = 13,
    Val_TrapInfo = 14,
    Val_RunningState = 15,
    Val_BakingInfo = 16,
    Val_BaseSetting = 17,
    Val_TrapBaking = 18,
}

export interface IfPacket {
    PacketId: number;
    PacketType: string; // "Get", "GetResp", "Set", "SetResp","Trap"
    Obj: number; // Number
    Content: any;
}

// For socket communication with QT Server
export class CommQT {
    public bConnected: boolean;
    public emitter: Events.EventEmitter;
    public DELAY_RECONNECT: number;
    private client: net.Socket;
    private port: number;
    private getPacketId: () => {};
    private pidQT: number;
    private subprocess: Spawn.ChildProcess;

    constructor(option) {
        this.bConnected = false;
        this.port = option.port || TCP_PORT;
        this.DELAY_RECONNECT = 5000;
        this.emitter = new Events.EventEmitter();
        this.getPacketId = (() => {
            let id = 1 + Math.floor(100 * Math.random());
            return () => {
                if (id >= 0xffff) {
                    id = 1;
                }
                return 0xffff + id++;
            };

        })();
    }
    public exit() {
        // kill the qt process
        // Tool.printMagenta(inspect(this.subprocess));
        this.subprocess.kill();
    }
    public init() {
        this.subprocess = Spawn.spawn("/home/root/tabacooui", ["-platform", "eglfs"]);

        // Tool.printMagenta(inspect(this.subprocess));

        setTimeout(() => {
            this.start();
        }, 2000);
    }
    public start() {

        // connect with the QT server
        this.client = net.connect(50000, "127.0.0.1", () => {
            Tool.print("conntected to server");

            this.emitter.emit("connected", {});

        });
        this.client.on("data", (data) => {
            Tool.printGreen("<-- RX from QT:");
            Tool.print(data.toString());
            Tool.printGreen("----end---");
            let obj;
            // let  result;

            try {
                obj = JSON.parse(data.toString());
                this.parse(obj);
            } catch (e) {
                Tool.printRed("Wrong parse QT msg");
                Tool.print(e);
                // throw new Error("Wrong parse QT msg");
            }
        });

        this.client.on("error", (err) => {
            Tool.printRed("Socket error");
            Tool.printRed(err);
            // Should I do it , when meet a single error?
            this.emitter.emit("end", {});
        });

        this.client.on("end", () => {
            Tool.print("Disconnected from server");
            this.emitter.emit("end", {});
        });
    }
    public write(data: string) {
        Tool.printMagenta("QT.write:-->");
        Tool.print(data);
        this.client.write(data);
    }

    public sendTrap(obj: number, objContent: any) {
        const tuple = {} as any;

        tuple.PacketId = this.getPacketId();
        tuple.PacketType = "Trap";
        tuple.Obj = obj;
        tuple.Content = objContent;
        this.write(JSON.stringify(tuple));
    }
    public sendGetResp(packetId: number, obj: number, objContent: any) {
        const tuple = {} as any;

        tuple.PacketId = packetId;
        tuple.PacketType = "GetResp";
        tuple.Obj = obj;
        tuple.Content = objContent;

        this.write(JSON.stringify(tuple));

    }
    public sendSetResp(packetId: number, obj: number, objContent: any) {
        const tuple = {} as any;

        tuple.PacketId = packetId;
        tuple.PacketType = "SetResp";
        tuple.Obj = obj;
        tuple.Content = objContent;

        this.write(JSON.stringify(tuple));
    }
    private parseRunningState(data: IfPacket) {

        let msg = "";

        if (data.Content.State === "run" || data.Content.State === "start") {
            msg = "start";
        } else if (data.Content.State === "stop") {
            msg = "stop";
        } else if (data.Content.State === "pause") {
            msg = "pause";
        } else if (data.Content.State === "reset") {
            msg = "reset";
        } else {
            throw new Error("Wrong running state cmd:" + data.Content.State);
        }

        this.emitter.emit("cmd", msg);
    }
    private parseSet(data: IfPacket) {
        switch (data.Obj) {
            case InfoType.Val_BakingInfo:
            case InfoType.Val_BaseSetting:
            case InfoType.Val_SysInfo:
            case InfoType.Val_SettingCurveInfo:
            case InfoType.Val_RunningCurveInfo:
            case InfoType.Val_ResultInfo:
            case InfoType.Val_TrapInfo:
            case InfoType.Val_TrapBaking:
                this.emitter.emit("set", data);
                break;
            case InfoType.Val_RunningState:
                this.parseRunningState(data);
                break;
            default:
                Tool.print("Wrong packet obj type:" + data.Obj);
                this.sendSetResp(data.PacketId, data.Obj, "NOK");
                return;

        }
        this.sendSetResp(data.PacketId, data.Obj, "OK");
    }
    private parseGet(data: IfPacket) {
        switch (data.Obj) {
            case InfoType.Val_SysInfo:
            case InfoType.Val_SettingCurveInfo:
            case InfoType.Val_RunningCurveInfo:
            case InfoType.Val_ResultInfo:
            case InfoType.Val_TrapInfo:
            case InfoType.Val_TrapBaking:
            case InfoType.Val_RunningState:
            case InfoType.Val_BakingInfo:
            case InfoType.Val_BaseSetting:
                this.emitter.emit("get", data);
                break;
            default:
                Tool.print("Wrong packet obj type:" + data.Obj);
                break;
        }
    }
    private parse(data: IfPacket) {

        if (data.PacketType.toLowerCase() === "get") {
            this.parseGet(data);
        } else if (data.PacketType.toLowerCase() === "set") {
            this.parseSet(data);
        } else {
            Tool.printRed("Wrong PacketType:" + data.PacketType);
        }
    }
}
