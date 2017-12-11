const TCP_PORT = 50001; // for QT Server

import Spawn = require("child_process");
import Events = require("events");
import net = require("net");
import { setInterval } from "timers";
import { inspect } from "util";
import { ObjType } from "./BakingCfg";
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

export interface IfMsgCmd {
    message: string;
    data: IfPacket;
}

export interface IfSession {
    callback: (err, data) => void;
    packetId: number;
    timeStamp: number; // ms, 毫秒
}

// For socket communication with QT Server
export class CommQT {
    public bConnected: boolean;
    public emitter: Events.EventEmitter;
    public DELAY_RECONNECT: number;
    public timer: NodeJS.Timer;
    private client: net.Socket;
    private port: number;
    private getPacketId: () => number;
    private pidQT: number;
    private subprocess: Spawn.ChildProcess;

    // for trapresponse handling
    private sessionLst: IfSession[];
    private timerSession: NodeJS.Timer;

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
        if (this.subprocess !== undefined) {
            this.subprocess.kill("SIGTERM");
        }
    }
    public init() {
        this.subprocess = Spawn.spawn("/ruff/app.data/tabacooui", ["-platform", "eglfs"]);

        this.subprocess.on("exit", (code) => {
            Tool.printRed("QT process exit with code: " + code);
        });

        setTimeout(() => {
            this.start();
        }, 1000);

        // check sessionLst
        clearInterval(this.timerSession);

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

        // check session list
        this.timerSession = setInterval(() => {
            this.checkSession();
        }, 1000);

    }
    public write(data: string) {
        Tool.printMagenta("QT.write:-->");
        Tool.print(data);
        this.client.write(data);
    }
    public sendQuery(header: string, text: string, type: number, cb: (err, data) => void) {
        const tuple: IfPacket = this.sendTrap(ObjType.TrapYesNo,
            {
                TextHeader: header,
                Text: text,
                Type: type,
                Reply: "",
            });
        const session: IfSession = {
            callback: cb,
            packetId: tuple.PacketId,
            timeStamp: new Date().getTime(),
        };
        this.pushSession(session);
    }
    // 显示yes/no对话框
    public sendQueryYesNo(header: string, text: string, cb: (err, data) => void) {
        this.sendQuery(header, text, 1, cb);
    }
    // 显示OK确认对话框
    public sendQueryOk(header: string, text: string, cb: (err, data) => void) {
        this.sendQuery(header, text, 2, cb);
    }
    // 显示对话框
    public sendQuickDlg(header: string, text: string, cb: (err, data) => void) {
        this.sendQuery(header, text, 3, cb);
    }

    // 显示对话框
    public sendSlowDlg(header: string, text: string, cb: (err, data) => void) {
        this.sendQuery(header, text, 4, cb);
    }

    public sendTrap(obj: number, objContent: any): IfPacket {
        const tuple: IfPacket = {
            PacketId: this.getPacketId(),
            PacketType: "Trap",
            Obj: obj,
            Content: objContent,
        };

        this.write(JSON.stringify(tuple));

        return tuple;
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
    private parseRunningState(dataIn: IfPacket) {

        let msg = "";

        if (dataIn.Content.State === "run" || dataIn.Content.State === "start") {
            msg = "start";
        } else if (dataIn.Content.State === "stop") {
            msg = "stop";
        } else if (dataIn.Content.State === "pause") {
            msg = "pause";
        } else if (dataIn.Content.State === "reset") {
            msg = "reset";
        } else if (dataIn.Content.State === "resetdefault") {
            msg = "resetdefault";
        } else {
            throw new Error("Wrong running state cmd:" + dataIn.Content.State);
        }

        const out: IfMsgCmd = {
            message: msg,
            data: dataIn,
        };

        this.emitter.emit("cmd", out);
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
        // this.sendSetResp(data.PacketId, data.Obj, "OK");
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
        } else if (data.PacketType.toLowerCase() === "trapresp") {
            this.parseTrapResp(data);
        } else {
            Tool.printRed("Wrong PacketType:" + data.PacketType);
        }
    }
    private parseTrapResp(data: IfPacket) {
        // Find the task which is waiting ,and response
        for (const ele of this.sessionLst) {
            if (ele.packetId === data.PacketId) {
                ele.callback(null, data);
                this.popSession(ele);
                return;
            }
        }
        Tool.printRed("Can not find session for:");
        console.log(data);
    }
    private popSession(ele: IfSession) {
        let i: number = 0;
        for (i; i < this.sessionLst.length; i++) {
            if (this.sessionLst[i].packetId === ele.packetId) {
                break;
            }
        }
        if (i >= this.sessionLst.length) {
            Tool.printRed("Can not pop session in sessionLst:");
            console.log(ele);
        } else {
            this.sessionLst.splice(i, 1);
        }
    }
    private pushSession(session: IfSession) {
        this.sessionLst.push(session);
    }
    private checkSession() {
        // if timeout then remove it from the list
        const stamp = new Date().getTime();

        for (const ele of this.sessionLst) {
            if ((stamp - ele.timeStamp) > 3000) {
                ele.callback("timeout", null);
                this.popSession(ele);
                return;
            }
        }
    }
}
