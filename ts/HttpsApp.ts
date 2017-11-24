import * as https from "https";
import { Tool } from "./utility";

const OPTIONS = {
    hostname: "",
    port: 443,
    path: "/",
    method: "GET",
};

export class HttpsApp {
    constructor() {
        Tool.printBlue("https app constructor()");
    }

    public post() {
        const req = https.request(OPTIONS, (res) => {
            console.log("statusCode:" + res.statusCode);
            console.log("headers:" + res.headers);

            res.on("data", (d) => {
                Tool.printMagenta("<-- from https server:");
                Tool.print(d);
                Tool.printMagenta("----end----");
            });
        });
    }
    public get() {
        const req = https.request(OPTIONS, (res) => {
            console.log("statusCode:" + res.statusCode);
            console.log("headers:" + res.headers);

            res.on("data", (d) => {
                Tool.printMagenta("<-- from https server:");
                Tool.print(d);
                Tool.printMagenta("----end----");
            });
        });
    }
}
