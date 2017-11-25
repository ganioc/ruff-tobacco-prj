import * as https from "https";
import { open } from "inspector";
import { inspect } from "util";
import { Tool } from "./utility";

export interface IfHttpsApp {
    hostname: string;
    port: number;
}
interface IfHttps {
    hostname: string;
    port: number;
    path: string;
    method: string;
    headers: {};
}
interface IfLogin {
    imei: string;
}
// const OPTIONS = {
//     hostname: HOSTNAME,
//     port: 443,
//     path: "/",
//     method: "GET",
// };

export class HttpsApp {
    private HOSTNAME: string;
    private PORT: number;

    constructor(option: IfHttpsApp) {
        if (option.hostname === undefined) {
            throw new Error("hostname is empty");
        } else {
            this.HOSTNAME = option.hostname;
        }
        if (option.port === undefined) {
            throw new Error("port is empty");
        } else {
            this.PORT = option.port;
        }
        Tool.printBlue("https app constructor()");
    }

    public post(inPath: string, data: string, callback: (err, buf) => void) {

        console.log("into post function");

        const option: IfHttps = {
            hostname: this.HOSTNAME,
            port: this.PORT,
            path: inPath,
            method: "POST",
            headers: {
                "Source": "Device",
                "Content-Type": "application/json",
                "Content-Length": data.length,
            },
        };

        console.log(option);
        console.log(data);

        const req = https.request(option, (res) => {
            console.log("statusCode:" + res.statusCode);
            console.log("headers:" + res.headers);
            console.log(inspect(res));

            res.on("data", (d) => {
                Tool.printMagenta("<-- from https server:");
                Tool.print(d);
                Tool.printYellow("to object");
                Tool.printMagenta("----end----");
                callback(null, d);
            });
            res.on("end", () => {
                Tool.print("end rx");
            });
        });

        req.on("error", (e) => {
            Tool.printRed("req error");
            console.log(e);
            callback(e, null);
        });
        Tool.printYellow(inspect(req));
        // headers: { Source: "Device" },
        Tool.printBlue(data);
        req.write(data);
        req.end();
    }
    public get(inPath: string, callback: (err, buf) => void) {

        const option: IfHttps = {
            hostname: this.HOSTNAME,
            port: this.PORT,
            path: inPath,
            method: "GET",
            headers: { Source: "Device" },
        };

        Tool.printRed(inspect(option));

        const req = https.request(option, (res) => {
            console.log("statusCode:" + res.statusCode);
            console.log("headers:" + res.headers);

            res.on("data", (d) => {
                Tool.printMagenta("<-- from https server:");
                Tool.print(d);
                callback(null, d);
                Tool.printMagenta("----end----");
            });
            res.on("error", (err) => {
                Tool.printRed(err);
                callback(err, null);
            });
        });

        req.on("error", (e) => {
            Tool.printRed("req error");
            console.log(e);
            callback(e, null);
        });

        req.end();
    }
    public register(sn: string, callback: (err, buf) => void) {
        this.get("/register/" + sn, callback);
    }
    public login(sn: string, callback: (err, buf) => void) {
        const data: IfLogin = {
            imei: sn,
        };
        Tool.printYellow(sn);
        console.log(data);
        console.log(JSON.stringify(data));

        this.post("/login", JSON.stringify(data), callback);
    }
}
