'use strict';

var driver = require('ruff-driver');

module.exports = driver({

    attach: function (inputs, context) {
        // this._<interface> = inputs['<interface>'];
        var that = this;
        this._uart = inputs['uart'];
        this._uart.on('data', function (data) {
            that.emit('data', data);
        });
    },

    exports: {
        write: function (data, callback) {
            this._uart.write(data, callback);
        },

        read: function (callback) {
            this._uart.read(function (error, data) {
                if (error) {
                    callback(error);
                    return;
                }

                callback(undefined, data.toString());
            });
        }
    }

});
