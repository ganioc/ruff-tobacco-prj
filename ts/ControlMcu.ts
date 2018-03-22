
declare var $: any;

import Events = require("events");
import { Tool } from "./utility";

// const uartComm = $("#uart1");
const uartComm = $("#uart-mcu");

const buf = new Buffer(128);
let indexBuf = 0;

export interface ICallbackData {
    type: string;
    content: Buffer;
}

export class ControlMcu {

    public static turnOnBakingFire() {
        console.log("Turn on Baking Fire");

    }
    public static turnOffBakingFire() {
        console.log("Turn off Baking Fire");
    }
    public static turnOnVentingGate() {
        console.log("Turn on Venting");
    }
    public static turnOffVentingGate() {
        console.log("Turn off Venting");
    }
    private static readonly WIRTE_TIMEOUT = 1800;
    public emitter: Events.EventEmitter;

    private callback: (err, data) => void;
    private timer: NodeJS.Timer;

    constructor() {
        uartComm.on("data", (data: Buffer) => {
            // Tool.print(data.toString());
            // Tool.print(data.toString('hex'));

            this.parse(data);
        });

        this.emitter = new Events.EventEmitter();
        this.callback = null;
        this.timer = null;

        this.emitter.on("packet", (data: Buffer) => {
            // Tool.print("on packet rx");

            const header = data.slice(0, 4).toString();
            const mtype = data.slice(4, 8).toString();
            const mcontent = data.slice(8);

            // Tool.print("header:" + header);
            // Tool.print("type:" + type);
            // Tool.print("content:" + content.toString());

            // if it's a TRAP
            if (header === "TRAP") {
                Tool.print("It\'s a TRAP\n");

                this.emitter.emit("message", { type: mtype, content: mcontent });

            } else if (header === "RESP") {
                // Tool.print("It\'s a RESP\n");

                // this.emitter.emit('message', { type: type, data: content });
                if (this.callback !== null) {
                    clearTimeout(this.timer);

                    this.callback(null, { type: mtype, content: mcontent });
                    this.callback = null;
                }
            }
        });
    }
    public send(dev, data: Buffer) {
        dev.write(data);
    }
    public GetTime(callback: (err, data: ICallbackData) => void) {
        this.Write(new Buffer("GET*TIME\r\n"), callback);
    }
    public GetTemp(callback: (err, data: ICallbackData) => void) {
        this.Write(new Buffer("GET*TEMP\r\n"), callback);
    }
    public GetADC(callback: (err, data: ICallbackData) => void) {
        this.Write(new Buffer("GET*ADC*\r\n"), callback);
    }
    public SetTime(callback: (err, data: ICallbackData) => void) {

        const time = new Date();
        const year = time.getFullYear().toString().slice(2, 4);
        let month = (1 + time.getMonth()).toString();
        month = (month.length < 2) ? ("0" + month) : month;

        let date = time.getDate().toString();
        date = (date.length < 2) ? ("0" + date) : date;

        let hour = time.getHours().toString();
        hour = (hour.length < 2) ? ("0" + hour) : hour;

        let minute = time.getMinutes().toString();
        minute = (minute.length < 2) ? ("0" + minute) : minute;

        let second = time.getSeconds().toString();
        second = (second.length < 2) ? ("0" + second) : second;

        this.Write(new Buffer("SET*TIME" + year + month + date + hour + minute + second + "\r\n"), callback);
    }
    // 发送，响应，超时的处理，通用函数API
    public Write(data: Buffer, cb: (err, data: ICallbackData) => void) {

        this.send(uartComm, data);

        this.callback = cb;

        clearTimeout(this.timer);

        this.timer = setTimeout(() => {
            Tool.print("Write timeout");
            this.callback(new Error("Time-is-out"), { type: "error", content: new Buffer("TimeOut") });
            this.callback = null;
        }, ControlMcu.WIRTE_TIMEOUT);

    }
    private MatchHeader(buff: Buffer): boolean {
        return (buff[0] === "R".charCodeAt(0)
            && buff[1] === "E".charCodeAt(0)
            && buff[2] === "S".charCodeAt(0)
            && buff[3] === "P".charCodeAt(0))
            || (buff[0] === "T".charCodeAt(0)
                && buff[1] === "R".charCodeAt(0)
                && buff[2] === "A".charCodeAt(0)
                && buff[3] === "P".charCodeAt(0));
    }
    private parse(data) {
        const len = data.length;

        for (let i = 0; i < len; i++) {
            // Tool.print(data[i]);

            if (data[i] === "\n".charCodeAt(0) && indexBuf <= 6) {
                indexBuf = 0;
            } else if (data[i] === "\n".charCodeAt(0)) {
                if (this.MatchHeader(buf)) {
                    // Tool.print("MatchHeader pass:");

                    this.emitter.emit("packet", buf.slice(0, indexBuf));

                    indexBuf = 0;
                } else {
                    Tool.printRed("MatchHeader fail:");
                    Tool.printRed("length:" + indexBuf);
                    for (let j = 0; j < indexBuf; j++) {
                        Tool.print(buf[j]);
                    }
                    indexBuf = 0;
                }
            } else if (indexBuf < 128) {
                buf[indexBuf++] = data[i];
            } else {
                indexBuf = 0;
            }

        }
    }
}
