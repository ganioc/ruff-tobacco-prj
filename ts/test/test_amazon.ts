import * as  https from "https";
import { HttpsApp, IfHttpsApp } from "../HttpsApp";

// https.get("https://stackoverflow.com/", (res) => {
//     console.log("statusCode: ", res.statusCode);

//     res.on("data", (d) => {
//         console.log(d.length);
//     });
// });

const option: IfHttpsApp = {
    hostname: "api.shdingyun.com",
    port: 443,
};

const client = new HttpsApp(option);

// 读取stackoverflow.com网站是没有问题的
client.post("/login", JSON.stringify({ imei: "3748035460303714772" }), (err, buf) => {
    if (err) {
        console.log(err);
        return;
    }
    console.log(buf.length);
});

// client.get("/register/" + "3748035460303714772", (err, buf) => {
//     if (err) {
//         console.log(err);
//         return;
//     }
//     console.log(buf.length);
// });
