import * as fs from "fs";
import * as _ from "underscore";
import { Baking, BakingType, IElementLog, IRunningOption, MoistureProperty } from "./BakingCfg";
import { BakingElement } from "./BakingElement";
import { RunningHandle } from "./BakingProc";
import { BakingSegment } from "./BakingSegment";
import { BakingSlope } from "./BakingSlope";
import { LocalStorage } from "./LocalStorage";
import { Tool } from "./utility";

export class BakingCurve {
    public indexBakingElement: number;
    private bakingElementList: BakingElement[];
    private bakingWetElementList: BakingElement[];

    constructor(options: IRunningOption) {
        this.indexBakingElement = 0;

        this.bakingElementList = [];
        this.bakingWetElementList = [];

        this.updateElementList(options);
    }
    public getBakingElementList(): BakingElement[] {
        return this.bakingElementList;
    }
    public getWetBakingElementList(): BakingElement[] {
        return this.bakingWetElementList;
    }
    public printInfo() {
        Tool.print("BakingCfg: print BakingCurve");
        Tool.print("index:" + this.indexBakingElement);

        _.each(this.bakingElementList, (m) => {
            m.printInfo();
        });
        _.each(this.bakingWetElementList, (m) => {
            m.printInfo();
        });
    }
    public printTestResult() {
        for (let i = 0; i < this.bakingElementList.length; i++) {
            const element = this.bakingElementList[i];
            console.log("\nBaking Element " + i + "\n");

            element.printTestResult();
        }

        for (let i = 0; i < this.bakingWetElementList.length; i++) {
            const element = this.bakingWetElementList[i];
            console.log("\nBaking WetElement " + i + "\n");

            element.printTestResult();
        }
    }
    public getCurrentStageElapsedTime() {
        return this.bakingElementList[this.indexBakingElement].getTimeElapsed();
    }
    public run(): boolean {

        // If has finished all stages
        if (this.indexBakingElement >= this.bakingElementList.length) {
            return false;
        }

        // current drySegment, and wetSegment
        const elementDry: BakingElement = this.bakingElementList[this.indexBakingElement];

        const elementWet: BakingElement = this.bakingWetElementList[this.indexBakingElement];

        let status;

        Tool.print("Baking Index: No " + (this.indexBakingElement + 1) + " of total "
            + (this.bakingElementList.length));

        Tool.print("\nBaking Dry Curve: " + Baking.getBakingType(elementDry.type));

        if (elementDry.type === BakingType.SEGMENT) {
            (elementDry as BakingSegment).run();
        } else if (elementDry.type === BakingType.SLOPE) {
            (elementDry as BakingSlope).run();
        }

        Tool.print("\nBaking Wet Curve: " + Baking.getBakingType(elementWet.type));

        if (elementWet.type === BakingType.SEGMENT) {

            status = (elementWet as BakingSegment).run();
        } else if (elementWet.type === BakingType.SLOPE) {

            status = (elementWet as BakingSlope).run();
        }

        this.saveStageLog(this.indexBakingElement);

        // element.run() is finished
        if (status === false) {
            Tool.print("Continue Running");
            return this.next();
        } else {
            Tool.print("Finished Running");
        }

        return true;

    }
    public reset() {
        this.indexBakingElement = 0;
    }
    public resetStage(stage: number, timeElapsed: number) {
        Tool.print("BakingCfg: resetStage");
        Tool.print("BakingCfg: stage " + stage);
        Tool.print("BakingCfg: timeElapsed:" + timeElapsed);

        this.indexBakingElement = stage;

        // Read out the stored log file with name of stage number
        this.loadStageLog(this.indexBakingElement);

        this.bakingElementList[this.indexBakingElement].setTimeElapsed(timeElapsed);

        this.bakingWetElementList[this.indexBakingElement].setTimeElapsed(timeElapsed);
    }
    // You can change the directory name under Data/ directory , changed by Yang Jun
    public getNameOfHistoryCounter() {
        return RunningHandle.HistoryCounter.toString();
    }
    public getTempDryTarget() {
        const obj: BakingElement = this.bakingElementList[this.indexBakingElement];

        if (obj.type === BakingType.SEGMENT) {
            return obj.tempBegin;
        } else if (obj.type === BakingType.SLOPE) {
            const objSlope: BakingSlope = obj as BakingSlope;
            return objSlope.getTargetTemp();
        }
    }
    public getTempWetTarget() {
        const obj: BakingElement = this.bakingWetElementList[this.indexBakingElement];

        if (obj.type === BakingType.SEGMENT) {
            return obj.tempBegin;
        } else if (obj.type === BakingType.SLOPE) {
            const obj2: BakingSlope = obj as BakingSlope;
            return obj2.getTargetTemp();
        }
    }
    // update dry/wet elementlist , from options
    private updateElementList(options: IRunningOption) {
        options.curve.forEach((element) => {
            const dur = element[4];
            const tBegin = element[0];
            const tEnd = element[1];
            const wBegin = element[2];
            const wEnd = element[3];
            const tDelta = options.timeDelta;

            let objDry;
            let objWet;

            const optionDry = {
                duration: dur,
                moistureType: MoistureProperty.DRY,
                tempBegin: tBegin,
                tempEnd: tEnd,
                timeDelta: tDelta,
            };
            const optionWet = {
                duration: dur,
                moistureType: MoistureProperty.WET,
                tempBegin: wBegin,
                tempEnd: wEnd,
                timeDelta: tDelta,
            };

            if (tBegin === tEnd) {
                objDry = new BakingSegment(optionDry);

            } else {
                objDry = new BakingSlope(optionDry);
            }
            if (wBegin === wEnd) {
                objWet = new BakingSegment(optionWet);

            } else {
                objWet = new BakingSlope(optionWet);
            }

            this.bakingElementList.push(objDry);
            this.bakingWetElementList.push(objWet);
        });

        Tool.printYellow("BakingCfg:elements of curveList:");
        Tool.print(this.bakingElementList);

        Tool.printYellow("BakingCfg:elements of wet curveList:");
        Tool.print(this.bakingWetElementList);
    }

