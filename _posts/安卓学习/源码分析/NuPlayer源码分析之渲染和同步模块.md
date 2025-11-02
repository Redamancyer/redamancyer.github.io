# NuPlayer源码分析之渲染和同步模块

> 本文内容的源码全摘录自[android14-qpr3-release](https://cs.android.com/android/platform/superproject/+/android14-qpr3-release:)，悉知！

## 音视频数据缓存

首先我们先来看渲染模块，先回忆一下上一篇的解码模块，其中在创建了解码器后并设置了回调：

```c++
////frameworks/av/media/libmediaplayerservice/nuplayer/NuPlayerDecoder.cpp
void NuPlayer::Decoder::onConfigure(const sp<AMessage> &format)
{
    //...
    // 根据类型创建解码器
    mCodec = MediaCodec::CreateByType(
        mCodecLooper, mime.c_str(), false /* encoder */, NULL /* err */, mPid, mUid, format);
    //...
    err = mCodec->configure( format, mSurface, crypto, 0 /* flags */);// 配置解码器
    //...
    sp<AMessage> reply = new AMessage(kWhatCodecNotify, this);
    mCodec->setCallback(reply);// 设置解码器回调
    err = mCodec->start();// 启动解码器
    //...
}
```

设置了回调后解码器就会通过会回调来通知**NuPlayer**取走解码后的数据，最终的调用到**onQueueBuffer**来操作。调用链**NuPlayer**:**Decoder**:**onMessageReceived=**>**handleAnOutputBuffer**=>**NuPlayer**:**Renderer**:**queueBuffer**=>**onQueueBuffer**。

```c++
//frameworks/av/media/libmediaplayerservice/nuplayer/NuPlayerRenderer.cpp
void NuPlayer::Renderer::onQueueBuffer(const sp<AMessage> &msg) {
    //...
    // 获取需要被缓存的解码数据
    sp<MediaCodecBuffer> buffer = static_cast<MediaCodecBuffer *>(obj.get());
    sp<AMessage> notifyConsumed;
    CHECK(msg->findMessage("notifyConsumed", &notifyConsumed));
		// 创建队列实体对象，并将解码后的buffer传递进去
    QueueEntry entry;
    entry.mBuffer = buffer;
    entry.mNotifyConsumed = notifyConsumed;
    entry.mOffset = 0;
    entry.mFinalResult = OK;
    entry.mBufferOrdinal = ++mTotalBuffersQueued;// 当前队列实体在队列中的序号
    if (audio) {
        Mutex::Autolock autoLock(mLock);
        mAudioQueue.push_back(entry);// 将包含了解码数据的队列实体添加到音频队列队尾
        postDrainAudioQueue_l();// 刷新/播放音频
    } else {
        mVideoQueue.push_back(entry);// 将包含了解码数据的队列实体添加到音频队列队尾
        postDrainVideoQueue();// 刷新/播放视频
    }
    //...
    // 计算队列中第一帧视频和第一帧音频的时间差值,如果音频播放比视频播放的时间超前大于0.1秒，则丢弃掉音频数据
    syncQueuesDone_l();// 刷新/播放音视频数据
}

//frameworks/av/media/libmediaplayerservice/nuplayer/include/nuplayer/NuPlayerRenderer.h
// 补充一下NuPlayerRenderer中的缓存数据的结构
struct QueueEntry {
    sp<MediaCodecBuffer> mBuffer;
    sp<AMessage> mMeta;
    sp<AMessage> mNotifyConsumed;// 如果该字段为NULL，则表示当前QueueEntry是最后一个（EOS）。
    size_t mOffset;
    status_t mFinalResult;
    int32_t mBufferOrdinal;
};
List<QueueEntry> mAudioQueue;// 用以缓存音频解码数据的队列，队列实体为QueueEntry
List<QueueEntry> mVideoQueue;// 用以缓存视频解码数据的队列，队列实体为QueueEntry
```

## 音频数据播放

### 音频设备初始化与启动

音频的播放最终都绕不开**AudioSink**对象。**NuPlayer**中的**AudioSink**对象早在**NuPlayer**播放器创建时就已经创建，并传入**NuPlayer**体系中，可以回过头去看看[NuPlayer源码分析之播放器创建](NuPlayer源码分析之播放器创建.md)中**setDataSource_pre**中**mAudioOutput**。而`AudioSink`的初始化和启动动作是在创建解码器的过程中，也就是**NuPlayer**:**instantiateDecoder**函数调用创建音频解码器的时候。可以去回顾一下[NuPlayer源码分析之解码模块](NuPlayer源码分析之解码模块.md)。然后通过调用链最终在**onOpenAudioSink**中实现操作：**NuPlayer**::**instantiateDecoder** => **determineAudioModeChange** => **tryOpenAudioSinkForOffload** => **NuPlayer**::**Renderer**::**openAudioSink** => **onOpenAudioSink**。

```c++
//frameworks/av/media/libmediaplayerservice/nuplayer/NuPlayerRenderer.cpp
status_t NuPlayer::Renderer::onOpenAudioSink(const sp<AMessage> &format, bool offloadOnly, bool hasVideo, uint32_t flags, bool isStreaming)
{
    //代码太多，只取重要的...
    // 调用mAudioSink的open函数
    err = mAudioSink->open(
        sampleRate,
        numChannels,
        (audio_channel_mask_t)channelMask,
        audioFormat,
        0 /* bufferCount - unused */,
        &NuPlayer::Renderer::AudioSinkCallback,
        this,
        (audio_output_flags_t)offloadFlags,
        &offloadInfo);
    // 如果open成功，设置播放速率
    if (err == OK)
    {
        err = mAudioSink->setPlaybackRate(mPlaybackSettings);
    }
    // 如果设置播放速率成功，保存offload信息并开始播放
    if (err == OK)
    {
        mCurrentOffloadInfo = offloadInfo;
        if (!mPaused)
        { // for preview mode, don't start if paused
            err = mAudioSink->start();
        }
        ALOGV_IF(err == OK, "openAudioSink: offload succeeded");
    }    
    // 如果音频输出设备发生变化，调用onAudioSinkChanged函数
    if (audioSinkChanged)
    {
        onAudioSinkChanged();
    } 
    // 设置音频未被销毁标志为false
    mAudioTornDown = false;
    // 返回OK表示操作成功
    return OK;
}
```

在这个函数执行完启动**AudioSink**的操作后，只需要往**AudioSink**中写数据，音频数据便能够得到输出。

### 音频数据输出

让我们回到开始的**onQueueBuffer**中，这个函数执行时，当数据被缓存在音频队列后，**postDrainAudioQueue_l**便会执行，让数据最终写入到**AudioSink**中播放。而**postDrainAudioQueue_l**又通过**Nativehandler**机制调用了**onDrainAudioQueue**。

```c++
bool NuPlayer::Renderer::onDrainAudioQueue()
{
    //删掉了大量代码...
    while (!mAudioQueue.empty())
    {// 如果音频的缓冲队列中还有数据，循环就不停止
        QueueEntry *entry = &*mAudioQueue.begin(); // 取出队首队列实体
        mLastAudioBufferDrained = entry->mBufferOrdinal;
        // ignore 0-sized buffer which could be EOS marker with no data
        if (entry->mOffset == 0 && entry->mBuffer->size() > 0) {
            int64_t mediaTimeUs;// 获取数据块的时间
            CHECK(entry->mBuffer->meta()->findInt64("timeUs", &mediaTimeUs));
            ALOGV("onDrainAudioQueue: rendering audio at media time %.2f secs",
                    mediaTimeUs / 1E6);
            onNewAudioMediaTime(mediaTimeUs);// 将新的媒体时间更新到MediaClock中
        }
        size_t copy = entry->mBuffer->size() - entry->mOffset;
        // 写入AudioSink，此时应该能可以听到声音了。
        ssize_t written = mAudioSink->write(entry->mBuffer->data() + entry->mOffset, copy, false);
        entry->mOffset += written;
        size_t remainder = entry->mBuffer->size() - entry->mOffset;
        if ((ssize_t)remainder < mAudioSink->frameSize())
        {
            entry->mNotifyConsumed->post();         // 通知解码器数据已经消耗
            mAudioQueue.erase(mAudioQueue.begin()); // 从队列中删掉已经播放的数据实体
            entry = NULL;
        }
    }
    // 计算我们是否需要重新安排另一次写入
    bool reschedule = !mAudioQueue.empty() && (!mPaused || prevFramesWritten != mNumFramesWritten);
    return reschedule;
}
```

到这里，已经很清楚了，音频播放流程如下:先打开音频后端，然后当向音频队列中发送数据时，音频队列同时向音频后端写入数据，以供播放音频。

## 视频数据播放

视频数据输出的时机几乎和音频数据输出是一样的，即在播放器创建完成并启动后便开始了。区别只是，音频执行了**postDrainAudioQueue_l**，而视频执行的是：**postDrainVideoQueue**。

```c++
//frameworks/av/media/libmediaplayerservice/nuplayer/NuPlayerRenderer.cpp
void NuPlayer::Renderer::postDrainVideoQueue() {
    QueueEntry &entry = *mVideoQueue.begin(); // 从队列中取数据
    sp<AMessage> msg = new AMessage(kWhatDrainVideoQueue, this);
    msg->post(delayUs > twoVsyncsUs ? delayUs - twoVsyncsUs : 0);
    mDrainVideoQueuePending = true;
}
```

这里删除了和同步相关的代码，留到下一节去展开。可以看到函数使用NativeHandler机制，然后调用了**onDrainVideoQueue**。

```c++
void NuPlayer::Renderer::onDrainVideoQueue() {
    QueueEntry *entry = &*mVideoQueue.begin();

    entry->mNotifyConsumed->setInt64("timestampNs", realTimeUs * 1000ll);
    entry->mNotifyConsumed->setInt32("render", !tooLate);
    entry->mNotifyConsumed->post(); // 通知解码器已经消耗数据
    mVideoQueue.erase(mVideoQueue.begin()); // 删掉已经处理的数据
    entry = NULL;

    if (!mPaused) {
        if (!mVideoRenderingStarted) {
            mVideoRenderingStarted = true;
            notifyVideoRenderingStart();
        }
        Mutex::Autolock autoLock(mLock);
        notifyIfMediaRenderingStarted_l(); // 向上层（播放器）通知渲染开始
    }
}
```

同样有删除了和同步相关的代码。可能有人有疑问，这里并没有类似于向**AudioSink**中写数据的操作啊！怎么就渲染了！相较于音频而言，显示视频数据的设备(**Surface**)和**MediaCodec**高度绑定，这个函数能做的，只是将数据实体通过**NativeHandler**消息的机制，通过**mNotifyConsumed**传递给**MediaCodec**，告诉解码器就可以了。所以，在entry->mNotifyConsumed->post()函数执行后，回调函数将最终执行到**NuPlayer**:**Decoder**:**onRenderBuffer**随后便会播放。

## 音视频同步

Android NuPlayer同步方案是**音频同步**。意思是：优先以音频数据的播放时间为参考时钟，视频数据根据音频数据的播放时间做参考，如果视频超前将会被延迟播放，如果落后将会被快速播放或者丢弃。

### 媒体时钟

在分析音视频同步代码之前，先来看看一个比较重要的类**MediaClock**，它作为音视频同步的参考时钟。

```c++
//frameworks/av/media/libstagefright/include/media/stagefright/MediaClock.h
struct MediaClock : public AHandler {
    // 定义定时器原因的枚举
    enum {
        TIMER_REASON_REACHED = 0,
        TIMER_REASON_RESET = 1,
    };
    MediaClock(); // 构造函数
    void init(); // 初始化函数
    void setStartingTimeMedia(int64_t startingTimeMediaUs); // 设置起始媒体时间
    void clearAnchor(); // 清除锚点
    // 在暂停状态下，必须使用刚渲染帧的时间戳作为锚点时间
    void updateAnchor( int64_t anchorTimeMediaUs, int64_t anchorTimeRealUs, int64_t maxTimeMediaUs = INT64_MAX); // 更新锚点时间
    void updateMaxTimeMedia(int64_t maxTimeMediaUs); // 更新最大媒体时间
    void setPlaybackRate(float rate); // 设置播放速率
    float getPlaybackRate() const; // 获取播放速率
    // 查询与实际时间realUs对应的媒体时间，并将结果保存在outMediaUs中
    status_t getMediaTime( int64_t realUs, int64_t *outMediaUs, bool allowPastMaxTime = false) const;
    // 查询与媒体时间targetMediaUs对应的实际时间，结果保存在outRealUs中
    status_t getRealTimeFor(int64_t targetMediaUs, int64_t *outRealUs) const;
    // 请求设置定时器。目标时间为mediaTimeUs，根据adjustRealUs的系统时间进行调整。
    // 换句话说，唤醒时间为mediaTimeUs + (adjustRealUs / 播放速率)
    void addTimer(const sp<AMessage> &notify, int64_t mediaTimeUs, int64_t adjustRealUs = 0); // 添加定时器
    void setNotificationMessage(const sp<AMessage> &msg); // 设置通知消息
    void reset(); // 重置
private:
    // 定时器结构体
    struct Timer {
        Timer(const sp<AMessage> &notify, int64_t mediaTimeUs, int64_t adjustRealUs);
        const sp<AMessage> mNotify;
        int64_t mMediaTimeUs;
        int64_t mAdjustRealUs;
    };
    status_t getMediaTime_l(int64_t realUs,int64_t *outMediaUs,bool allowPastMaxTime) const; // 获取媒体时间（内部函数）
    void processTimers_l(); // 处理定时器（内部函数）
    void updateAnchorTimesAndPlaybackRate_l(int64_t anchorTimeMediaUs, int64_t anchorTimeRealUs , float playbackRate); // 更新锚点时间和播放速率（内部函数）
    void notifyDiscontinuity_l(); // 通知不连续性（内部函数）
    sp<ALooper> mLooper;
    int64_t mAnchorTimeMediaUs; // 锚定媒体时间:数据块中的媒体时间
    int64_t mAnchorTimeRealUs; // 锚定显示时间：数据块的实时显示时间
    int64_t mMaxTimeMediaUs; // 最大媒体时间
    int64_t mStartingTimeMediaUs; // 开始播放时的媒体时间
    float mPlaybackRate;// 播放速率
    int32_t mGeneration;
    std::list<Timer> mTimers;
    sp<AMessage> mNotify;
};
```

### 音视同步-音频

音频数据对音视同步中的贡献，就是提供自己的播放时间，用以更新**MediaClock**。而音频数据播放的时间已经在**音频数据输出**一节中讲到，是在`NuPlayer:Renderer:onDrainAudioQueue()`函数中完成的。现在重点关注一下音视频同步相关的函数**onNewAudioMediaTime**。

```c++
//frameworks/av/media/libmediaplayerservice/nuplayer/NuPlayerRenderer.cpp
void NuPlayer::Renderer::onNewAudioMediaTime(int64_t mediaTimeUs) {
    Mutex::Autolock autoLock(mLock);
    // TRICKY: vorbis 解码器生成具有相同时间戳的多个帧，因此仅在具有给定时间戳的第一个帧上进行更新
    if (mediaTimeUs == mAudioAnchorTimeMediaUs) {
        return;
    }
    setAudioFirstAnchorTimeIfNeeded_l(mediaTimeUs);// 通过第一次的媒体时间更新第一帧锚点媒体时间

    // 如果我们正在等待音频接收器启动，则mNextAudioClockUpdateTimeUs为-1
    if (mNextAudioClockUpdateTimeUs == -1) {
        AudioTimestamp ts;
        if (mAudioSink->getTimestamp(ts) == OK && ts.mPosition > 0) {
            mNextAudioClockUpdateTimeUs = 0; // 开始我们的时钟更新
        }
    }
    int64_t nowUs = ALooper::GetNowUs();
    if (mNextAudioClockUpdateTimeUs >= 0) {
        if (nowUs >= mNextAudioClockUpdateTimeUs) {
            // 将当前播放音频流时间戳、系统时间、音频流当前媒体时间戳更新到MediaClock
            int64_t nowMediaUs = mediaTimeUs - getPendingAudioPlayoutDurationUs(nowUs);
            mMediaClock->updateAnchor(nowMediaUs, nowUs, mediaTimeUs);
            mUseVirtualAudioSink = false;
            mNextAudioClockUpdateTimeUs = nowUs + kMinimumAudioClockUpdatePeriodUs;
        }
    } else {
        int64_t unused;
        // 如果当前没有等待音频时钟更新的时间，则检查是否应该切换到系统时钟，这种情况可能发生在音频输出设备出现问题时。
        if ((mMediaClock->getMediaTime(nowUs, &unused) != OK)
                && (getDurationUsIfPlayedAtSampleRate(mNumFramesWritten)
                        > kMaxAllowedAudioSinkDelayUs)) {
            ALOGW("AudioSink stuck. ARE YOU CONNECTED TO AUDIO OUT? Switching to system clock.");
            mMediaClock->updateAnchor(mAudioFirstAnchorTimeMediaUs, nowUs, mediaTimeUs);
            mUseVirtualAudioSink = true;
        }
    }
    mAnchorNumFramesWritten = mNumFramesWritten;
    mAudioAnchorTimeMediaUs = mediaTimeUs;
    mAnchorTimeMediaUs = mediaTimeUs;
}
```

### 音视同步-视频

同样，涉及到同步的代码，和视频数据播放是放在一起的，在**视频数据播放**中已经提到过。重新拿出来分析音视同步部分的代码。

```c++
void NuPlayer::Renderer::postDrainVideoQueue() {
    QueueEntry &entry = *mVideoQueue.begin();
    sp<AMessage> msg = new AMessage(kWhatDrainVideoQueue, this);
    bool needRepostDrainVideoQueue = false;
    int64_t delayUs;
    int64_t nowUs = ALooper::GetNowUs();
    int64_t realTimeUs;
	if (mFlags & FLAG_REAL_TIME) {
        // ...
    } else {
        int64_t mediaTimeUs;
        CHECK(entry.mBuffer->meta()->findInt64("timeUs", &mediaTimeUs)); // 获取媒体时间
        {
            Mutex::Autolock autoLock(mLock);
             // mAnchorTimeMediaUs 该值会在onNewAudioMediaTime函数中，随着音频播放而更新
             // 它的值如果小于零的话，意味着没有音频数据
            if (mAnchorTimeMediaUs < 0) { // 没有音频数据，则使用视频将以系统时间为准播放
                // 只有视频的情况，使用媒体时间和系统时间更新MediaClock
                mMediaClock->updateAnchor(mediaTimeUs, nowUs, mediaTimeUs);
                mAnchorTimeMediaUs = mediaTimeUs;
                realTimeUs = nowUs;
            } else if (!mVideoSampleReceived) { // 没有收到视频帧 
                // 显示时间为当前系统时间，意味着一直显示第一帧
                realTimeUs = nowUs;
            } else if (mAudioFirstAnchorTimeMediaUs < 0
                || mMediaClock->getRealTimeFor(mediaTimeUs, &realTimeUs) == OK) { 
                // 一个正常的音视频数据，通常都走这里
                realTimeUs = getRealTimeUs(mediaTimeUs, nowUs); // 获取视频数据的显示时间
            } else if (mediaTimeUs - mAudioFirstAnchorTimeMediaUs >= 0) {
              	// 其它情况，视频的显示时间就是系统时间
                needRepostDrainVideoQueue = true;
                realTimeUs = nowUs;
            } else {
                realTimeUs = nowUs; // 其它情况，视频的显示时间就是系统时间
            }
        }
        if (!mHasAudio) { // 没有音频流的情况下，
            // 平滑的输出视频需要 >= 10fps, 所以，以当前视频流的媒体时间戳+100ms作为maxTimeMedia
            mMediaClock->updateMaxTimeMedia(mediaTimeUs + 100000);
        }

        delayUs = realTimeUs - nowUs; // 计算视频播放的延迟
        int64_t postDelayUs = -1;
        if (delayUs > 500000) { // 如果延迟超过500ms
            postDelayUs = 500000; // 将延迟时间设置为500ms
            if (mHasAudio && (mLastAudioBufferDrained - entry.mBufferOrdinal) <= 0) {、
                // 如果有音频，并且音频队列的还有未消耗的数据又有新数据增加，则将延迟时间设为10ms
                postDelayUs = 10000;
            }
        } else if (needRepostDrainVideoQueue) {
            postDelayUs = mediaTimeUs - mAudioFirstAnchorTimeMediaUs;
            postDelayUs /= mPlaybackRate;
        }

        if (postDelayUs >= 0) { // 以音频为基准，延迟时间通常都大于零
            msg->setWhat(kWhatPostDrainVideoQueue);
            msg->post(postDelayUs); // 延迟发送，播放视频数据
            mVideoScheduler->restart();
            mDrainVideoQueuePending = true;
            return;
        }
    }
    // 依据Vsync机制调整计算出两个Vsync信号之间的时间
    realTimeUs = mVideoScheduler->schedule(realTimeUs * 1000) / 1000;
    int64_t twoVsyncsUs = 2 * (mVideoScheduler->getVsyncPeriod() / 1000);
    delayUs = realTimeUs - nowUs;
    // 将Vsync信号的延迟时间考虑到视频播放指定的延迟时间中去
    msg->post(delayUs > twoVsyncsUs ? delayUs - twoVsyncsUs : 0);
    mDrainVideoQueuePending = true;
}
```

代码已经挺详细的了，其中提到了Vsync机制的概念。在Android中，这是一种垂直同步机制，用于处理两个处理速度不同的模块存在。为了使显示的数据正确且稳定，在视频播放过程中，有两种buffer的概念，一种是处理数据的buffer，一种是专门用于显示的buffer，前者由我们的程序提供，后者往往需要驱动程序支持。因为两者的处理速度不同，所以就使用了Vsync机制。详细的，可以看我找的两篇参考文献。当执行msg->post之后，消息会在指定的延迟时间后，触发解码器给显示器提供视频数据。音视频也就完了。

# 参考文献

[NuPlayer源码分析四：渲染模块&音视频同步](https://blog.csdn.net/qq_25333681/article/details/90614267)

Android 音视频开发_何俊林.pdf中的5.5 NuPlayer的渲染模块

[Vsync 信号机制和 UI 刷新流程](https://www.51cto.com/article/694573.html)

[Android 显示系统：Vsync机制](https://www.cnblogs.com/blogs-of-lxl/p/11443693.html)
