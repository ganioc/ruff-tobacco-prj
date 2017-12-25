# Write App with Board `tabacco-mb-v1`

烤烟控制器实现

Ruff on Linux 3.x on Freescale imx6s Cortex-A9

烤烟逻辑
GPRS
GPS
GPIO

## 文件结构
```

├── ts
│   ├── Alarm.ts
│   ├── AppConfig.ts
│   ├── BakingCfg.ts         烤烟阶段的数据结构
│   ├── BakingCurve.ts
│   ├── BakingElement.ts
│   ├── BakingProc.ts        烤烟控制，参数
│   ├── BakingSegment.ts
│   ├── BakingSlope.ts
│   ├── ControlAlgorithm.ts  温度**控制算法**
│   ├── ControlGPRS.ts
│   ├── ControlGPS.ts        
│   ├── ControlMcu.ts
│   ├── ControlPeripheral.ts 获取Temp, ADC值, 读取控制GPIO值
│   ├── ControlQT.ts         与QT GUI程序的通信
│   ├── DecodePB.ts          ProtoBuf encode, decode
│   ├── HttpsApp.ts          Https 
│   ├── JustTest.ts
│   ├── LocalStorage.ts
│   ├── MqttApp.ts           Mqtt
│   ├── ProtobufDecode.ts    云端交互的程序
│   ├── index.ts             主程序
│   ├── test
│   │   └── test.ts
│   └── utility.ts


```

## 烤烟运行逻辑
```
RunningHanlde.start()

RunningHandle.checkStatus()    
              bakingCurve.Run()       运行曲线
              bakingElementList       干温度曲线
              bakingWetElemntList     湿温度曲线
              
BakingSegment.run()                   恒温段运行
             .checkTempSensors()
             .keepTempConstant()      
             
BakingSlope.run()                     升温段运行
             .checkTempSensors()
             .keepTempSlope()

             .controlFire( open-time-percentage )   打开燃烧室
             .controlVent( open-time-percentage )   打开风门
             
TempControl.keepConstant(HistoryTempParamList ) 返回on时间，算法实施
           .keepSlope(HistoryTempParamList)     返回on时间，算法实施

RunningHandle.timeDeltaCheckStatus ,  检查温度参数的时间间隔

```

### 解释

1） 烤烟控制器每隔 T= RunningHandle.timeDeltaCheckStatus 检查一次传感器的温度

2） TempControl 根据当前温度T和目标温度进行比较, 差值大于0度关，小于-0.2度则开

3)  湿度的控制，当前温度T和目标温度进行比较，差值大于0则开，小于0则关；

4） 湿度风门的角度变化，开是一次15度，关是一次30度

## 使用说明

1. doc/configguide.md  配置文件说明
2. doc/designguide.md 程序说明