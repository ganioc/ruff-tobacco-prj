import * as  https from "https";

import { Promise } from "promise";
import { inspect } from "util";
import { DecodePB, IfBatchDetail, IfBatchRating, IfRecoProfileRequest } from "../DecodePB";
import { HttpsApp, IfHttpsApp } from "../HttpsApp";

const protoFile = __dirname + "/../../data/awesome.proto";
import { Tool } from "../utility";

// https.get("https://stackoverflow.com/", (res) => {
//     console.log("statusCode: ", res.statusCode);

//     res.on("data", (d) => {
//         console.log(d.length);
//     });
// });

// const decodeRecoProfileRequest = new DecodePB({
//     path: protoFile,
//     className: "awesomepackage.RecoProfileRequest",
// });

const decodeBatchDetail = new DecodePB({
    path: protoFile,
    className: "awesomepackage.BatchDetail",
});

const option: IfHttpsApp = {
    hostname: "api.shdingyun.com",
    port: 443,
};

const client = new HttpsApp(option);
let TOKEN: string = "";

const proc = new Promise((resolve, reject) => {
    // 读取stackoverflow.com网站是没有问题的
    // client.post("/login", JSON.stringify({ imei: "3748035460303714772" }), (err, buf) => {
    //     if (err) {
    //         console.log(err);
    //         reject(null);
    //         return;
    //     }
    //     console.log(buf.length);
    //     TOKEN = buf.toString();
    //     resolve(TOKEN);
    // });
    client.login("3748035460303714772", (err, buf) => {
        if (err) {
            console.log(err);
            reject(null);
            return;
        }
        console.log(buf.length);
        TOKEN = buf.toString();
        Tool.printBlue(TOKEN);
        resolve(TOKEN);
    });

});

proc.then((token: string) => {
    Tool.printGreen("Token got");

    const mBatchDetail: IfBatchDetail = {
        batchId: 220,
        deviceId: "2LOPekIWQQ",
        startTime: 12,
        endTime: 12,
        ratings: [{ rating: "a", weight: 23 }, { rating: "b", weight: 2343 }],
        afterTopWeight: 1,
        afterMiddleWeight: 1,
        afterBottomWeight: 1,
        variety: "as",
        barnAirflowDirection: "dsf",
        barnWallTexture: "sdf",
        loadWeatherTemperature: 23,
        loadTopWeight: 2,
        loadWeatherHumidity: 23,
        loadMiddleWeight: 23,
        loadBottomWeight: 65,
        loadTool: "sd",
        loadToolCount: "sdf",
        loadToolWeight: "sdf",
        loadQuality: "sdf",
        loadMaturityLv_0Percentage: 2,
        loadMaturityLv_1Percentage: 3,
        loadMaturityLv_2Percentage: 4,
        loadMaturityLv_3Percentage: 5,
        loadMaturityLv_4Percentage: 6,
    };

    Tool.printGreen("data to be sent");
    console.log(mBatchDetail);

    const bufBatchDetail = decodeBatchDetail.encode(mBatchDetail);
    Tool.printGreen(bufBatchDetail.length);
    console.log(bufBatchDetail);

    // const objNew = decodeBatchDetail.decode(bufBatchDetail);
    // Tool.printBlue("======== Recovered object ========");
    // console.log(objNew);

    client.put("/batch/device/create",
        decodeBatchDetail.encode(mBatchDetail),
        token,
        (err, buf) => {
            // comments
            if (err) {
                console.log(err);
                return;
            }
            Tool.printYellow("---- got put ----");
            console.log(buf.length);
            Tool.printYellow("---- end of getRecoProfile ----");
        });

    // client.register("3748035460303714772", token, (err, buf) => {
    //     if (err) {
    //         console.log(err);
    //         return;
    //     }
    //     Tool.print("Register feedback");
    //     console.log(buf.length);
    //     console.log(buf.toString());
    // });

    // const mRecoProfileRequest: IfRecoProfileRequest = {
    //     batchId: 1,
    //     deviceId: "2LOPekIWQQ",
    //     variety: "",
    //     barn_airflow_direction: "up",
    //     barn_wall_texture: "",
    //     load_weather_temperature: 22,
    //     load_top_weight: 22,
    //     load_weather_humidity: 22,
    //     load_middle_weight: 2,
    //     load_bottom_weight: 3,
    //     load_tool: "s",
    //     loading_tool_count: 2,
    //     load_tool_weight: "2",
    //     load_quality: "good",
    //     load_maturity_lv_0_percentage: 20,
    //     load_maturity_lv_1_percentage: 20,
    //     load_maturity_lv_2_percentage: 20,
    //     load_maturity_lv_3_percentage: 20,
    //     load_maturity_lv_4_percentage: 20,
    // };

    // client.put("/getRecoProfile",
    //     decodeRecoProfileRequest.encode(mRecoProfileRequest),
    //     token,
    //     (err, buf) => {
    //         // comments
    //         if (err) {
    //             console.log(err);
    //             return;
    //         }
    //         console.log(buf.length);
    //         Tool.printYellow("---- end of getRecoProfile ----");
    //     });

}, (fb) => {
    Tool.printRed("Token got failure");
});

// client.get("/register/" + "3748035460303714772", (err, buf) => {
//     if (err) {
//         console.log(err);
//         return;
//     }
//     console.log(buf.length);
// });
