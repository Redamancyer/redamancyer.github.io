# 安卓多平台DUMP视频编解码

## 1. Google 平台

### 软件编解码器优先开关

```bash
# 好像还没有通用的，暂转平台编解码dump吧，等后续更新。。。
# 开启
adb shell setprop debug.stagefright.swcodec 1
# 关闭
adb shell setprop debug.stagefright.swcodec 0
```

## 2. 高通(Qualcomm)平台

### C2架构编解码器dump

```bash
# 准备目录
adb shell mkdir /data/vendor/media/qc2
adb shell chmod 777 /data/vendor/media/qc2

# 解码器dump
adb shell setprop vendor.qc2.log.buffers 0x1003

# 编码器dump  
adb shell setprop vendor.qc2.log.buffers 0x1030

# 编解码器dump
adb shell setprop vendor.qc2.log.buffers 0x1033

# 清空缓存
adb shell "rm /data/vendor/media/qc2/*"
```

### OMX架构编解码器dump
```bash
# 解码器dump
adb shell setprop vendor.vidc.dec.log.in 1
adb shell setprop vendor.vidc.dec.log.out 1

# 编码器dump
adb shell setprop vendor.vidc.enc.log.out 1 
adb shell setprop vendor.vidc.enc.log.in 1
```

### 日志开关

```bash
# 基础日志
adb shell setprop vendor.qc2.log.msg 7
adb shell "echo 0x103F101F > /sys/module/msm_video/parameters/msm_vidc_debug"

# 全量kernel日志
adb shell setprop vendor.qc2.log.msg 7
adb shell "echo 0x103F113F > /sys/module/msm_video/parameters/msm_vidc_debug"
```

## 3. 联发科(MTK)平台

### 5.0版本OMX架构dump
```bash
# 解码器dump
adb shell setprop vendor.mtk.omxvdec.dumpInput 1
adb shell setprop vendor.mtk.omxvdec.dump 1

# 编码器dump
adb shell setprop vendor.mtk.omx.venc.dump.bs 1
adb shell setprop vendor.mtk.omxvenc.dump 1

# 清空缓存
adb shell "rm -rf data/vcodec/"
adb shell "rm -rf /data/vendor/vcodec/*"
```

### 5.0版本日志开关
```bash
adb shell setprop vendor.mtk.omx.v4l2.log 1
adb shell setprop vendor.mtk.omx.vdec.log 1
adb shell "echo -codec_log 15 -vpud_log 3 > /sys/module/mtk_vcu/parameters/test_info"
adb shell "echo 7 > /sys/module/mtk_vcodec_dec/parameters/mtk_v4l2_dbg_level"
adb shell "echo 1 > /sys/module/mtk_vcodec_dec/parameters/mtk_vcodec_dbg"
adb shell "echo -codec_log 15 -vpud_log 3 -get_output 0 -get_input 0 -internal_log 1 -file_path /data/vcodec/log > /sys/module/mtk_vcu/parameters/test_info"
adb shell setprop vendor.mtk.omx.enable.venc.log 1
```

### 6.0版本C2架构dump
```bash
# 解码器dump
adb shell "setprop vendor.mtk.c2.vdec.dump.input 1"
adb shell "setprop vendor.mtk.c2.vdec.dump.input.cc 1" 
adb shell "setprop vendor.mtk.c2.vdec.dump.output 1"

# 编码器dump
adb shell "setprop vendor.mtk.c2.venc.dump.input 1"
adb shell "setprop vendor.mtk.c2.venc.dump.input.cc 1"
adb shell "setprop vendor.mtk.c2.venc.dump.output 1"
```

### 6.0版本日志开关
```bash
adb kill-server
adb start-server
adb root
adb shell "setenforce 1"
adb shell "setprop android.media.mtk.storage.type external"
adb shell "settings put system screen_off_timeout 259200000"
adb root
adb shell setenforce 0
adb shell setprop persist.logmuch.detect 0
adb shell setprop persist.vendor.logmuch false
adb shell setprop vendor.logmuch.value 1000000
# 组件日志
adb shell "setprop vendor.mtk.c2.enable.comp.log 2"
adb shell "setprop vendor.mtk.c2.enable.vdec.log 2" 
adb shell "setprop vendor.mtk.c2.enable.venc.log 2"
adb shell "setprop vendor.mtk.c2.enable.bm.log 2"
adb shell "setprop vendor.mtk.c2.enable.vcodec.log 1"
```

### MTK VCP日志开关

```bash
#打开
adb shell "setprop persist.vendor.logmuch false"
adb shell "setprop vendor.mtk.c2.enable.comp.log 2"
adb shell "setprop vendor.mtk.c2.enable.vdec.log 2"
adb shell "setprop vendor.mtk.c2.enable.vcodec.log 4"
adb shell "echo 2 > /proc/mtprintk"
adb shell "echo 3 > /sys/module/mtk_vcodec_dec_v2/parameters/mtk_v4l2_dbg_level"
adb shell "echo 1 > /sys/module/mtk_vcodec_dec_v2/parameters/mtk_vcodec_dbg"
adb shell "echo -codec_log 3 -vpud_log 2 -job_log 3 > /sys/module/mtk_vcodec_dec_v2/parameters/mtk_vdec_vcp_log"

#抓取
adb pull /data/log/mtklog/mobilelog ./
```

## 4. 展讯(SPRD)平台(待测试)

```bash
# 解码器dump
adb shell setprop vendor.h264dec.yuv.dump true
adb shell setprop vendor.h264dec.strm.dump true
adb shell chmod 777 /data/misc/media
```
