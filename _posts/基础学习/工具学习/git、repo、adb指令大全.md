# Git Repo 命令总结

## 初始化与配置

* `repo init -u <URL>`  
  初始化repo仓库，指定manifest仓库地址  
  常用选项：  
  - `-b <branch>` 指定分支  
  - `--depth=1` 浅克隆  
  - `--repo-url` 指定repo工具仓库  
  - `--no-repo-verify` 跳过验证

* `repo sync`  
  同步所有项目代码  
  常用选项：  
  - `-j<N>` 多线程同步  
  - `-c` 只同步当前分支  
  - `-d` 切换回manifest版本  
  - `-f` 强制同步

## 分支管理

* `repo start <branch> --all`  
  在所有项目中创建新分支

* `repo abandon <branch>`  
  删除指定分支

* `repo branches`  
  查看所有分支

## 代码操作

* `repo upload`  
  上传代码变更进行审核  
  常用选项：  
  - `--reviewer` 指定审核人  
  - `--no-verify` 跳过钩子检查

* `repo download <project> <change>`  
  下载特定变更

* `repo forall -c <command>`  
  在所有项目中执行命令  
  常用选项：  
  - `-p` 显示项目名称  
  - `-v` 显示命令输出

## 状态查询

* `repo status`  
  查看各项目修改状态

* `repo diff`  
  查看代码差异

* `repo list`  
  列出所有项目

## 其他实用命令

* `repo prune`  
  删除已合并的分支

* `repo selfupdate`  
  更新repo工具本身

* `repo manifest -r -o manifest.xml`  
  生成当前manifest的快照

## 工作流程示例

```bash
# 典型工作流
repo init -u https://android.googlesource.com/platform/manifest -b master
repo sync -j4
repo start dev-branch --all
# ...修改代码...
repo upload
# ...审核通过后...
repo sync
repo prune
```

# Git 命令分类说明
> 这个网站上可学习git：https://pdai.tech/md/devops/tool/tool-git.html
## 初始化与配置

### 仓库初始化
```bash
git init                  # 初始化新仓库
git clone <url>           # 克隆远程仓库
git config --global user.name "Your Name"  # 设置全局用户名
git config --global user.email "email@example.com"  # 设置全局邮箱
```

### 远程仓库管理
```bash
git remote add origin <url>  # 添加远程仓库
git remote -v               # 查看远程仓库信息
git remote remove origin    # 删除远程仓库连接
```

## 基础操作命令

### 文件跟踪
```bash
git add <file>             # 添加单个文件到暂存区
git add .                  # 添加所有修改到暂存区
git rm <file>              # 删除文件并停止跟踪
git mv <old> <new>         # 移动/重命名文件
```

### 提交操作
```bash
git commit -m "message"    # 提交更改
git commit --amend         # 修改最后一次提交
git reset HEAD <file>      # 取消暂存文件
git checkout -- <file>     # 丢弃工作区修改
```

## 分支管理命令

### 基础分支操作
```bash
git branch                 # 查看本地分支
git branch <name>          # 创建新分支
git checkout <branch>      # 切换分支
git checkout -b <branch>   # 创建并切换分支
git branch -d <branch>     # 删除分支
```

### 合并与变基
```bash
git merge <branch>         # 合并指定分支到当前分支
git rebase <branch>        # 变基当前分支到指定分支
git rebase --abort         # 终止变基操作
git rebase --continue      # 继续变基操作
```

## 远程协作命令

### 推送与拉取
```bash
git push origin <branch>   # 推送到远程分支
git pull origin <branch>   # 拉取远程分支更新
git fetch origin           # 获取远程更新但不合并
```

### 分支跟踪
```bash
git push -u origin <branch>  # 推送并建立跟踪关系
git branch --set-upstream-to=origin/<branch>  # 设置跟踪分支
```

## 高级操作命令

### 历史操作
```bash
git reflog                 # 查看所有操作历史
git reset --hard <commit>  # 重置到指定提交（危险操作）
git cherry-pick <commit>   # 选择应用某个提交
```

### 储藏与清理
```bash
git stash                  # 储藏当前工作目录
git stash list             # 查看储藏列表
git stash pop              # 恢复最近储藏内容
git clean -fd              # 删除未跟踪的文件/目录
```

### 子模块管理
```bash
git submodule add <url> <path>  # 添加子模块
git submodule update --init     # 初始化子模块
```

### 调试工具
```bash
git bisect start           # 开始二分查找
git bisect good <commit>   # 标记正常提交
git bisect bad <commit>    # 标记问题提交
git blame <file>           # 查看文件修改历史
```

## 标签管理
```bash
git tag                    # 列出所有标签
git tag -a v1.0 -m "msg"   # 创建带注释标签
git push origin --tags     # 推送所有标签到远程
git tag -d v1.0            # 删除本地标签
```

