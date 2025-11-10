# Google_CTS快速调试

> 若需要push媒体文件夹按下面方法操作，不用push测试资源的跳过前两项。
## 资源导入

将资源文件的需要提前push到/data/local/tmp/CtsMediaPerformanceClassTestCases-3.2，CtsMediaPerformanceClassTestCases-3.2需要和模块源码中用到的名字一致。



## 修改资源目录

将WorkDirBase.java下的getMediaDirString中的return值，这样测试apk就可以直接访问本地的媒体测试文件了。

```
# cts/tests/media/common/src/android/mediav2/common/cts/WorkDirBase.java
protected static final String getMediaDirString(String defaultFolderName) {
      android.os.Bundle bundle = InstrumentationRegistry.getArguments();
      String mediaDirString = bundle.getString(MEDIA_PATH_INSTR_ARG_KEY);
      if (mediaDirString == null) {
          return getTopDirString() + "test/" + defaultFolderName + "/";
      }
      // user has specified the mediaDirString via instrumentation-arg
      if (mediaDirString.endsWith(File.separator)) {
          return mediaDirString;
      }
      //return mediaDirString + File.separator;
      return  "/data/local/tmp/"+defaultFolderName+"/";
  }
```



## 编译、运行与日志抓取

```bash
#!/bin/bash
# TEST_MODULE=CtsMediaMiscTestCases
# TEST_SUBMODULE="android.media.misc.cts.MediaCodecListTest#testAllHardwareAcceleratedVideoCodecsPublishPerformancePoints"

# 这个测试项不用预置资源
# TEST_MODULE="CtsMediaAudioTestCases" 
# TEST_SUBMODULE="android.media.audio.cts.AudioPlaybackConfigurationTest#testMediaPlayerMuteFromStreamVolumeNotification"

# 设置环境变量
source build/envsetup.sh

# 选择编译目标
lunch aosp_arm64-ap3a-userdebug

# 允许缺失的依赖项
export ALLOW_MISSING_DEPENDENCIES=true

echo "--开始编译$TEST_MODULE.apk--"

# 添加编译失败检测逻辑
start_time=$(date +%s)  # 记录开始时间
if ! make $TEST_MODULE -j16; then
    echo -e "\033[31m**build failed (cost $(( $(date +%s) - $start_time ))s)**\033[0m"
    exit 1
else
    echo -e "\033[32m**build successfully! cost $(( $(date +%s) - $start_time ))s**\033[0m" 
fi

# 等待设备连接
adb wait-for-device

echo "--开始安装$TEST_MODULE.apk--"
# 安装测试 APK
adb install  -t -g -d ./out/target/product/generic_arm64/testcases/$TEST_MODULE/arm64/${TEST_MODULE}.apk

echo "--判断是否有log文件夹，没有则创建--"
if [ ! -d "./log" ]; then
    mkdir ./log
fi

if [ ! -d "./log/$TEST_MODULE" ]; then
    mkdir ./log/$TEST_MODULE
fi

# 获取当前时间
CUR_TIME=$(date +%Y%m%d_%H%M%S)

# 日志文件名
LOGFILE=./log/$TEST_MODULE/${CUR_TIME}_${TEST_MODULE}.log

# 清除旧日志
# adb logcat -c

# 强化版日志清除
echo "--开始清除设备日志缓冲区--"
if ! adb logcat -b all -c 2>/dev/null; then
    echo -e "\033[31m**日志清除失败（请检查设备连接状态）**\033[0m"
    exit 2
fi
sleep 0.5  # 增加缓冲区清空等待时间

echo "--开始抓取运行日志--"
# 抓取logcat日志（后台运行）
adb logcat > "$LOGFILE" &
LOGCAT_PID=$!

echo "--开始执行测试用例:$TEST_MODULE/$TEST_SUBMODULE"

echo "--adb shell am instrument -e class $TEST_SUBMODULE -w ${TEST_SUBMODULE%%.cts*}.cts/androidx.test.runner.AndroidJUnitRunner--"
# 执行指定的测试用例
#adb shell am instrument -e class $TEST_SUBMODULE -w ${TEST_SUBMODULE%%.cts*}.cts/androidx.test.runner.AndroidJUnitRunner
adb shell am instrument -e class android.nativemedia.aaudio.AAudioTests#AAudioTestAttributes_UsageTest_checkAttributes_perf_low_latency_usage_voicecomm -w android.nativemedia.aaudio/androidx.test.runner.AndroidJUnitRunner

# 停止logcat抓取
kill $LOGCAT_PID

echo -e "Finished! Hold down \033[32mCtrl+click\033[0m to open the log file：\033[32mfile:\n/$(realpath "$LOGFILE")\033[0m"
```



上面的指令可能会遇到instrumentation无法运行的情况，其实`-w`参数是对应模块的AndroidManifest中的instrumentation的name和targetPackage这两个部分，比如：

```
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
     package="android.media.misc.cts"
     android:targetSandboxVersion="2">
		.......
    <instrumentation android:name="androidx.test.runner.AndroidJUnitRunner"
         android:targetPackage="android.media.misc.cts"
         android:label="CTS tests of android.media">
    </instrumentation>

</manifest>
```

> 可以看到name实际上和TEST_SUBMODULE一部分是重合的，所以我为了简化将一般情况使用了字符串匹配。若遇到无法运行可查找对应的参数去修改后运行（比如下面这种）。若还是不行，那暂时没办法。。。

```
# cts/tests/tests/nativemedia/aaudio/AndroidManifest.xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="android.nativemedia.aaudio">

    <attribution android:tag="validTag" android:label="@string/attributionTag" />

    <uses-permission android:name="android.permission.DISABLE_KEYGUARD" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <application>
        <uses-library android:name="android.test.runner" />
    </application>

    <!-- This is a self-instrumenting test package. -->
    <instrumentation android:name="androidx.test.runner.AndroidJUnitRunner"
                     android:targetPackage="android.nativemedia.aaudio"
                     android:label="CTS tests of native AAudio API">
    </instrumentation>

</manifest>
```
