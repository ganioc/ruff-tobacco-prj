'use strict';

var driver = require('ruff-driver');
var gpio = require('gpio');

var Level = gpio.Level;
var Direction = gpio.Direction;

module.exports = driver({

    attach: function (inputs, context) {
        // this._<interface> = inputs['<interface>'];
        this._gpioIn = inputs['gpio-in'];
    },

    exports: {
        read: function (callback) {
            // this._<interface>.<method>
            this._gpioIn.read(callback);
        }
    }

});
