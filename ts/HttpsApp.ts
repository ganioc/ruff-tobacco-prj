
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
    // port: number;
    path: string;
    method: string;
    headers: {};
    rejectUnauthorized: boolean;
}
interface IfHttpsAuth {
    hostname: string;
    // port: number;
    path: string;
    method: string;
    headers: {};
    rejectUnauthorized: boolean;
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

    public login(sn: string, callback: (err, buf) => void) {
        const data: IfLogin = {
            imei: sn,
        };
        Tool.printYellow(sn);
        // console.log(data);
        // console.log(JSON.stringify(data));

        this.post("/login", JSON.stringify(data), callback);
    }
    public register(sn: string, token: string, callback: (err, buf) => void) {
        this.get("/register/" + sn, token, callback);
    }
    public createBatch(arr: Uint8Array, token: string, callback: (err, buf) => void) {
        // comment
        this.put("/batch/device/create", arr, token, callback);
    }
    public updateBatch(arr: Uint8Array, token: string, callback: (err, buf) => void) {
        // comment
        this.put("/batch/device/update", arr, token, callback);
    }
    public getRecoProfile(arr: Uint8Array, token: string, callback: (err, buf) => void) {
        // comment
        this.put("/getRecoProfile", arr, token, callback);
    }
    public updateProfile(arr: Uint8Array, token: string, callback: (err, buf) => void) {
        // comment
        this.put("/profile/device", arr, token, callback);
    }

    public updateConfig(arr: Uint8Array, token: string, callback: (err, buf) => void) {
        this.postWithToken("/device/config", arr, token, callback);
    }

    public updateApp(Id: string, token: string, callback: (err, buf) => void) {
        this.put("/device/app/update/" + Id, new Uint8Array(0), token, callback);
    }

    public resume(Id: string, token: string, callback: (err, buf) => void) {
        this.get("/resumePoint/" + Id, token, callback);
    }

    public alert(arr: Uint8Array, token: string, callback: (err, buf) => void) {
        this.put("/device/alert", arr, token, callback);
    }

    private put(inPath: string, objData: Uint8Array, token: string, callback: (err, buf) => void) {
        // comment
        Tool.printYellow("----- PUT -----");

        const option: IfHttpsAuth = {
            hostname: this.HOSTNAME,
            // port: this.PORT,
            path: inPath,
            method: "PUT",
            headers: {
                "Source": "Device",
                "Authorization": "Bearer " + token,
                "Content-Type": "application/x-protobuf",
                "Content-Length": objData.length,
                "Connection": "keep-alive",
            },
            rejectUnauthorized: false,
        };

        Tool.printMagenta(inspect(option));
        const req = https.request(option, (res) => {
            Tool.printYellow("------Response from PUT-------");
            console.log("statusCode:" + res.statusCode);
            console.log("headers:" + res.headers);
            // console.log(inspect(res.headers));
            let resp;

            if (res.statusCode === 403) {
                Tool.printRed("Forbidden path");
            }

            res.on("data", (d) => {
                Tool.printMagenta("<-- PUT response from https server:");
                // Tool.print(d);
                // Tool.print(d.toString());
                Tool.printMagenta("----end----");
                if (resp === undefined) {
                    resp = d;
                } else {
                    resp = typeof resp === 'string' ? resp + d : Buffer.concat([resp,d]);
                }
            });

            res.on("error", (err) => {
                Tool.printRed(err);
                callback(err, null);
            });
            res.on("end", () => {
                callback(null, resp);
                Tool.print("Put end rx");
            });
        });

        req.on("error", (e) => {
            Tool.printRed("put req error");
            console.log(e);
            callback(e, null);
        });

        // Tool.printYellow(inspect(req));

        Tool.printGreen("length :" + objData.length);
        Tool.printMagenta("type :" + typeof objData);
        // Tool.print(objData);

        const bufObjData = new Buffer(objData);

        console.log(bufObjData);
        req.write(bufObjData);
        req.end();
    }

