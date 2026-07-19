---
title: 2026年VPS推荐与V2ray节点搭建
slug: vps-v2ray
tags:
  - 网络工具
  - vpn
status: published
cover: /images/covers/vps-v2ray-43752e47.webp
publishedAt: '2026-07-19'
series:
  - name: 实用工具
---
## 0、VPS选择

购买VPS用于搭建节点需要注意的无非就几个问题：

- 国内网是否能连
- 带宽、流量、稳定性
- 支付方式是否方便
- 价格与套餐方式

这里推荐4个候选，均支持支付宝支付：

**极致低价/高性价比之选：RackNerd & CloudCone**

**[RackNerd](https://my.racknerd.com/cart.php?a=confproduct&i=0)**：年付月付的套餐都有，性价比较高全年活动较多，也是我常用的其中一个，目前年付套餐27美元，公网IP配合1元域名啥的适合做长期的个人博客网站。

**[CloudCone](https://cloudcone.com/vps/?ref=14420)**：全站控制面板均为自研，高性价比的月付套餐，最便宜的配置1.08 美元每月，单看价格的话算是最低的。

其余可选：

**[Vultr](https://www.vultr.com//?ref=9913392-9J)**：按小时计费（和阿里云或者AutoDL租用GPU一样），价格稍贵但是灵活。

**[搬瓦工](https://bandwagonhost.com/?aff=83342)**：高质量之选，线路好但价格贵，套餐和RackNerd比较像，购买的话建议49.99美元/年的套餐。



## 1、远程连接服务器

推荐在xshell或者官方推荐的putty下连接远程，但是直接win+R在windows的命令行也行。

```shell
ssh root@你的公网IP		
# 输入密码
# 连接成功
```

##  2、 服务器配置

### 步骤 1：安装v2ray

```shell
bash <(curl -L https://raw.githubusercontent.com/v2fly/fhs-install-v2ray/master/install-release.sh)
```

生成 UUID（唯一用户标）

```bash
v2ray uuid
```

输出示例：

```
b831381d-6324-4107-b5a5-8e7c9f8d1a9b
```

**记下这个 UUID**，后面客户端配置需要。

------

### 步骤 2：编辑配置文件

```bash
## 创建日志目录
mkdir -p /var/log/v2ray
chown nobody:nogroup /var/log/v2ray

## 创建配置文件
nano /usr/local/etc/v2ray/config.json
```

填入以下**最简 VMess 服务器配置**（TCP 传输）：

```json
{
  "log": {
    "access": "/var/log/v2ray/access.log",
    "error": "/var/log/v2ray/error.log",
    "loglevel": "warning"
  },
  "inbounds": [{
    "port": 443,
    "protocol": "vmess",
    "settings": {
      "clients": [
        {
          "id": "b831381d-6324-4107-b5a5-8e7c9f8d1a0b",  // ← 替换为你自己的 UUID
          "alterId": 0
        }
      ]
    },
    "streamSettings": {
      "network": "tcp"		// 默认tcp
    }
  }],
  "outbounds": [{
    "protocol": "freedom",
    "settings": {}
  }]
}
```

> - 端口建议用 `443`（HTTPS 常用，不易被干扰）
> - `alterId: 0` 是 V2Ray v4.33+ 的推荐设置
> - 不要使用默认端口 `1080`（易被扫描）

------

### 步骤 3：重载并重启

```bash
systemctl daemon-reload
systemctl restart v2ray
systemctl status v2ray  # 确认 active (running)
```

------

### 步骤 4：开放防火墙端（大多数情况不需要）

```bash
apt update 
apt install ufw
ufw allow 443/tcp
```

**如果使用云平台（如 RackNerd）：**

- 登录控制面板 → **Security Group / Firewall**
- 添加入站规则：**TCP 端口 443 允许**

------

# 3、客户端配置
## (1) 构造配置链接

构造V2Ray 客户端支持的 **`vmess://` URI 格式**，生成一个 Base64 编码的 JSON 字符串。

**方法 A：使用 Python 快速生成（在本地或服务器运行）**

```python
import base64
import json

config = {
    "v": "2",
    "ps": "MyVPS",
    "add": "YOUR_VPS_IP",      # ← 替换成racknerd/其他服务器公网地址
    "port": 443,
    "id": "YOUR_UUID",         # ← 替换成服务器上配置文件的uuid
    "aid": 0,
    "net": "tcp",
    "type": "none",
    "host": "",
    "path": "",
    "tls": "none"
}

vmess_str = "vmess://" + base64.urlsafe_b64encode(json.dumps(config).encode()).decode().rstrip("=")
print(vmess_str)
```

------

>  也可以使用在线转码将代码中的config转为base64编码

**生成的示例：**

```
vmess://eyJ2IjoiMiIsInBzIjoiTXlWUFMiLCJhZGQiOiIyMDMuMC4xMTMuMTAiLCJwb3J0Ijo0NDMsImlkIjoiYjgzMTM4MWQtNjMyNC00MTA3LWI1YTUtOGU3YzlmOGQxYTBiIiwiYWlkIjowLCJuZXQiOiJ0Y3AiLCJ0eXBlIjoibm9uZSIsImhvc3QitiIiLCJwYXRoIjoiIiwidGxzIjoibm9uZSJ9
```

------

## (2) 客户端配置

1. 安装 V2Ray 客户端

   -  Windows 用 **V2RayN：**https://en.v2rayn.org/

   - Android 用 **v2rayNG：**https://en.v2rayng.org/

2. 复制上述 `vmess://` 链接，从软件中剪切板导入，右键测试延迟和速度

3. 选中添加的服务器，启动代理，完成

