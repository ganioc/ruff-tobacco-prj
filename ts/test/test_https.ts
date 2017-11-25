import { Promise } from "promise";
import { HttpsApp, IfHttpsApp } from "../HttpsApp";
import { Tool } from "../utility";

console.log("Test Https");
Tool.printGreen("-------------------");

const option: IfHttpsApp = {
    hostname: "https://api.shdingyun.com",
    port: 443,
};

/*
GET /register/{imei}
Response: Protobuf RegisterResponse

3748035460303714772

*/

const client = new HttpsApp(option);
const proc = new Promise((resolve, reject) => {
    client.login("3748035460303714772", (err, buf) => {
        if (err) {
            console.log(err);
            reject(err);
            return;
        }
        console.log("token");
        Tool.print(buf);
        resolve(buf);
    });
});
proc.then((inBuf) => {
    console.log("then OK");
    console.log(inBuf);
}, (err) => {
    console.log("then reject");
});

Tool.printGreen("-------------------");
