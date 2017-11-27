import { inspect } from "util";
import { DecodePB, IfBatchDetail } from "../DecodePB";
import { Tool } from "../utility";

const protoFile = __dirname + "/../../data/awesome.proto";

// const decodeRegisterResponse = new DecodePB({
//     path: protoFile,
//     className: "awesomepackage.RegisterResponse",
// });

const decodeAwesomeMessage = new DecodePB({
    path: protoFile,
    className: "awesomepackage.AwesomeMessage",
});
const decodeYBatchDetail = new DecodePB({
    path: protoFile,
    className: "awesomepackage.YBatchDetail",
});
const decodeBatchDetail = new DecodePB({
    path: protoFile,
    className: "awesomepackage.BatchDetail",
});
const buf = new Buffer([
    10, 19, 51, 55, 52, 56, 48, 51, 53, 52, 54, 48, 51, 48, 51, 55, 49, 52, 55, 55,
    50, 18, 10, 50, 76, 79, 80, 101, 107, 73, 87, 81, 81, 26, 10, 49, 75, 109, 106, 48,
    84, 72, 113, 100, 68, 34, 68, 116, 99, 112, 58, 47, 47, 97, 53, 100, 101, 49, 54, 102,
    54, 56, 98, 50, 100, 52, 56, 48, 57, 56, 100, 54, 48, 49, 99, 56, 56, 53, 97, 51,
    97, 97, 52, 52, 52, 46, 109, 113, 116, 116, 46, 105, 111, 116, 46, 103, 122, 46, 98, 97,
    105, 100, 117, 98, 99, 101, 46, 99, 111, 109, 58, 49, 56, 56, 51, 42, 68, 115, 115, 108,
    58, 47, 47, 97, 53, 100, 101, 49, 54, 102, 54, 56, 98, 50, 100, 52, 56, 48, 57, 56,
    100, 54, 48, 49, 99, 56, 56, 53, 97, 51, 97, 97, 52, 52, 52, 46, 109, 113, 116, 116,
    46, 105, 111, 116, 46, 103, 122, 46, 98, 97, 105, 100, 117, 98, 99, 101, 46, 99, 111, 109,
    58, 49, 56, 56, 52, 50, 68, 119, 115, 115, 58, 47, 47, 97, 53, 100, 101, 49, 54, 102,
    54, 56, 98, 50, 100, 52, 56, 48, 57, 56, 100, 54, 48, 49, 99, 56, 56, 53, 97, 51,
    97, 97, 52, 52, 52, 46, 109, 113, 116, 116, 46, 105, 111, 116, 46, 103, 122, 46, 98, 97,
    105, 100, 117, 98, 99, 101, 46, 99, 111, 109, 58, 56, 56, 56, 52, 58, 43, 97, 53, 100,
    101, 49, 54, 102, 54, 56, 98, 50, 100, 52, 56, 48, 57, 56, 100, 54, 48, 49, 99, 56,
    56, 53, 97, 51, 97, 97, 52, 52, 52, 47, 50, 76, 79, 80, 101, 107, 73, 87, 81, 81,
    66, 44, 49, 76, 84, 76, 70, 105, 49, 88, 114, 73, 107, 78, 76, 76, 76, 50, 122, 67,
    77, 56, 87, 116, 76, 47, 118, 109, 113, 83, 81, 78, 97, 79, 105, 52, 47, 118, 110, 108,
    86, 100, 56, 84, 48, 61]);

const payloadObj = {
    sexinfo: true,
    name: "AwesomeString",
    age: 80,
    length: 120,
    ratings: [{ rating: "a", weight: 100 }, { rating: "b", weight: 100 }],
    weight: 20,
    susan: 234234,
    john: 234342,
};

const payloadBuf: Buffer = decodeAwesomeMessage.encode(payloadObj);

console.log(payloadBuf);

Tool.printYellow("======== decode awesome message ===========");
const payloadDecyph = decodeAwesomeMessage.decode(payloadBuf);

Tool.printYellow("Here is the object:");
console.log(payloadDecyph);

const mBatchDetail = {
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
console.log(bufBatchDetail.length);
console.log(bufBatchDetail);

const objNew = decodeBatchDetail.decode(bufBatchDetail);
Tool.printBlue("======== Recovered object ========");
console.log(objNew);
console.log(objNew.startTime);

// const obj = decodeRegisterResponse.decode(buf);
