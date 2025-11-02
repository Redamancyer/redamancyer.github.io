# MediaCodec简介与使用详解

## 简介

**本篇介绍的是java层的MediaCodec。**MediaCodec 是 Android 中的编解码器组件，用来访问底层提供的编解码器，通常与 MediaExtractor、MediaSync、MediaMuxer、MediaCrypto、MediaDrm、Image、Surface 和 AudioTrack 一起使用，MediaCodec 几乎是 Android 播放器硬解码的标配，但是具体使用的是软编解码器还是硬编解码器，还是和 MediaCodec 的配置相关。

### 编解码的流程

MediaCodec 首先获取一个空的输入缓冲区，填充要编码或解码的数据，再将填充数据的输入缓冲区送到 MediaCodec 进行处理，处理完数据后会释放这个填充数据的输入缓冲区，最后获取已经编码或解码的输出缓冲区，使用完毕后释放输出缓冲区，其编解码的流程示意图如下：

![](https://developer.android.com/images/media/mediacodec_buffers.svg)

### 生命周期

|                           同步模式                           |                           异步模式                           |
| :----------------------------------------------------------: | :----------------------------------------------------------: |
| ![MediaCodec state diagram](https://developer.android.com/images/media/mediacodec_states.svg) | ![](https://developer.android.com/images/media/mediacodec_async_states.svg) |

## 使用流程

### 创建

```
// 创建MediaCodec
public static MediaCodec createEncoderByType (String type)
public static MediaCodec createDecoderByType (String type)
```

常用的type：

```
"video/x-vnd.on2.vp8" - VP8 video (i.e. video in .webm)
"video/x-vnd.on2.vp9" - VP9 video (i.e. video in .webm)
"video/avc" - H.264/AVC video
"video/hevc" - H.265/HEVC video
"video/mp4v-es" - MPEG4 video
"video/3gpp" - H.263 video
"audio/3gpp" - AMR narrowband audio
"audio/amr-wb" - AMR wideband audio
"audio/mpeg" - MPEG1/2 audio layer III
"audio/mp4a-latm" - AAC audio (note, this is raw AAC packets, not packaged in LATM!)
"audio/vorbis" - vorbis audio
"audio/g711-alaw" - G.711 alaw audio
"audio/g711-mlaw" - G.711 ulaw audio
```

也可以通过使用 createByCodecName 来创建指定的编解码器，创建时可以借助 MediaCodecList 获取支持的编解码器：

```
public final String findDecoderForFormat(MediaFormat format) {
    return findCodecForFormat(false /* encoder */, format);
}

public final String findEncoderForFormat(MediaFormat format) {
    return findCodecForFormat(true /* encoder */, format);
}

private String findCodecForFormat(boolean encoder, MediaFormat format) {
    String mime = format.getString(MediaFormat.KEY_MIME);
    for (MediaCodecInfo info: mCodecInfos) {
        if (info.isEncoder() != encoder) {
            continue;
        }
        try {
            MediaCodecInfo.CodecCapabilities caps = info.getCapabilitiesForType(mime);
            if (caps != null && caps.isFormatSupported(format)) {
                return info.getName();
            }
        } catch (IllegalArgumentException e) {
            // type is not supported
        }
    }
    return null;
}
```

> 对于上述方法中的参数 MediaFormat 格式中不能包含任何帧率的设置，如果已经设置了帧率需要将其清除再使用。

获取到的编解码器的名称分为两种：**硬解**和**软解**，指的是视频解码的两种不同实现方式：

- **硬解**：使用**专用硬件**解码。硬解编解码器名称特征：
```
// 高通
"OMX.qcom.video.decoder.avc"
"OMX.qcom.video.encoder.avc"
// 三星
"OMX.exynos.video.decoder.avc" 
// 联发科
"OMX.MTK.VIDEO.DECODER.AVC"
// 硬件特征关键词
"omx", "qcom", "exynos", "mtk", "hi", "c2."
```

- **软解**：使用**通用CPU**解码。软解编解码器名称特征：
```
// Google软件编解码器
"OMX.google.h264.decoder"
"OMX.google.h264.encoder"
// 软件特征关键词  
"google", "software", "soft", "sw"
```

> 并非所有标着厂商的都是硬解，部分厂商的编解码器的高分辨率下使用的也是自身的软解实现。

### 初始化

创建 MediaCodec 之后进入 Uninitialized 子状态，此时需要对其进行一些设置如指定 MediaFormat、如果使用的是异步处理数据的方式，在 configure 之前要设置 MediaCodec.Callback，关键 API 如下：

```
// 1. MediaFormat
// 创建MediaFormat
public static final MediaFormat createVideoFormat(String mime,int width,int height)
// 开启或关闭功能，具体参见MediaCodeInfo.CodecCapabilities
public void setFeatureEnabled(@NonNull String feature, boolean enabled)
// 参数设置
public final void setInteger(String name, int value)

// 2. setCallback
// 如果使用的是异步处理数据的方式，在configure 之前要设置 MediaCodec.Callback
public void setCallback (MediaCodec.Callback cb)
public void setCallback (MediaCodec.Callback cb, Handler handler)

// 3. 配置
public void configure(MediaFormat format, Surface surface, MediaCrypto crypto, int flags)
public void configure(MediaFormat format, @Nullable Surface surface,int flags, MediaDescrambler descrambler)
```

### 数据处理

编解码器的数据处理，主要是获取输入、输出缓冲区、提交数据给编解码器、释放输出缓冲区这几个过程，同步方式和异步方式的不同点在于获取输入缓冲区和输出缓冲区的方式。其关键 API 如下：

```
// 获取输入缓冲区(同步)
public int dequeueInputBuffer (long timeoutUs)
public ByteBuffer getInputBuffer (int index)
// 获取输出缓冲区(同步)
public int dequeueOutputBuffer (MediaCodec.BufferInfo info, long timeoutUs)
public ByteBuffer getOutputBuffer (int index)
// 输入、输出缓冲区索引从MediaCodec.Callback的回调中获取，在获取对应的输入、输出缓冲区(异步)
public void setCallback (MediaCodec.Callback cb)
public void setCallback (MediaCodec.Callback cb, Handler handler)
// 提交数据
public void queueInputBuffer (int index, int offset, int size, long presentationTimeUs, int flags)
public void queueSecureInputBuffer (int index, int offset, MediaCodec.CryptoInfo info, long presentationTimeUs, int flags)
// 释放输出缓冲区
public void releaseOutputBuffer (int index, boolean render)
public void releaseOutputBuffer (int index, long renderTimestampNs)
```

同步与异步模式的代码演示：

- 同步模式
```
 MediaCodec codec = MediaCodec.createByCodecName(name);
 codec.configure(format, …);
 MediaFormat outputFormat = codec.getOutputFormat(); // option B
 codec.start();
 for (;;) {
  int inputBufferId = codec.dequeueInputBuffer(timeoutUs);
  if (inputBufferId >= 0) {
    ByteBuffer inputBuffer = codec.getInputBuffer(…);
    // fill inputBuffer with valid data
    …
    codec.queueInputBuffer(inputBufferId, …);
  }
  int outputBufferId = codec.dequeueOutputBuffer(…);
  if (outputBufferId >= 0) {
    ByteBuffer outputBuffer = codec.getOutputBuffer(outputBufferId);
    MediaFormat bufferFormat = codec.getOutputFormat(outputBufferId); // option A
    // bufferFormat is identical to outputFormat
    // outputBuffer is ready to be processed or rendered.
    …
    codec.releaseOutputBuffer(outputBufferId, …);
  } else if (outputBufferId == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
    // Subsequent data will conform to new format.
    // Can ignore if using getOutputFormat(outputBufferId)
    outputFormat = codec.getOutputFormat(); // option B
  }
 }
 codec.stop();
 codec.release();
```


- 异步模式
```
 MediaCodec codec = MediaCodec.createByCodecName(name);
 MediaFormat mOutputFormat; // member variable
 codec.setCallback(new MediaCodec.Callback() {
  @Override
  void onInputBufferAvailable(MediaCodec mc, int inputBufferId) {
    ByteBuffer inputBuffer = codec.getInputBuffer(inputBufferId);
    // fill inputBuffer with valid data
    …
    codec.queueInputBuffer(inputBufferId, …);
  }

  @Override
  void onOutputBufferAvailable(MediaCodec mc, int outputBufferId, …) {
    ByteBuffer outputBuffer = codec.getOutputBuffer(outputBufferId);
    MediaFormat bufferFormat = codec.getOutputFormat(outputBufferId); // option A
    // bufferFormat is equivalent to mOutputFormat
    // outputBuffer is ready to be processed or rendered.
    …
    codec.releaseOutputBuffer(outputBufferId, …);
  }

  @Override
  void onOutputFormatChanged(MediaCodec mc, MediaFormat format) {
    // Subsequent data will conform to new format.
    // Can ignore if using getOutputFormat(outputBufferId)
    mOutputFormat = format; // option B
  }

  @Override
  void onError(…) {
    …
  }
  @Override
  void onCryptoError(…) {
    …
  }
 });
 codec.configure(format, …);
 mOutputFormat = codec.getOutputFormat(); // option B
 codec.start();
 // wait for processing to complete
 codec.stop();
 codec.release();
```

当要处理的数据结束时(End-of-stream)，需要标记流的结束，可以在最后一个有效的输入缓冲区上使用 queueInputBuffer 提交数据的时候指定 flags 为 BUFFER_FLAG_END_OF_STREAM 标记其结束，也可以在最后一个有效输入缓冲区之后提交一个空的设置了流结束标志的输入缓冲区来标记其结束，此时不能够再提交输入缓冲区，除非编解码器被 flush、stop、restart，输出缓冲区继续返回直到最终通过在 dequeueOutputBuffer 或通过 Callback＃onOutputBufferAvailable 返回的 BufferInfo 中指定相同的流结束标志，最终通知输出流结束为止。

如果使用了一个输入 Surface 作为编解码器的输入，此时没有可访问的输入缓冲区，输入缓冲区会自动从这个 Surface 提交给编解码器，相当于省略了输入的这个过程，这个输入 Surface 可由 createInputSurface 方法创建，此时调用 signalEndOfInputStream 将发送流结束的信号，调用后，Surface 将立即停止向编解码器提交数据，关键 API 如下：

```
// 创建输入Surface，需在configure之后、start之前调用
public Surface createInputSurface ()
// 设置输入Surface
public void setInputSurface (Surface surface)
// 发送流结束的信号
public void signalEndOfInputStream ()
```

同理如果使用了输出 Surface，则与之相关的输出缓冲区的相关功能将会被代替，可以通过 setOutputSurface 设置一个 Surface 作为编解码器的输出，可以选择是否在输出 Surface 上渲染每一个输出缓冲区，关键 API 如下：

```
// 设置输出Surface
public void setOutputSurface (Surface surface)
// false表示不渲染这个buffer，true表示使用默认的时间戳渲染这个buffer
public void releaseOutputBuffer (int index, boolean render)
// 使用指定的时间戳渲染这个buffer
public void releaseOutputBuffer (int index, long renderTimestampNs)
```

### 异常处理

关于 MediaCodec 使用过程中的异常处理，这里提一下 CodecException 异常，一般是由编解码器内部异常导致的，比如媒体内容损坏、硬件故障、资源耗尽等，可以通过如下方法判断以做进一步的处理：

```
// true表示可以通过stop、configure、start来恢复
public boolean isRecoverable ()
// true表示暂时性问题，编码或解码操作会在后续重试进行
public boolean isTransient ()
```

> 如果 isRecoverable 和 isTransient 都是返回 false，则需要通过 reset 或 release 操作释放资源后重新工作，两者不可能同时返回 true。
