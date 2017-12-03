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
const decodeBatchRating = new DecodePB({
    path: protoFile,
    className: "awesomepackage.BatchRating",
});
const decodeBatchSummary = new DecodePB({
    path: protoFile,
    className: "awesomepackage.BatchSummary",
});
const decodeRecoProfile = new DecodePB({
    path: protoFile,
    className: "awesomepackage.RecoProfileRequest",
});
const option: IfHttpsApp = {
    hostname: "api.shdingyun.com",
    port: 443,
};
const client = new HttpsApp(option);
let TOKEN: string = "";
/*
const proc = new Promise((resolve, reject) => {
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
proc.then(() => {
    console.log(TOKEN);
});
*/
// const mBatchYang = {

//     batchId: 1,
//     ratings: [{ rating: "a", weight: 23 }],
//     name: "yj",

// };

TOKEN = "eyJhbGciOiJIUzUxMiJ9.eyJhdXRob3JpdGllcyI6IkFVVEhfREVWSUNFIiwic3ViIjoiMzc0ODAzNTQ2MDMwMzcxNDc3MiIsImV4cCI6MTUxMjU3MDgwNX0.YdxrBDbd3oaS0gCquWHzgDomIitRJhlV61dye0NywZQkHzkL_UcQcCMEdswvTFTgqqm-r4unx0-05gHC1xjYhw";

// proc.then((token: string) => {
//     Tool.printGreen("Token got");

const mBatchDetail = {
    batchId: 220,
    deviceId: "2LOPekIWQQ",
    startTime: 1512026685764,
    endTime: 1512026685764,
    ratings: [{ rating: "CCC", weight: 122 }, { rating: "AAA", weight: 3444 }],
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

// Tool.printGreen("data to be sent");
// console.log(mBatchDetail);

// const bufBatchDetail = decodeBatchDetail.encode(mBatchDetail);
// Tool.printGreen(bufBatchDetail.length);
// console.log(bufBatchDetail);

// const objNew = decodeBatchDetail.decode(bufBatchDetail);
// Tool.printBlue("======== Recovered object ========");
// console.log(objNew);

// const mBatchSummary = {
//     batchId: 1,
//     deviceId: "1123",
//     startTime: new Date().getTime(),
//     endTime: new Date().getTime(),
// };
// console.log("-----------batchsummary-------------");
// const bufBatchSummary = decodeBatchSummary.encode(mBatchSummary);
// Tool.printGreen(bufBatchSummary.length);
// console.log(bufBatchSummary);

// const mRecoProfile = {
//     batchId: 1,
//     deviceId: "123",
//     variety: "g",
//     barnAirflowDirection: "dsf",
//     barnWallTexture: "sdf",
//     loadWeatherTemperature: 23,
//     loadTopWeight: 2,
//     loadWeatherHumidity: 23,
//     loadMiddleWeight: 23,
//     loadBottomWeight: 65,
//     loadTool: "sd",
//     loadingToolCount: 88,
//     loadToolWeight: "sdf",
//     loadQuality: "sdf",
//     loadMaturityLv_0Percentage: 2,
//     loadMaturityLv_1Percentage: 3,
//     loadMaturityLv_2Percentage: 4,
//     loadMaturityLv_3Percentage: 5,
//     loadMaturityLv_4Percentage: 6,
// };
// const mBatchRating = {
//     rating: "c",
//     weight: 44,
// };
console.log("------------reco profile--------");
// const bufRecoProfile = decodeRecoProfile.encode(mRecoProfile);
// console.log(bufRecoProfile);

// const objRecoProfile = decodeRecoProfile.decode(bufRecoProfile);
// console.log(objRecoProfile);

console.log("-------------before send reco profile --------");

// client.put("/test/protobuf",
client.put("/batch/device/create",
    decodeBatchDetail.encode(mBatchDetail),
    TOKEN,
    (err, buf) => {
        // comments
        if (err) {
            console.log(err);
            return;
        }
        Tool.printYellow("---- got put ----");
        console.log(buf.length);
        // Tool.printYellow(buf.toString());
        // decode it out
        // let str = buf.toString();
        // str = str.replace("[", "");
        // str = str.replace("]", "");
        // const strLst = str.split(",");
        // const lst = [];
        // for (const i in strLst) {
        //     if (strLst[i]) {
        //         lst.push(parseInt(strLst[i], 10));
        //     }
        // }
        // Tool.printRed(buf);
        // const bufData = new Buffer(buf);
        // console.log(bufData);

        const objRecoProfile = decodeBatchSummary.decode(new Uint8Array(buf));
        Tool.printYellow("--------final recovered object");
        console.log(objRecoProfile);

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

// }, (fb) => {
//     Tool.printRed("Token got failure");
// });
// */

// client.get("/register/" + "3748035460303714772", (err, buf) => {
//     if (err) {
//         console.log(err);
//         return;
//     }
//     console.log(buf.length);
// });