    private postWithToken(inPath: string, objData: Uint8Array, token: string, callback: (err, buf) => void) {
        // comment
        Tool.printYellow("----- POST -----");

        const option: IfHttpsAuth = {
            hostname: this.HOSTNAME,
            // port: this.PORT,
            path: inPath,
            method: "POST",
            headers: {
                "Source": "Device",
                "Authorization": "Bearer " + token,
                "Content-Type": "application/x-protobuf",
                "Content-Length": objData.length,
                "Connection": "keep-alive",
            },
            rejectUnauthorized: false,
        };

        Tool.printMagenta(inspect(option));
        const req = https.request(option, (res) => {
            Tool.printYellow("------Response from PUT-------");
            console.log("statusCode:" + res.statusCode);
            console.log("headers:" + res.headers);
            // console.log(inspect(res.headers));
            let resp;

            if (res.statusCode === 403) {
                Tool.printRed("Forbidden path");
            }

            res.on("data", (d) => {
                Tool.printMagenta("<-- POSTWITHTOKEN response from https server:");
                // Tool.print(d);
                // Tool.print(d.toString());
                Tool.printMagenta("----end----");
                if (resp === undefined) {
                    resp = d;
                } else {
                    resp = typeof resp === 'string' ? resp + d : Buffer.concat([resp,d]);
                }            
            });

            res.on("error", (err) => {
                Tool.printRed(err);
                callback(err, null);
            });

            res.on("end", () => {
                callback(null, resp);
                Tool.print("Put end rx");
            });
        });

        req.on("error", (e) => {
            Tool.printRed("put req error");
            console.log(e);
            callback(e, null);
        });

        // Tool.printYellow(inspect(req));

        Tool.printGreen("length :" + objData.length);
        Tool.printMagenta("type :" + typeof objData);
        // Tool.print(objData);

        const bufObjData = new Buffer(objData);

        console.log(bufObjData);
        req.write(bufObjData);
        req.end();
    }

    private post(inPath: string, data: string, callback: (err, buf) => void) {

        console.log("into post function");

        const option: IfHttps = {
            hostname: this.HOSTNAME,
            // port: this.PORT,
            path: inPath,
            method: "POST",
            headers: {
                "Source": "Device",
                "Content-Type": "application/json",
                "Content-Length": data.length,
            },
            rejectUnauthorized: false,
        };

        // console.log(option);
        // console.log(data);

        const req = https.request(option, (res) => {
            console.log("statusCode:" + res.statusCode);
            console.log("headers:" + res.headers);
            // console.log(inspect(res));

            let resp;
            res.on("data", (d) => {
                Tool.printMagenta("<-- from https server:");
                Tool.print(d);
                Tool.printYellow("to object");
                Tool.printMagenta("----end----");
                if (resp === undefined) {
                    resp = d;
                } else {
                    resp = typeof resp === 'string' ? resp + d : Buffer.concat([resp,d]);
                }
            });

            res.on("end", () => {
                Tool.print("Post end rx");                
                callback(null, resp);
            });
        });

        req.on("error", (e) => {
            Tool.printRed("req error");
            console.log(e);
            callback(e, null);
        });

        // Tool.printYellow(inspect(req));
        // headers: { Source: "Device" },
        Tool.printBlue(data);
        req.write(data);
        req.end();
    }

    private get(inPath: string, token: string, callback: (err, buf) => void) {

        const option: IfHttpsAuth = {
            hostname: this.HOSTNAME,
            // port: this.PORT,
            path: inPath,
            method: "GET",
            headers: {
                Source: "Device",
                authorization: "Bearer " + token,
            },
            rejectUnauthorized: false,
        };

        Tool.printRed(inspect(option));

        const req = https.request(option, (res) => {
            Tool.printYellow("------Response from GET-------");
            console.log("statusCode:" + res.statusCode);
            console.log("headers:" + res.headers);
            // console.log(inspect(res.headers));

            let resp;
            if (res.statusCode === 403) {
                Tool.printRed("Forbidden path");
            }

            res.on("data", (d) => {
                Tool.printMagenta("<-- from https server:");
                // Tool.print(d);
                Tool.printMagenta("----end----");
                if (resp === undefined) {
                    resp = d;
                } else {
                    resp = typeof resp === 'string' ? resp + d : Buffer.concat([resp,d]);
                }            
            });

            res.on("end", () => {
                Tool.print("Post end rx");                
                callback(null, resp);
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

        // Tool.printYellow(inspect(req));

        req.end();
    }

}
