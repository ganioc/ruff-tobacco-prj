/**
 * ProtoBuf decoder functions
 */

import * as Protobuf from "protobufjs";
import { Tool } from "./utility";

export interface IfOptionPB {
    path: string;
    className: string;
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

        console.log("encode obj");
        console.log(obj);

        const errMsg = this.decoder.verify(obj);
        if (errMsg) {
            console.log("pb encode verify error");
            console.log(errMsg);
            return new Buffer(0);
        }

        // create a message
        const message = this.decoder.create(obj);

        const buffer = new Buffer(this.decoder.encode(message).finish());
        console.log(buffer);

        return buffer;
    }

    public decode(buf: Buffer): any {
        let messageRx;
        let objRx;

        console.log("proto decode buf:");
        console.log(buf);

        try {
            messageRx = this.decoder.decode(buf);
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
