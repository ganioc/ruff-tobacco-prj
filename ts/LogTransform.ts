import * as fs from "fs";
import * as util from "util";
import { Tool } from "./utility";
import {
    IBakingInfo, IBaseSetting, IDefaultCurve, IInfoCollect,
    IResultInfo, IRunningCurveInfo, IRunningOption, ISettingCurveInfo,
    ISysInfo,
    ITrapBaking,
    ITrapInfo,
    RunningStatus,
    IfCurrentStageInfo,
} from "./BakingCfg";
import { log } from "util";

export class LogTransform {
    constructor(private srcPath: string, private dstPath: string, private SN: string) {
        console.log("constructor()");
        console.log("src path:" + srcPath);
        console.log("dst path:" + dstPath);
        console.log(this.dstPath + this.SN);

        if (!fs.existsSync(this.dstPath + this.SN)) {
            fs.mkdirSync(this.dstPath + this.SN);
        } else {
            Tool.printMagenta("Already exists:" + this.dstPath + this.SN);
        }
    }
    // only for test purpose
    public hello() {
        Tool.print("hello");
        Tool.printYellow(__dirname);
        Tool.printYellow(__dirname + this.srcPath);

        const files = fs.readdirSync(__dirname + this.srcPath);

        console.log(files);
    }
    public copy() {
        const dirs = fs.readdirSync(this.srcPath);

        Tool.printYellow("------> Begin to copy()");

        dirs.forEach((dirName) => {
            const filePath = this.srcPath + "/" + dirName;
            const bDir = fs.lstatSync(filePath).isDirectory();
            console.log("");
            console.log(dirName);
            if (bDir) {
                this.loopDir(dirName, filePath);
            }
        });
    }
    // curingtsrecord.<batchId>.json
    private loopDir(nameFile, nameDir) {
        Tool.printGreen("---------- " + nameDir);

        const files = fs.readdirSync(nameDir);

        // if bakingStatus.json is bad quit the loopDir
        if (!fs.existsSync(nameDir + "/bakingStatus.json")) {
            Tool.printBlink("No bakingStatus.json file, not a complete baking ");
            return;
        }

        const infoStr = fs.readFileSync(nameDir + "/bakingStatus.json");
        let info: IInfoCollect;
        try {
            info = JSON.parse(infoStr.toString());
        } catch (e) {
            Tool.printRed(e);
            Tool.printRed("Broken bakingStatus.json file");
            return;
        }
        // console.log(util.inspect(info, { showHidden: false, depth: null }));

        const nStages = info.RunningCurveInfo.TempDurationList.length;
        const FILE_NAME = "curingtsrecord." + nameFile + ".json";
        const tempDataList = [];

        console.log("Stages: " + nStages);
        console.log("Output file name: " + FILE_NAME);

        // check the file
        for (let index = 0; index < nStages; index++) {
            if (!fs.existsSync(nameDir + "/" + index + ".log")) {
                Tool.printBlink("No " + index + ".log" + ", not a complete baking ");
                return;
            } else {
                console.log(index + ".log exists");
                let logs: any;
                try {
                    const fileStr = fs.readFileSync(nameDir + "/" + index + ".log");
                    logs = JSON.parse(fileStr.toString());

                } catch (e) {

                    Tool.printRed("Wrong parsing " + index + ".log" + ", not a complete baking ");
                    return;
                }
                tempDataList.push(logs);

            }
        }

        // combine it to the correct format
        Tool.print("Write to the required format:");
        const objOut: any = {};
        objOut.batch = parseInt(nameFile, 10);
        objOut.start_timestamp = tempDataList[0].dryLogs[0].timeStamp;
        const tempObj = tempDataList[tempDataList.length - 1].dryLogs;
        objOut.end_timestamp = tempObj[tempObj.length - 1].timeStamp;

        // 所有的信息
        objOut.info_collect = info;

        // temp data collection
        // 实时烘烤数据
        // {
        //     "stage": 0,
        //         "target_dry": 123.5,
        //             "target_web": 123.5,
        //                 "temps": [
        //                     {
        //                         "timestamp": 1234556789,
        //                         "control": "up", //控制棚
        //                         "up_dry": 123.5,
        //                         "up_wet": 123.5,
        //                         "low_dry": 122.5,
        //                         "low_wet": 122.5,
        //                     }
        //                 ]
        // }

        objOut.ts_data = [];
        let strUpperLowerRack: string;

        if (info.BakingInfo.bTempForUpperRack === true) {
            strUpperLowerRack = "up";
        } else {
            strUpperLowerRack = "down";
        }

        for (let j = 0; j < tempDataList.length; j++) {
            const objTemp: any = {};
            objTemp.stage = j;
            objTemp.target_dry = 0;
            objTemp.target_wet = 0;
            objTemp.temps = [];

            for (let k = 0; k < tempDataList[j].dryLogs.length; k++) {
                objTemp.temps.push({
                    timeStamp: tempDataList[j].dryLogs[k].timeStamp,
                    control: strUpperLowerRack,
                    up_dry: tempDataList[j].dryLogs[k].temp1,
                    up_wet: tempDataList[j].dryLogs[k].temp2,
                    low_dry: tempDataList[j].dryLogs[k].temp3,
                    low_wet: tempDataList[j].dryLogs[k].temp4,
                });

            }
            objOut.ts_data.push(objTemp);
        }

        // copy it to the dst directory
        fs.writeFileSync(this.dstPath + this.SN + "/" + FILE_NAME, JSON.stringify(objOut));

    }
}
