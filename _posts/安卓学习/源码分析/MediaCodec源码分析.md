# MediaCodec源码分析

前面有说过java层的MediaCodec的异步模式《MediaCodec简介与使用详解》，本文将继续进行分析MediaCodec的几个关键函数的native执行流程。



## 初始化流程

```mermaid
sequenceDiagram
java-->>MediaCodec:CreateByType
activate MediaCodec
    MediaCodec->>MediaCodecList:findMatchingCodecs
    loop 使用媒体格式过滤编解码器
        MediaCodecList->>MediaCodecList:list->findCodecByType
        MediaCodecList->>MediaCodecList:codecHandlesFormat
    end
    MediaCodecList->>MediaCodec:matchingCodecs
    loop 
        MediaCodec->>MediaCodec:new codec->init->GetCodecBase->CreateCCodec
        activate MediaCodec
            MediaCodec->>CCodec:CCodec()
            activate CCodec
                    CCodec->>MediaCodec:mCodec
            deactivate CCodec
        deactivate MediaCodec
        MediaCodec->>MediaCodec:kWhatInit
        MediaCodec->>CCodec:initiateAllocateComponent
        activate CCodec
                CCodec->>CCodec:kWhatAllocate->allocate
                activate CCodec
                CCodec->>Codec2Client:CreateFromService("default")
                activate Codec2Client
                        Codec2Client->>CCodec:client
                deactivate Codec2Client
                CCodec->>Codec2Client:CreateComponentByName
                activate Codec2Client
                        Codec2Client->>Codec2Client:client->createComponent->createComponent_aidl
                    Codec2Client-->>ComponentStore:createComponent
                    activate ComponentStore
                    Note over Codec2Client,ComponentStore:AIDL
                    ComponentStore->>C2PlatFormComponentStore:createComponent
                    activate C2PlatFormComponentStore
                    C2PlatFormComponentStore->>C2PlatFormComponentStore:ComponentModule:createComponent
                    C2PlatFormComponentStore->>C2SoftAacDecFactory:createComponent
                    activate C2SoftAacDecFactory
                    C2SoftAacDecFactory-->>CCodec:comp=Component(new C2SoftAacDec())
                    deactivate C2SoftAacDecFactory
                    deactivate C2PlatFormComponentStore
                    deactivate ComponentStore
                deactivate Codec2Client
             deactivate CCodec
             CCodec->>CCodecBufferChannel:setComponent(comp)
             
             CCodec->>CCodecConfig:initialize
             activate CCodecConfig
                CCodecConfig->>Codec2ConfigurableClient:querySupportedParams
                activate Codec2ConfigurableClient
                        Codec2ConfigurableClient->>Codec2ConfigurableClient:mImpl->querySupportedParams
                    activate Codec2ConfigurableClient
                        Codec2ConfigurableClient->>CachedConfigurable:querySupportedParams
                    deactivate Codec2ConfigurableClient
                  deactivate Codec2ConfigurableClient
                Note over Codec2ConfigurableClient,CachedConfigurable:AIDL
                CachedConfigurable-->>CCodecConfig:mParamDescs
            CCodecConfig->>CCodecConfig:initializeStandardParams
            deactivate CCodecConfig
             CCodec->>CCodecConfig:queryConfiguration(comp)
        deactivate CCodec
    end
deactivate MediaCodec
```

整个流程始于应用层通过 `MediaCodec.createDecoderByType` 发起请求，系统首先在编解码器列表中根据媒体格式进行匹配和筛选。找到合适的编解码器后，便开始其初始化过程：在底层会创建一个 `CCodec` 对象，它通过 AIDL 跨进程通信连接到 Codec2 服务，并由平台级的组件工厂实例化出具体的编解码组件实体。**此时，系统会向该组件查询其所有支持的可配置参数，为后续的 `configure` 调用做好准备，但尚未进行具体的格式配置。** 至此，编解码器实例本身已完成创建并获取了能力清单，处于可被配置的初始状态。



## 配置流程

```mermaid
sequenceDiagram
java->>MediaCodec:configure
activate MediaCodec
    Note over MediaCodec:kWhatConfigureinitiate
    MediaCodec->>CCodec:ConfigureComponent
    activate CCodec
        Note over CCodec:kWhatConfigure
        CCodec->>CCodec:configure
        activate CCodec
            CCodec->>CCodecConfig:getConfigUpdateFromSdkParams
            activate CCodecConfig
                CCodecConfig->>CCodec:configUpdate
                deactivate CCodecConfig
                CCodec->>CCodecConfig:setParameters
                activate CCodecConfig
                CCodecConfig->>CCodecConfig:subscribeToConfigUpdate
                activate CCodecConfig
                    CCodecConfig->>Codec2ConfigurableClient:config
                    activate Codec2ConfigurableClient
                        Codec2ConfigurableClient->> CachedConfigurable:config
                        activate CachedConfigurable
                        Note over Codec2ConfigurableClient,CachedConfigurable:AIDL
                            CachedConfigurable->>StoreInf:config
                            activate StoreInf
                            StoreInf->>C2PlatformComponentStore:config_sm
                            activate C2PlatformComponentStore
                            C2PlatformComponentStore->>C2InterfaceHelper:config
                            activate C2InterfaceHelper
                            C2InterfaceHelper-->>CCodecConfig:return
                            deactivate C2PlatformComponentStore
                            deactivate StoreInf
                        deactivate C2InterfaceHelper
                        deactivate CachedConfigurable
                    deactivate Codec2ConfigurableClient
                    CCodecConfig->>CCodecConfig:updateConfiguration
                deactivate CCodecConfig
            deactivate CCodecConfig
            CCodec->>CCodecConfig:queryConfiguration
        deactivate CCodec
     deactivate CCodec
deactivate MediaCodec
```

