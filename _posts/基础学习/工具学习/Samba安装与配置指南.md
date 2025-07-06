# Samba 服务器安装和配置指南

## Samba 介绍
Samba 是一个在 Linux 和 UNIX 系统上实现 SMB 协议的免费软件，由服务器及客户端程序构成。SMB 是一种在局域网上共享文件和打印机的通信协议，允许不同计算机之间共享文件及打印机等资源。

## Samba安装

### 安装说明
Samba 服务器搭建流程主要分为以下几个步骤：
1. 安装 Samba 包。
2. 编辑主配置文件 `/etc/samba/smb.conf`，自定义需要共享的目录，并为共享目录设置共享权限。
3. 在 `/etc/samba/smb.conf` 中指定日志文件名称和存放路径。
4. 设置共享目录的本地系统权限及 Samba 共享权限。
5. 重新加载配置文件或重新启动 smb 服务，使配置生效。

### 安装 Samba

#### Ubuntu 安装 Samba
```bash
apt-get install samba samba-common -y
```

#### CentOS 安装 Samba
```bash
yum install samba -y
```

#### 查看 Samba 版本
```bash
smbclient -V
```

## User 级别的 Samba 配置

User 级别的 Samba 需要以 Samba 用户和密码才能访问。

### 创建用于分享的 Samba 目录
```bash
mkdir -p /smb
```

### 创建 Samba 访问用户
```bash
useradd smb
passwd smb
```

### 设置目录权限
```bash
chmod -R o+rwx /smb
# 或者
chown -R smb:smb /smb
# 或者
chown -R smb /smb
```

### 设置 Samba 用户的访问密码
```bash
smbpasswd -a smb
```

### 配置 Samba 的配置文件
在 `/etc/samba/smb.conf` 文件中添加以下内容：
```ini
[global]
security = user

[smb]
comment = smb folder
browseable = yes
path = /smb
create mask = 0700
directory mask = 0700
valid users = smb
force user = smb
force group = smb
public = yes
available = yes
writable = yes
```

### 重启 Samba 服务器

```bash
service smbd restart
```

## 匿名级别的 Samba 配置

匿名级别的 Samba 不需要用户和密码验证登录。

### 创建用于分享的 Samba 目录
```bash
mkdir -p /share
```

### 配置目录权限
```bash
chown nobody:nobody /share
chmod o+rwx -R /share/
```

### 配置 Samba 的配置文件
在 `/etc/samba/smb.conf` 文件中添加以下内容：
```ini
[global]
security = user
map to guest = Bad User

[share]
comment = share folder
browseable = yes
path = /share
public = ok
guest ok = yes
writable = yes
```

### 重启 Samba 服务

```bash
service smb restart
```

## 验证

### Windows 打开 Samba 服务器 IP

在 Windows 系统中，使用 `win + r` 键打开运行，输入 `\\samba服务器IP` 访问 Samba 共享。

### 使用 Samba 用户名和密码登录
对于 Samba 4 版本，匿名登录的用户名和密码均为 `nobody`。

### 创建文件测试
在 Windows 资源管理器中，尝试在共享目录中创建文件以测试 Samba 配置是否成功。

## 配置文件基本格式

`smb.conf` 文件由以下几个部分组成：

- **全局配置**：在文件的顶部，以 `[global]` 作为区块名称，包含影响整个 Samba 服务器的设置。
- **共享定义**：定义共享资源的部分，每个共享都有一个自己的区块，以方括号 `[]` 包围共享名称。
- **参数**：在每个区块内部，使用 `参数 = 值` 的形式设置参数。

### 示例配置文件

```ini
# 全局配置
[global]
    workgroup = WORKGROUP
    server string = Samba Server Version %v
    netbios name = SERVERNAME
    security = user
    map to guest = bad user
    dns proxy = no

# 共享定义
[homes]
    comment = Home Directories
    browseable = no
    writable = yes

# 特定共享
[printers]
    comment = All Printers
    path = /var/spool/samba
    browseable = no
    guest ok = yes
    writable = no
    printable = yes

# 另一个共享
[共享名]
    comment = 共享描述
    path = /path/to/share
    available = yes
    valid users = 用户1 用户2
    read only = no
    browsable = yes
    guest ok = no
```

### 常见配置项

- **workgroup**：定义工作组名称，与 Windows 工作组名称相同。
- **server string**：定义服务器的描述字符串。
- **netbios name**：定义 NetBIOS 名称，通常设置为服务器的主机名。
- **security**：定义安全模式，可以是 `user`、`share` 或 `domain`。
- **map to guest**：定义哪些用户映射为 guest，通常设置为 `bad user` 以增强安全性。
- **dns proxy**：是否为本地网络上的非域成员提供 DNS 解析。

在共享区块中：

- **comment**：共享的描述。
- **path**：共享文件或目录的路径。
- **browseable**：是否在网络浏览器中可见。
- **writable**：是否可写。
- **guest ok**：是否允许 guest 用户访问。
- **read only**：是否只读。
- **browsable**：是否在网络邻居中可见。