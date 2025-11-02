# Ubuntu22.04 SSH免密登录

## 服务器(要登陆的机器)
1. 安装 openssh-server
```bash
sudo apt install openssh-server
```
2. 安装完成后，SSH服务默认自动启动，你可以通过以下命令校验服务运行态：
```bash
sudo systemctl status ssh
```
3. 如果你启用了防火墙，请确保防火墙打开了 SSH 端口，命令如下：
```bash
sudo ufw allow ssh
```
4. 允许远程登录
```bash
sudo nano /etc/ssh/sshd_config
# 修改配置
PubkeyAuthentication yes
```
5. 重启 ssh 服务
```bash
service ssh restart 
```
## 客户机(本地机器)
6. 安装 ssh 客户端
```bash
sudo apt install openssh-client
```
7. 生成密钥
```bash
# 你可以不使用任何参数直接生产SSH私钥与公钥。也可以使用您的电子邮件地址作为注释来生成新的4096位SSH密钥对。
# ssh-keygen -t rsa -b 4096 -C "your_email@domain.com"
ssh-keygen
# 系统将提示您指定文件名Enter file in which to save the key (/用户名家目录/.ssh/id_rsa):。默认位置和文件名应该适合大多数用户。 按Enter接受并继续
# 接下来，系统会要求您输入安全密码或者称为密码短语Enter passphrase (empty for no passphrase):。密码短语增加了一层额外的安全性。
# 如果您设置密码短语，则每次使用该密钥登录到远程计算机时，系统都会提示您输入密码短语。如果您不想设置密码短语，请按Enter。
# 如果你没有什么特别的要求你在运行ssh-keygen命令，全部直接回车Enter键使用默认值创建SSH密钥即可。
# 要验证是否生成了新的SSH密钥对，请运行命令ls ~/.ssh/id_*查看SSH密钥是否存在。如果存在说明您已经在Ubuntu Linux计算机成功生成了SSH密钥。
```
8. 复制到远程服务器。（或手动复制客户机的~/.ssh/id_rsa.pub追加到到远程服务器的~/.ssh/authorized_keys）
```bash
# server_username是远程服务器用户的名称，server_ip_address是你的服务器IP地址。系统将提示您输入远程用户密码。
# 通过身份验证后，公钥 ~/.ssh/id_rsa.pub 将追加到远程用户 ~/.ssh/authorized_keys 文件中，然后ssh-copy-id将会退出。
ssh-copy-id server_username@server_ip_address
```
## 验证
输入远程机器用户名与ip即可免密登录。
```bash
ssh remote_username@server_ip_address
```
## 额外
禁用SSH密码身份验证。(可选)
禁用密码身份验证会为服务器增加一层安全保护。在禁用SSH密码身份验证之前，请确保您可以免密码登录服务器，并且你登录用户具sudo权限。
完成后，保存文件并运行命令sudo systemctl restart ssh重新启动SSH服务。此时，基于密码的身份验证已被禁用，你将不能使用密码登录。
注意：禁用密码登录后，请保管好你的SSH密钥文件，如果VPS提供商提供VNC远程控制可以很容易恢复，如果没有就........。
```bash
# 登录到远程服务器
ssh sudo_user@server_ip_address
# 远程服务器执行修改配置
sudo nano /etc/ssh/sshd_config 
# 修改下面几行
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM no
# 服务器端重启ssh生效配置
sudo systemctl restart ssh #在你的服务器上
```