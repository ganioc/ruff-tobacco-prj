

var AT_MESSAGE = Buffer.from("AT+CSQ\r");

var latitude_degree;//纬度-度
var latitude_minute;//纬度-分
var longitude_degree;//经度-度
var longitude_minute;//经度-分

var signal_intensity;//信号强度



spawn('/ruff/app.data/tabacooui', ['-platform', 'eglfs']);

$('#uart4').on('data', function (data) {
    var data_temp = data.toString();
    var index1 = data_temp.indexOf("$GPRMC");
    if (index1 == 0) {
        var index2 = data_temp.indexOf("*");
        var data_gprmc = data_temp.substring(0, index2);
        console.log('%s', data_gprmc);
        var arr = data_gprmc.split(",");
        if (arr[2] == 'V') {
            latitude_degree = '0';
            latitude_minute = '0';
            longitude_degree = '0';
            longitude_minute = '0';
            console.log('%s,%sN %s,%sS', latitude_degree, latitude_minute, longitude_degree, longitude_minute);
        }
        else if (arr[2] == 'A') {
            console.log('%s', arr[3]);
            var tmp_latitude = arr[3].toString();
            var tmp_longitude = arr[5].toString();
            latitude_degree = tmp_latitude.substring(0, 2);
            latitude_minute = tmp_latitude.substring(2, 7);
            longitude_degree = tmp_longitude.substring(0, 3);
            longitude_minute = tmp_longitude.substring(3, 8);
            console.log('%s,%sN %s,%sS', latitude_degree, latitude_minute, longitude_degree, longitude_minute);
        }
    }
});


/////////////////////////////////////////////////////////////////////////////////////////

$('#uartvx').on('data', function (data) {
    var data_at_tmp = data.toString();
    console.log('%s', data_at_tmp);
    var data_at = data_at_tmp.indexOf("+CSQ:");
    if (data_at == -1) {
        signal_intensity = '0';
    }
    else {
        signal_intensity = data_at_tmp.substring(15, 17);
        console.log('%s', signal_intensity);
    }
});
// $('#uartvx').open();
setInterval(function () {
    $('#uartvx').write(AT_MESSAGE);
}, 1000)


