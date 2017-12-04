import { Buffer } from "buffer";
import { inspect } from "util";
import { DecodePB, IfBatchDetail, IfYBatchDetail } from "../DecodePB";
import { Tool } from "../utility";

const protoFile = __dirname + "/../../data/awesome.proto";

const decodeRegisterResponse = new DecodePB({
    path: protoFile,
    className: "awesomepackage.RegisterResponse",
});
const decodeBatchSummary = new DecodePB({
    path: protoFile,
    className: "awesomepackage.BatchSummary",
});
const decodeBatchDetail = new DecodePB({
    path: protoFile,
    className: "awesomepackage.BatchDetail",
});
const decodeProfile = new DecodePB({
    path: protoFile,
    className: "awesomepackage.Profile",
});

const register = new Buffer([
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

const objRegister = decodeRegisterResponse.decode(new Uint8Array(register));

Tool.printYellow(inspect(objRegister));

const strRegister = JSON.stringify(objRegister);

Tool.printGreen(strRegister);

const newRegister = JSON.parse(strRegister);

const testRegister = {
    imei: "3748035460303714772",
    dyId: "2LOPekIWQQ",
    dypassword: "1Kmj0THqdD",
    mqttTcpEndpoint: "tcp://a5de16f68b2d48098d601c885a3aa444.mqtt.iot.gz.baidubce.com:1883",
    mqttSslEndpoint: "ssl://a5de16f68b2d48098d601c885a3aa444.mqtt.iot.gz.baidubce.com:1884",
    mqttWssEndpoint: "wss://a5de16f68b2d48098d601c885a3aa444.mqtt.iot.gz.baidubce.com:8884",
    mqttUsername: "a5de16f68b2d48098d601c885a3aa444/2LOPekIWQQ",
    mqttKey: "1LTLFi1XrIkNLLL2zCM8WtL/vmqSQNaOi4/vnlVd8T0=",
};

const encodeRegister = decodeRegisterResponse.encode(testRegister);
Tool.printRed("Try to encode the object");
console.log(encodeRegister);

Tool.printYellow("============ Another One ================");
/*
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

const payloadBuf = decodeAwesomeMessage.encode(payloadObj);

console.log(payloadBuf);

console.log(payloadBuf.toString());

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

const strBatchDetail = bufBatchDetail.toString();
Tool.printBlue("length of str:" + strBatchDetail.length);

const objNew = decodeBatchDetail.decode(bufBatchDetail);
Tool.printBlue("======== Recovered object ========");
console.log(objNew);
console.log(objNew.startTime);

// const obj = decodeRegisterResponse.decode(buf);
*/

Tool.printRed("---------------- analyze data --------------");

const testDataList = new Uint8Array([8, -24, 18, 18, 10, 50, 76, 79, 80, 101, 107, 73, 87, 81, 81, 24, -60, -126, -63, -34, -128, 44, 32, -60, -126, -63, -34, -128, 44]);

console.log(testDataList);

const objBatchDetail = decodeBatchSummary.decode(testDataList);

console.log(objBatchDetail);

Tool.printYellow("=============Batchdetail================");
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
const objNewBatchDetail = decodeBatchDetail.encode(mBatchDetail);

console.log(objNewBatchDetail);

let resultNor: number = 0;
for (const i in objNewBatchDetail) {
    if (objNewBatchDetail[i]) {
        resultNor = resultNor + objNewBatchDetail[i];
    }
}
Tool.printYellow("resultNor:" + resultNor);

Tool.printYellow("--------- decode Profile ------------");

const dataProfile = new Uint8Array([10, 20, 17, 0, 0, 0, 0, 0, 0, 52, 64, 25, 0, 0, 0, 0, 0, 0, 50, 64, 32, 60, 10, 14, 8, 1, 17, 0, 0, 0, 0, 0, 0, 78, 64, 32, -76, 1]);

const mProfile = decodeProfile.decode(dataProfile);
Tool.printYellow("--- profile result is ---");

console.log(mProfile);
