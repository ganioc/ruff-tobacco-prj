# Config 文件
更改配置文件,app.json，可修改默认参数。app.json文件在项目根目录下可以找到。

```
{
    "devices": [
    ],
    "baking_config": {
        "default_curve": {
            "dryList": [
                [
                    36,  // 该段的起始温度, 单位：摄氏度
                    36   // 该段的终止温度
                ],
                [
                    36,
                    38
                ]
            ],
            "wetList": [
                [
                    34,
                    34
                ],
                [
                    34,
                    36
                ]
            ],
            "durList": [
                2,    // 该段的运行时间, 单位:分钟
                2
            ]
        },
        "tobacco_type": [  // 烟叶种类，用数组表示
            {
                "name": "大金华",
                "id": 1
            },
            {
                "name": "小金华",
                "id": 2
            }
        ],
        "quality_level": [  // 烟叶的评级标准，用数组表示
            {
                "name": "优等",
                "id": 1
            },
            {
                "name": "中等",
                "id": 2
            },
            {
                "name": "下等",
                "id": 3
            }
        ],
        "alarm_threshold": {  // 告警门限值设定
            "max_temp": 70,
            "min_temp": 0,
            "alarm_checking_period": 5000,
            "dry_temp_alarm_period": 30,
            "dry_temp_alarm_limit": 2,
            "dry_temp_alarm_period_2": 10,
            "dry_temp_alarm_limit_2": 4,
            "wet_temp_alarm_period": 10,
            "wet_temp_alarm_limit": 2
        },
        "base_setting": {  // 基础设置
            "GPSInfo": {
                "Longitude": 0,
                "Altitude": 0
            },
            "AirFlowPattern": "rise",  // 气流方向，"rise" 上升，  "fall"下降
            "InnerHeight": 23,  // 内高， 米
            "WallMaterial": 0,  // 墙体材质， 0 - 板式， 1 - 砖混
            "ControllerName": "控制器Alpha",
            "LocName": "上海市浦东新区金科路"
        }
    }
}
```