## 差异查看
```bash
git diff                   # 查看未暂存修改
git diff --cached          # 查看已暂存修改
git diff HEAD              # 查看所有未提交修改
git diff <branch1>..<branch2>  # 比较两个分支差异
```


# ADB基本指令相关

## 连接相关
```shell
adb version 查看adb版本
adb devices 查看连接设备
adb connect <android_ip>    连接android设备（需要在同一网段下）
adb kill-server 杀死adb 服务
adb start-server 启动adb服务
adb reboot 重启手机

adb kill-server && adb -a -P 5037 nodaemon server   //远程连接Client
adb -H {device_hub_ip} -P {port} {其他 adb 命令}    //远程连接Server
```

## 多个设备
```shell
adb devices 查看连接设备
adb -s <device_name> shell 进入指定的设备shell
```

## 应用相关
```shell
adb shell pm list packages    显示所有应用信息
adb shell pm list packages -s    显示系统应用信息
adb shell pm list packages -3   显示第三方应用信息
adb shell pm list permissions -d -g    显示权限信息
adb shell pm clear <package_name>    清除数据
adb shell pm install <package_name>    安装应用
adb shell pm install -r -r <package_name>    保留数据和缓存文件，重新安装apk
adb shell pm uninstall <package_name>    卸载应用(与adb uninstall相同)

adb install <package_name>    安装应用
adb install -r <package_name>    保留数据和缓存文件，重新安装apk
adb uninstall <package_name>    卸载应用
```

### 获取手机系统信息
```shell
adb shell cat /proc/cpuinfo     显示cpu信息
adb get-serialno    获取序列号
adb shell  cat /sys/class/net/wlan0/address    获取mac地址
adb shell getprop ro.product.model    获取设备型号
adb shell wm size    查看屏幕分辨率
adb shell wm density    查看屏幕密度
```

### 日志相关
```shell
adb logcat -v time    带时间戳的log
adb logcat -b <buffer>    查看不同类型的log，如main,system,radio,events,crash,all.默认为main log
adb logcat -c    清除log
adb logcat | grep -i "str"    忽略大小写筛选指定字符串log
adb logcat | grep -iE "str1|str2|str3"    筛选多个字符串
adb logcat > log.txt    打印log输入到文件
```

### fastboot模式
```shell
adb reboot-bootloader
fastboot flash boot boot.img
fastboot flash recovery recovery.img
fastboot flash android system.img
```

### 文件相关
```shell
adb remount    
adb push <file_path> <dest_path>    从PC向手机端push文件
adb pull <target_path> <dest_path>    从手机端向PC端拉取文件
eg.
adb remount
adb push Hello.apk /system/app/Hello/
```

### 截屏与录屏
```shell
截屏：
adb shell screencap -p <output_file>    截取屏幕，并设置图片存储路径
adb pull <output_file> .    拉取该截图到PC
adb shell rm <output_file>    删除截图文件
eg.
adb shell screencap -p /sdcard/screen.png

录屏：
adb shell screenrecord <output_file> 录屏
```

### dumpsys 查看信息相关
```shell
adb shell dumpsys    显示当前android系统信息(四大组件，内容太多，一般使用重定向)
adb shell dumpsys > info.txt 显示当前android系统信息(文件重定向)

activity：
adb shell dumpsys activity    显示当前所有activity信息
adb shell dumpsys activity top    查看当前应用的 activity 信息

package：
adb shell dumpsys package [package_name] 查看应用信息

内存：
adb shell dumpsys meminfo [package_name/pid] 查看指定进程名或者是进程 id 的内存信息

数据库：
adb shell dumpsys dbinfo [package_name] 查看指定包名应用的数据库存储信息(包括存储的sql语句)
```

### am相关
```shell
启动Activity:
adb shell am start -n <package_name>/<package_name>.<activity_name>
eg.
adb shell am start -n com.example.hello/com.example.hello.MainActivity

启动Service:
adb shell am startservice -n <package_name>/<package_name>.<service_name>    启动service
eg.
adb shell am startservice -n com.example.test/com.example.test.TestService

发送广播:
adb shell am broadcast -a <action>    发送广播
```

### 其他
```shell
//查看网络信息
adb shell netcfg    查看设备的 ip 地址
adb shell netstat    查看设备的端口号信息

//属性信息
adb shell getprop [prop_name]    查看属性信息
adb shell setprop <prop_name> <value>    设置属性值

//Monkey测试-对指定应用，做evnet_number个随机伪事件
adb shell monkey [options] <event-count>
adb shell monkey -p <package_name> -v <event_number>

adb shell ps    查看进程信息
```