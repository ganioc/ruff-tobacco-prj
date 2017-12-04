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
const decodeBatchProfile = new DecodePB({
    path: protoFile,
    className: "awesomepackage.BatchProfile",
});
const decodeProfile = new DecodePB({
    path: protoFile,
    className: "awesomepackage.Profile",
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

console.log("------------reco profile--------");

console.log("-------------before send reco profile --------");

// client.createBatch(
//     decodeBatchDetail.encode(mBatchDetail),
//     TOKEN,
//     (err, buf) => {
//         // comments
//         if (err) {
//             console.log(err);
//             return;
//         }
//         Tool.printYellow("---- got put ----");
//         console.log(buf.length);

//         const objRecoProfile = decodeBatchSummary.decode(new Uint8Array(buf));
//         Tool.printYellow("--------final recovered object");
//         console.log(objRecoProfile);

//         Tool.printYellow("---- end of getRecoProfile ----");
//     });

const mRecoProfile = {
    batchId: 2419,
    deviceId: "2LOPekIWQQ",
    variety: "99",
    barnAirflowDirection: "asdf",
    barnWallTexture: "adsfs",
    loadWeatherTemperature: 12,
    loadTopWeight: 13,
    loadWeatherHumidity: 14,
    loadMiddleWeight: 15,
    loadBottomWeight: 16,
    loadTool: "aaa",
    loadingToolCount: 18,
    loadToolWeight: "asdf",
    loadQuality: "asfd",
    loadMaturityLv_0Percentage: 2,
    loadMaturityLv_1Percentage: 3,
    loadMaturityLv_2Percentage: 4,
    loadMaturityLv_3Percentage: 5,
    loadMaturityLv_4Percentage: 6,
};

// client.getRecoProfile(
//     decodeRecoProfile.encode(mRecoProfile),
//     TOKEN,
//     (err, buf) => {
//         // comments
//         if (err) {
//             console.log(err);
//             return;
//         }
//         Tool.printYellow("---- got put ----");
//         console.log(buf.length);

//         const objProfile = decodeProfile.decode(new Uint8Array(buf));
//         Tool.printYellow("--------final recovered object");
//         console.log(objProfile);

//         Tool.printYellow("---- end of getRecoProfile ----");
//     });

const mBatchProfile = {
    batchId: 2419,
    deviceId: "2LOPekIWQQ",
    profile: {
        items: [
            { mode: 0, targetDryBulbTemp: 20, targetWetBulbTemp: 18, minutes: 60 },
            { mode: 1, targetDryBulbTemp: 50, targetWetBulbTemp: 23, minutes: 80 },
            { mode: 0, targetDryBulbTemp: 50, targetWetBulbTemp: 23, minutes: 80 },
        ],
    },
};

// client.updateProfile(
//     decodeBatchProfile.encode(mBatchProfile),
//     TOKEN,
//     (err, buf) => {
//         // comments
//         if (err) {
//             console.log(err);
//             return;
//         }
//         Tool.printYellow("---- got put ----");
//         console.log(buf.length);

//         const objProfile = decodeBatchProfile.decode(new Uint8Array(buf));
//         Tool.printYellow("--------final recovered object");
//         console.log(objProfile);

//         Tool.printYellow("---- end of getRecoProfile ----");
//     });

const mUpdateBatchDetail = {
    batchId: 2419,
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

client.updateBatch(
    decodeBatchDetail.encode(mUpdateBatchDetail),
    TOKEN,
    (err, buf) => {
        // comments
        if (err) {
            console.log(err);
            return;
        }
        Tool.printYellow("---- got put ----");
        console.log(buf.length);

        const objProfile = decodeBatchSummary.decode(new Uint8Array(buf));
        Tool.printYellow("--------final recovered object");
        console.log(objProfile);

        Tool.printYellow("---- end of getRecoProfile ----");
    });
