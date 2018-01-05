import * as fs from "fs";
import Spawn = require("child_process");
import { Tool } from "./utility";

const spawn = Spawn.spawn;

const DIREC = "/dev/disk/by-uuid";
// let dev_connect; // 执行函数test_dev()后，获得当前状态，1表示已插入，0表示未插入
// const file_wait_copy_path = "/ruff/log.data/"; // 等待拷贝的文件路径
const file_wait_copy_path = "/home/root/baking/data/";

// const file_wait_copy = "app.log"; // 等待拷贝的文件名
const file_wait_copy = "";

let dev_name: string;  // 执行函数get_dev_name()后，获得磁盘名
let mount_switch = 0;  // 为0可以执行，为1则不执行，防止同一指令多次执行。
let umount_switch = 0;

function clean_dir() {
    fs.rmdirSync("/tmp/" + dev_name);
    console.log("clean dir finished");
}

export class UDisk {

    public static handle(msg, cb: (err, data) => void) {
        if (msg.name === "query") {
            UDisk.query(cb);
        } else if (msg.name === "mount") {
            UDisk.mount(cb);
        } else if (msg.name === "umount") {
            UDisk.umount(cb);
        } else if (msg.name === "copy") {
            UDisk.copy(cb);
        }
    }
    public static query(cb: (err, data) => void) {
        fs.readdir(DIREC, (err, data) => {
            if (err) {
                console.log("readFile error:" + err);
                cb(err, { name: "query", feedback: 0 });
                return;
            }

            const strDir = data.toString();
            const strFilesArr = strDir.split(",");

            if (strFilesArr.length > 2 && mount_switch === 0) {
                cb(null, { name: "query", feedback: 2 }); // 有磁盘无挂载 2
            } else if (strFilesArr.length > 2 && mount_switch === 1) {
                cb(null, { name: "query", feedback: 3 }); // 有磁盘已挂载 3
            } else if (mount_switch === 0) {
                cb(null, { name: "query", feedback: 1 }); // 无磁盘无挂载 1
            } else if (mount_switch === 1) {
                cb(null, { name: "query", feedback: 4 }); // 无磁盘已挂载，属于异常  直接执行dev_umount()函数
                this.umount(() => {
                    console.log("umount the disk");
                });
            }
        });
    }
    public static mount(cb: (err, data) => void) {
        const lines = fs.readFileSync("/proc/partitions").toString();
        const ret = lines.split("\n");
        const dev = ret[ret.length - 2].split(" ");
        dev_name = dev[dev.length - 1];
        console.log(dev_name);
        console.log("get_dev_name finished");

        fs.exists("/tmp/" + dev_name, (exists) => {
            if (exists) {
                clean_dir();
            }

            if (mount_switch === 0) {
                mount_switch = 1;
                umount_switch = 0;
                fs.mkdirSync("/tmp/" + dev_name);
                const ls = spawn("mount", ["/dev/" + dev_name, "/tmp/" + dev_name]);
                ls.on("exit", (code) => {
                    console.log("dev_mount finished");

                    if (code === 0) {
                        cb(null, { name: "mount", feedback: 1 });
                    } else {
                        cb(null, { name: "mount", feedback: 0 });
                    }
                });
            }
        });
    }
    public static umount(cb: (err, data) => void) {
        if (umount_switch === 0) {
            umount_switch = 1;
            mount_switch = 0;
            const ls = spawn("umount", ["/tmp/" + dev_name]);

            ls.on("exit", (code) => {
                if (code === 0) {
                    console.log("dev_umount finished");
                    clean_dir();
                    cb(null, { name: "umount", feedback: 1 });
                } else {
                    cb(null, { name: "umount", feedback: 0 });
                }
            });
        }
    }
    public static copy(cb: (err, data) => void) {

        const ls = spawn("cp", ["-r", file_wait_copy_path + "/" + file_wait_copy, "/tmp/" + dev_name + "/" + Tool.MachineSN + "/"]);

        ls.on("exit", (code) => {
            if (code === 0) {
                console.log(file_wait_copy_path + file_wait_copy);
                console.log("dev_copy finished");
                console.log(file_wait_copy_path + file_wait_copy);

                cb(null, { name: "copy", feedback: 1 });
            } else {
                cb(null, { name: "copy", feedback: 0 });
            }
        });
    }
}
