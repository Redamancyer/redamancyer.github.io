# Simpleperf生成火焰图

## NDK&Python下载

- https://developer.android.com/ndk/downloads?hl=zh-cn
- https://www.python.org/downloads/

> 解压NDK，安装好python



## 记录并转换数据

在ndk的根文件夹的同级目录下新建.sh文件：

```bash
#!/bin/bash

# 获取 PID
pid=$(adb shell pidof media.swcodec)

# 检查是否成功获取 PID
if [ -z "$pid" ]; then
  echo "无法获取 media.swcodec 的 PID，请确认进程是否存在。"
  read -p "按回车键退出..."
  exit 1
fi

echo "获取到的 PID: $pid"

# 获取当前时间作为文件夹名（格式：YYYYMMDD_HHMMSS）
timestamp=$(date +"%Y%m%d_%H%M%S")
output_dir="./$timestamp"

# 创建输出文件夹
mkdir -p "$output_dir"

# 执行性能采样，使用动态获取的 PID（修正了这里）
echo "开始性能采样，持续10秒..."
python3 ./android-ndk-r27d/simpleperf/app_profiler.py --pid "$pid" -r "-g --duration 10" -o "$output_dir/perf.data"

# 检查采样是否成功
if [ $? -ne 0 ]; then
  echo "性能采样失败！"
  read -p "按回车键退出..."
  exit 1
fi

echo "采样完成，数据已保存。开始转换..."

# 执行转换并将结果保存到同一文件夹
echo "正在生成Gecko Profile..."
python3 ./android-ndk-r27d/simpleperf/gecko_profile_generator.py -i "$output_dir/perf.data" | gzip > "$output_dir/profile.json.gz"

# 检查转换是否成功
if [ $? -eq 0 ]; then
  echo "转换完成！文件保存在 $output_dir"
else
  echo "转换失败！"
fi
```



## 查看火焰图和调用链

使用[Profiler](https://profiler.firefox.com/)来查看生成的gz文件。