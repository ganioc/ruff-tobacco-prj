/**
 * ProtoBuf decoder functions
 */

import * as Protobuf from "protobufjs";
import { inspect } from "util";
import { Tool } from "./utility";

export interface IfOptionPB {
    path: string;
    className: string;
}

export interface IfRecoProfileRequest {
    batchId: number;
    deviceId: string;
    variety: string;
    barn_airflow_direction: string;
    barn_wall_texture: string;
    load_weather_temperature: number;
    load_top_weight: number;
    load_weather_humidity: number;
    load_middle_weight: number;
    load_bottom_weight: number;
    load_tool: string;
    loading_tool_count: number;
    load_tool_weight: string;
    load_quality: string;
    load_maturity_lv_0_percentage: number;
    load_maturity_lv_1_percentage: number;
    load_maturity_lv_2_percentage: number;
    load_maturity_lv_3_percentage: number;
    load_maturity_lv_4_percentage: number;
}
export interface IfBatchRating {
    rating: string;
    weight: number;
}

export interface IfBatchDetail {
    batchId: number;
    deviceId: string;
    startTime: number;
    endTime: number;
    ratings: IfBatchRating[];
    afterTopWeight: number;
    afterMiddleWeight: number;
    afterBottomWeight: number;
    variety: string;
    barnAirflowDirection: string;
    barnWallTexture: string;
    loadWeatherTemperature: number;
    loadTopWeight: number;
    loadWeatherHumidity: number;
    loadMiddleWeight: number;
    loadBottomWeight: number;
    loadTool: string;
    loadToolCount: string;
    loadToolWeight: string;
    loadQuality: string;
    loadMaturityLv_0Percentage: number;
    loadMaturityLv_1Percentage: number;
    loadMaturityLv_2Percentage: number;
    loadMaturityLv_3Percentage: number;
    loadMaturityLv_4Percentage: number;
}

export class DecodePB {
    private root: Protobuf.Root;
    private decoder: Protobuf.Type;

    constructor(options: IfOptionPB) {
        try {
            this.root = Protobuf.loadSync(options.path);
            this.decoder = this.root.lookupType(options.className);
        } catch (e) {
            Tool.printRed("Wrong Protobuf path or class");
            throw (e);
        }

    }

    public encode(obj: any): Buffer {

        console.log("encode obj-->");
        console.log(obj);

        const errMsg = this.decoder.verify(obj);
        if (errMsg) {
            console.log("pb encode verify error");
            console.log(errMsg);
            return new Buffer(0);
        }

        // create a message
        const message = this.decoder.create(obj);
        Tool.printRed(inspect(message));

        const buffer = new Buffer(this.decoder.encode(message).finish());
        console.log(buffer);

        return buffer;
    }

    public decode(buf: Buffer): any {
        let messageRx;
        let objRx;

        console.log("proto decode buf:");
        console.log(buf);
        console.log(buf.toString());
        console.log(buf.length);

        try {
            messageRx = this.decoder.decode(new Uint8Array(buf));
            objRx = this.decoder.toObject(messageRx);
        } catch (e) {
            console.log("Proto decode buffer format error");
            console.log(e);
            return {};
        }

        console.log(objRx);

        return objRx;

    }
}
