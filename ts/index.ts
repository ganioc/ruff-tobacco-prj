
declare var $: any;
// import { ControlMcu } from "./ControlMcu";

import { ControlMcu } from "./ControlMcu";
import { ControlPeriph } from "./ControlPeripheral";
import { Tool } from "./utility";

const uartComm = $("#uart-mcu");

$.ready((error) => {
    if (error) {
        console.log(error);
        return;
    }

    Tool.printMagenta("################");
    Tool.printMagenta("App Begin");
    Tool.printMagenta("################\n");


});

$.end(() => {
    Tool.printMagenta("################");
    Tool.print("Ruff App end");
    Tool.printMagenta("################\n");
});
