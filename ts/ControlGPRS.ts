//

declare var $: any;

import { clearInterval } from "timers";
import { ControlPeriph } from "./ControlPeripheral";
import { Tool } from "./utility";

const AT_MESSAGE = Buffer.from("AT+CSQ\r");

export class ControlGPRS {
    private signal_intensity; // 信号强度
    private timer: NodeJS.Timer;

    constructor() {
        // comment
        this.signal_intensity = 0;
        this.timer = undefined;
    }
    public start() {

        clearInterval(this.timer);

        $("#uart-gprs").on("data", (data) => {
            const data_at_tmp = data.toString();
            Tool.printYellow("GPRS intensity:");
            // console.log("%s", data_at_tmp);

            const data_at: number = data_at_tmp.indexOf("+CSQ:");
            if (data_at === -1) {
                this.signal_intensity = 0;
            } else {
                const signal_i = data_at_tmp.substring(15, 17);
                // console.log("%s", signal_i);
                this.signal_intensity = parseInt(signal_i, 10);
            }

            ControlPeriph.vGPRSSignal = this.signal_intensity;
            Tool.printYellow(ControlPeriph.vGPRSSignal);
        });

        setInterval(() => {
            $("#uart-gprs").write(AT_MESSAGE);
        }, 5000);
    }
}