    private loadStageLog(stage: number) {
        if (fs.existsSync(LocalStorage.getDataDirec() + this.getNameOfHistoryCounter() + "/" + stage + ".log")) {
            Tool.print("Already exist: " + LocalStorage.getDataDirec() + this.getNameOfHistoryCounter()
                + "/" + stage + ".log");

            const data = fs.readFileSync(LocalStorage.getDataDirec() + this.getNameOfHistoryCounter()
                + "/" + stage + ".log");

            try {
                const log: IElementLog = JSON.parse(data.toString());
                Tool.print(log);

                log.dryLogs.pop();
                log.wetLogs.pop();

                this.bakingElementList[stage].tempLogs = log.dryLogs;
                this.bakingWetElementList[stage].tempLogs = log.wetLogs;

            } catch (e) {
                Tool.print("Parse InfoCollect failure");
                return;
            }

        } else {
            Tool.print("BakingCfg:Not exist, create it: " + LocalStorage.getDataDirec()
                + this.getNameOfHistoryCounter() + "/" + stage + ".log");

            fs.writeFileSync(LocalStorage.getDataDirec() + this.getNameOfHistoryCounter()
                + "/" + stage + ".log", "{dryLogs:[],wetLogs:[]}");
        }
    }
    private saveStageLog(stage: number) {
        Tool.print("\nSave log, stage: " + stage);

        const log: IElementLog = {
            dryLogs: this.bakingElementList[stage].tempLogs,
            wetLogs: this.bakingWetElementList[stage].tempLogs,
        };
        fs.writeFileSync(LocalStorage.getDataDirec() + this.getNameOfHistoryCounter()
            + "/" + stage + ".log", JSON.stringify(log));

        Tool.print(LocalStorage.getDataDirec() + this.getNameOfHistoryCounter() + "/" + stage + ".log");
    }

    private next(): boolean {

        Tool.print("\nChange from current stage " + (1 + this.indexBakingElement) + "-->");

        this.indexBakingElement++;

        Tool.printYellow("To next stage " + (1 + this.indexBakingElement));

        if (this.indexBakingElement >= this.bakingElementList.length) {
            Tool.print("Finished the whole process");
            this.indexBakingElement--;
            Tool.print("----------------------");

            return false;
        } else {
            Tool.printYellow("OK, go ---->");
            return true;
        }
    }
}
