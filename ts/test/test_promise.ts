import * as fs from "fs";
import { Promise } from "promise";

const proc = new Promise((resolve, reject) => {
    setTimeout(() => {
        if (true) {
            resolve("OK");
        }
    }, 1000);
}).then((d: any) => {
    return Promise.resolve("OK");
}, (reason) => {
    return new Promise((reject, resolve) => {
        resolve("OK");
    });
}).then((d) => {
    console.log("ok finished");
}, (d) => {
    console.log("NOK finished");
});
