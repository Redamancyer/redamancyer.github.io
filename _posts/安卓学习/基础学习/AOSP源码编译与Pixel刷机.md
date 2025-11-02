# AOSP源码编译与Pixel刷机与调试

## 前期准备

### ubuntu编译环境

安装ubuntu22.04.5，装了24版本发现会编译失败，可能是java版本太高了,18版本无法安装只能换22的。

更换ubuntu下载源：

```c
# 修改/etc/apt/source.list，添加清华源：

deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal-updates main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal-backports main restricted universe multiverse
deb https://mirrors.tuna.tsinghua.edu.cn/ubuntu/ focal-security main restricted universe multiverse

# 添加好以后更新并升级系统软件
sudo apt update
sudo apt upgrade
```

编译环境安装：

```
apt-get install libncurses-dev libssl-dev device-tree-compiler bc cpio lib32z1 build-essential binutils bc bison build-essential ccache curl flex g++-multilib gcc-multilib git gnupg gperf imagemagick lib32readline-dev lib32z1-dev liblz4-tool   libsdl1.2-dev libssl-dev libxml2 libxml2-utils lzop pngcrush rsync schedtool squashfs-tools xsltproc zip zlib1g-dev git python3 openjdk-18-jdk
```

**调整 Linux 系统交换文件大小**：

```
sudo swapoff /swapfile
sudo fallocate -l 40G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

> **注意这一步是必须的，不然编译的时候交换空间太小会编译失败**

### 安卓源码同步

```
# 先下载并初始化repo；也可以把这个文件放到bin下全局使用
curl -L https://mirrors.tuna.tsinghua.edu.cn/git/git-repo -o repo
chmod +x repo

# 这个路径变量必须要给，不给只能默认从google下载，没有外网代理会失败
export REPO_URL='https://mirrors.tuna.tsinghua.edu.cn/git/git-repo'
repo init -u https://mirrors.tuna.tsinghua.edu.cn/git/AOSP/platform/manifest -b android-15.0.0_r32
repo sync -c -j$(nproc --all) --force-sync --no-clone-bundle --no-tags
```

### Pixel驱动下载

在google开发者官网下载pixel对应的驱动二进制文件，比如我的是google_devices-oriole-bp1a.250505.005-adb53d50.tgz：

https://developers.google.cn/android/drivers?hl=zh-cn

解压后得到的`extract-google_devices-oriole.sh`放到aosp根目录下去执行。执行过程中需要通过按空格翻页到最后， 在命令行中输入 I ACCEPT 来接受协议。 这样就会在 aosp 目录下面生成一个 vendor 目录，这个里面就放置这和 pixel 6 硬件对应的设备驱动文件。

## 源码编译

```
source build/envsetup.sh
# 注意lubch中的bp1a是和下载的驱动压缩包名中的是对应的
lunch aosp_oriole-bp1a-userdebug
make -j$(nproc --all)
```

## 刷机

在最终的生成目录下（aosp15/out/target/product/oriole）添加一个刷机脚本`flash.sh`：

```
# 先将手机进入fastboot模式
fastboot flash bootloader bootloader.img
fastboot reboot-bootloader
sleep 5
fastboot flash radio radio.img
fastboot reboot-bootloader
sleep 5
# 这个路径设置为绝对路径提供给刷机命令使用
export ANDROID_PRODUCT_OUT=/home/workbase/aosp15/out/target/product/oriole
fastboot flashall -w
```

## 模块调试

在build/envsetup.sh中添加函数：

```
function mmb()
{
   local cmdline="time prebuilts/build-tools/linux-x86/bin/ninja -v -d keepdepfile $@ -f out/combined-$TARGET_PRODUCT.ninja -w dupbuild=warn"
   echo $cmdline
   $cmdline
}
```

> **模块快速调试的前提是整编，后面可以直接用mmb+模块名进行快速模块编译**