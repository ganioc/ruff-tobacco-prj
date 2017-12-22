'use strict';

var driver = require('ruff-driver');
var gpio = require('gpio');

var Level = gpio.Level;
var Direction = gpio.Direction;


module.exports = driver({

    attach: function (inputs, context) {
        // this._<interface> = inputs['<interface>'];
        this._gpioOut = inputs['gpio-out'];
    },

    exports: {
        turnOn: function (callback) {
            // this._<interface>.<method>
            this._gpioOut.write(Level.high, callback);
        },
        turnOff: function (callback) {
            this._gpioOut.write(Level.low, callback);
        }
    }

});
