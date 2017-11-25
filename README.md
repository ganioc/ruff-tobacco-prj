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
│   ├── BakingCfg.ts         烤烟阶段的数据结构
│   ├── BakingCurve.ts
│   ├── BakingElement.ts
│   ├── BakingProc.ts        烤烟控制，参数
│   ├── BakingSegment.ts
│   ├── BakingSlope.ts
│   ├── ControlAlgorithm.ts  温度**控制算法**
│   ├── ControlGPS.ts        
│   ├── ControlMcu.ts
│   ├── ControlPeripheral.ts 获取Temp, ADC值, 读取控制GPIO值
│   ├── ControlQT.ts         与QT GUI程序的通信
│   ├── DecodePB.ts          ProtoBuf encode, decode
│   ├── HttpsApp.ts          Https 
│   ├── LocalStorage.ts
│   ├── MqttApp.ts           Mqtt
│   ├── index.ts             主程序
│   ├── test
│   │   └── test.ts
│   ├── utility.ts
│   └── yjasync.ts

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

2） TempControl 根据历史温度数据，利用算法，给出下一段T内，燃烧室或风门打开的时间比例，打开时间 = T * percentage (0.0 ~1.0)

3)  通过周期性地改变风门，燃烧门的开关状态，实现温控

4)  风门的开合角度控制，也可以做类似的处理