配置的主要流程是把 SDK 的键转换为 C2Param，根据组件 query 得到 usage/maxInputSize/prepend 等建议并写入 format，校正并验证 client 指定的 max input size，最后把参数通过 config->setParameters 下发给组件或缓冲通道，最后更新内部 config（queryConfiguration）并通知配置结果。

日志中的重要表现在CCodec和CCodecConfig都会输出一些配置信息，CCodec输出的是Android MediaCodec框架层的完整配置信息，包含显示、渲染相关的各种参数，而CCodecConfig则输出底层Codec2组件实际使用的核心编解码参数差异，它采用diff模式只显示发生变化的配置，前者面向应用层接口，后者反映底层编解码器的真实状态。

```
11-05 22:12:06.186  4622  4656 D CCodecConfig: c2 config diff is   c2::u32 coded.pl.level = 20495
11-05 22:12:06.186  4622  4656 D CCodecConfig:   c2::u32 coded.pl.profile = 20484
11-05 22:12:06.186  4622  4656 D CCodecConfig:   c2::u32 default.color.matrix = 5
11-05 22:12:06.186  4622  4656 D CCodecConfig:   c2::u32 default.color.primaries = 6
11-05 22:12:06.186  4622  4656 D CCodecConfig:   c2::u32 default.color.range = 2
11-05 22:12:06.186  4622  4656 D CCodecConfig:   c2::u32 default.color.transfer = 3
11-05 22:12:06.186  4622  4656 D CCodecConfig:   c2::u32 input.buffers.max-size.value = 6220800
11-05 22:12:06.186  4622  4656 D CCodecConfig:   c2::i32 raw.rotation.value = -90
11-05 22:12:06.186  4622  4656 D CCodecConfig:   c2::u32 raw.size.height = 2160
11-05 22:12:06.186  4622  4656 D CCodecConfig:   c2::u32 raw.size.width = 3840
11-05 22:12:06.187  4622  4656 D CCodec  : setup formats input: AMessage(what = 0x00000000) = {
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t height = 2160
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t level = 32768
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t max-input-size = 6220800
11-05 22:12:06.187  4622  4656 D CCodec  :   string mime = "video/avc"
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t profile = 8
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t width = 3840
11-05 22:12:06.187  4622  4656 D CCodec  :   Rect crop(0, 0, 3839, 2159)
11-05 22:12:06.187  4622  4656 D CCodec  : }
11-05 22:12:06.187  4622  4656 D CCodec  : setup formats output: AMessage(what = 0x00000000) = {
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t android._color-format = 2135033992
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t android._video-scaling = 1
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t rotation-degrees = 90
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t color-standard = 6
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t color-range = 2
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t color-transfer = 3
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t sar-height = 1
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t sar-width = 1
11-05 22:12:06.187  4622  4656 D CCodec  :   Rect crop(0, 0, 3839, 2159)
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t width = 3840
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t height = 2160
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t max-height = 240
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t max-width = 320
11-05 22:12:06.187  4622  4656 D CCodec  :   string mime = "video/raw"
11-05 22:12:06.187  4622  4656 D CCodec  :   int32_t android._dataspace = 281411584
11-05 22:12:06.187  4622  4656 D CCodec  : }
```



## 启动流程

```mermaid
sequenceDiagram
java->>MediaCodec:start
activate MediaCodec
Note over MediaCodec:kWhatStart
    MediaCodec->>CCodec:initiateStart
    activate CCodec
    Note over CCodec:kWhatStart
        CCodec->>Codec2Client(Component):start
        activate Codec2Client(Component)
        Codec2Client(Component)->>SimpleC2Component:start
        activate SimpleC2Component
        SimpleC2Component->>C2SoftAvcDec:oninit
        activate C2SoftAvcDec
        C2SoftAvcDec-->>CCodec:return
        deactivate C2SoftAvcDec
        deactivate SimpleC2Component
        deactivate Codec2Client(Component)
            CCodec->>CCodecBufferChannel:start
    deactivate CCodec
deactivate MediaCodec
```

 `CCodecBufferChannel::start` 函数负责初始化编解码器的输入输出缓冲区通道，包括查询组件参数、计算延迟与槽位数量、选择合适的缓冲区类型与内存池、配置加密与安全模式、绑定输出 Surface、设置重排序与音频延迟处理，并最终建立管道控制器以确保数据流畅传输，是编解码流程启动阶段的核心配置逻辑。



## 数据送入流程

```mermaid
sequenceDiagram

Java->>MediaCodec: queueInputbuffer
activate MediaCodec
  Note right of Java: JNI
  Note over MediaCodec:kWhatQueueInputBuffer
  MediaCodec->>MediaCodec: onQueueInputBuffer
  activate MediaCodec
    MediaCodec->>CCodecBufferChannel:queueInputBuffer
    activate CCodecBufferChannel
      CCodecBufferChannel->>CCodecBufferChannel:queueInputBufferInternal
      activate CCodecBufferChannel
        CCodecBufferChannel->>Codec2Client:Component::queue
        activate Codec2Client
        	Codec2Client->>Component:queue
        activate Component
        Note left of Component:aidl
        Component->>SimpleC2Component:queue_nb
        activate SimpleC2Component
        Note over SimpleC2Component:kWhatProcess
        SimpleC2Component->>C2SoftAvcDec:process
        deactivate SimpleC2Component
        deactivate Component
        deactivate Codec2Client
      deactivate CCodecBufferChannel
    deactivate CCodecBufferChannel
  deactivate MediaCodec
deactivate MediaCodec
```

持续更新中。。。
