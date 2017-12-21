
declare var $: any;
import { ControlPeriph } from "../ControlPeripheral";

$.ready((error) => {
    if (error) {
        console.log(error);
        return;
    }
    ControlPeriph.init({
        max_angle: 90,
        min_angle: 0,
        speed: 22.5,
    });

    console.log("hello");

});
