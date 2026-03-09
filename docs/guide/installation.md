# 安装指南（Installation）

安装 HAPI CLI 并完成 hub 配置。

## 前置条件

请先安装以下任一 CLI：Claude Code、OpenAI Codex CLI、Cursor Agent CLI、Google Gemini CLI 或 OpenCode CLI。

可通过以下命令验证是否安装成功：

```bash
# Claude Code
claude --version

# OpenAI Codex CLI
codex --version

# Cursor Agent CLI
agent --version

# Google Gemini CLI
gemini --version

# OpenCode CLI
opencode --version
```

## 架构说明

HAPI 由三个组件组成：

| 组件 | 作用 | 是否必需 |
|-----------|------|----------|
| **CLI** | 封装 AI Agent（Claude/Codex/Cursor/Gemini/OpenCode），运行会话 | 是 |
| **Hub** | 中央协调：持久化、实时同步、远程访问 | 是 |
| **Runner** | 用于远程拉起会话的后台服务 | 否（可选） |

### 三者如何协作

```
┌─────────────────────────────────────────────────────┐
│              Your Machine                           │
│                                                     │
│  ┌─────────┐    Socket.IO    ┌─────────────┐       │
│  │  CLI    │◄───────────────►│    Hub      │       │
│  │+ Agent  │                 │  + SQLite   │       │
│  └─────────┘                 └──────┬──────┘       │
│       ▲                             │ SSE          │
│       │ spawn                       ▼              │
│  ┌────┴────┐                 ┌─────────────┐       │
│  │ Runner  │◄────RPC────────►│   Web App   │       │
│  │(背景)   │                 └─────────────┘       │
│  └─────────┘                                       │
└─────────────────────────────────────────────────────┘
                    │
           [Tunnel / Public URL]
                    │
              ┌─────▼─────┐
              │ Phone/Web │
              └───────────┘
```

- **CLI**：运行 `hapi` 启动会话，CLI 封装你的 AI Agent 并与 hub 同步。
- **Hub**：运行 `hapi hub`，负责会话存储、权限处理、远程访问能力。
- **Runner**：运行 `hapi runner start`，让你无需保持终端前台也能从手机/Web 远程拉起会话。

### 典型工作流

**仅本地使用**：`hapi hub` → `hapi` → 在终端工作

**远程访问**：`hapi hub --relay` → `hapi runner start` → 从手机/Web 控制

## 安装 CLI

```bash
npm install -g @jlovec/hapi --registry=https://registry.npmjs.org
```

> 建议使用官方 npm registry 进行全局安装；部分镜像可能无法及时同步平台包。

或使用 Homebrew：

```bash
brew install jlovec1024/tap/hapi
```

## 其他安装方式

<details>
<summary>npx（免安装）</summary>

```bash
npx @jlovec/hapi
```
</details>

<details>
<summary>预编译二进制</summary>

从 [GitHub Releases](https://github.com/jlovec1024/hapi/releases) 下载最新版。

```bash
xattr -d com.apple.quarantine ./hapi
chmod +x ./hapi
sudo mv ./hapi /usr/local/bin/
```
</details>

<details>
<summary>从源码构建</summary>

```bash
git clone https://github.com/jlovec1024/hapi.git
cd hapi
bun install
bun build:single-exe

./cli/dist/hapi
```
</details>

## Hub 配置

Hub 可部署在：

- **本地桌面**（默认）
- **远程主机**（VPS、云主机或任意可联网机器）

### 默认模式：Public Relay（推荐）

```bash
hapi hub --relay
```

终端会显示访问 URL 和二维码，扫码即可从任意网络访问。

`hapi server` 仍可作为别名使用。

- 使用 WireGuard + TLS 实现 **端到端加密**
- 几乎零配置
- 可穿透 NAT、防火墙和复杂网络环境

> **提示**：relay 默认使用 UDP。若连接不稳定，可设置 `HAPI_RELAY_FORCE_TCP=true` 强制 TCP。

### 仅本地模式

```bash
hapi hub
# 或
hapi hub --no-relay
```

默认监听 `http://localhost:3006`。

首次运行时，HAPI 会：

1. 创建 `~/.hapi/`
2. 生成安全 access token
3. 打印 token 并保存到 `~/.hapi/settings.json`

<details>
<summary>配置文件</summary>

```
~/.hapi/
├── settings.json      # 主配置
├── hapi.db           # SQLite 数据库（hub）
├── runner.state.json  # Runner 进程状态
└── logs/             # 日志目录
```
</details>

<details>
<summary>环境变量</summary>

| 变量 | 默认值 | settings.json 字段 | 说明 |
|----------|---------|---------------|-------------|
| `CLI_API_TOKEN` | 自动生成 | `cliApiToken` | 认证共享密钥 |
| `HAPI_API_URL` | `http://localhost:3006` | `apiUrl` | CLI 连接 hub 的 URL |
| `HAPI_LISTEN_HOST` | `127.0.0.1` | `listenHost` | Hub HTTP 监听地址 |
| `HAPI_LISTEN_PORT` | `3006` | `listenPort` | Hub HTTP 端口 |
| `HAPI_PUBLIC_URL` | - | `publicUrl` | 对外访问 URL |
| `CORS_ORIGINS` | - | `corsOrigins` | 允许的 CORS 来源（逗号分隔） |
| `HAPI_RELAY_FORCE_TCP` | `false` | - | relay 强制 TCP |
| `VAPID_SUBJECT` | `mailto:admin@hapi.run` | - | Web Push 联系信息 |
| `HAPI_HOME` | `~/.hapi` | - | 配置目录路径 |
| `DB_PATH` | `~/.hapi/hapi.db` | - | 数据库文件路径 |
</details>

<details>
<summary>settings.json 示例</summary>

配置优先级：**ENV > settings.json > 默认值**

当环境变量已设置但 settings.json 缺失对应项时，会自动写回保存。

```json
{
  "$schema": "https://hapi.run/docs/schemas/settings.schema.json",
  "listenHost": "0.0.0.0",
  "listenPort": 3006,
  "publicUrl": "https://your-domain.com"
}
```

JSON Schema: [settings.schema.json](https://hapi.run/schemas/settings.schema.json)
</details>

## CLI 配置

如果 hub 不在 localhost，请在运行 `hapi` 前设置：

```bash
export HAPI_API_URL="http://your-hub:3006"
export CLI_API_TOKEN="your-token-here"
```

也可以使用交互登录：

```bash
hapi auth login
```

认证相关命令：

```bash
hapi auth status
hapi auth login
hapi auth logout
```

每台机器都会在 `~/.hapi/settings.json` 里记录唯一 machine ID，用于：

- 多机器连接同一个 hub
- 在指定机器远程拉起会话
- 机器健康状态监控

## 运维与部署

### 自托管隧道

如果你不想使用公共 relay（例如追求更低延迟或自管基础设施），可用以下方式：

<details>
<summary>Cloudflare Tunnel</summary>

https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/

> **说明**：Cloudflare Quick Tunnels（TryCloudflare）不支持 SSE，HAPI 实时更新依赖 SSE，因此不支持。请使用 Named Tunnel。

**Named Tunnel 配置示例：**

```bash
# 安装 cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# 创建并配置 named tunnel
cloudflared tunnel create hapi
cloudflared tunnel route dns hapi hapi.yourdomain.com

# 运行 tunnel
cloudflared tunnel --protocol http2 run hapi
```

> **提示**：建议使用 `--protocol http2`（而非默认 QUIC）以减少长连接超时问题。

</details>

<details>
<summary>Tailscale</summary>

https://tailscale.com/download

```bash
sudo tailscale up
hapi hub
```

通过 Tailscale IP 访问：

```
http://100.x.x.x:3006
```
</details>

<details>
<summary>公网 IP / 反向代理</summary>

若 hub 有公网 IP，可直接访问 `http://your-hub-ip:3006`。

生产环境建议使用 Nginx/Caddy 等接入 HTTPS。

**自签名证书（HTTPS）说明**

当 `HAPI_API_URL` 指向自签名（或不受信任）证书的 `https://...` URL 时，CLI 可能报错：

```
Error: self signed certificate
```

建议修复顺序：

1. 使用公认 CA 证书（例如 Let's Encrypt）
2. 信任你的私有 CA（私网推荐）
3. 仅开发临时方案：关闭 TLS 校验（不安全）

```bash
# 推荐：信任你的 CA
export NODE_EXTRA_CA_CERTS="/path/to/your-ca.pem"

# 仅开发临时方案：关闭 TLS 校验（不安全）
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

若使用第 3 种方式，请默认存在 MITM 风险，不要在公网上使用。

</details>

### Runner 配置

运行后台服务以支持远程拉起会话：

```bash
hapi runner start
hapi runner status
hapi runner logs
hapi runner stop
```

Runner 运行后：

- 你的机器会出现在 “Machines” 列表
- 可从 Web 远程拉起会话
- 终端关闭后会话仍可持续

<details>
<summary>替代方案：pm2</summary>

如果你偏好 pm2：

```bash
pm2 start "hapi runner start --foreground" --name hapi-runner
pm2 save
```
</details>

### 后台服务常驻部署

确保 HAPI 在终端关闭或系统重启后依然运行。

<details>
<summary>快速方式：nohup</summary>

```bash
# Hub
nohup hapi hub --relay > ~/.hapi/logs/hub.log 2>&1 &

# Runner
nohup hapi runner start --foreground > ~/.hapi/logs/runner.log 2>&1 &
```

查看日志：

```bash
tail -f ~/.hapi/logs/hub.log
tail -f ~/.hapi/logs/runner.log
```

停止进程：

```bash
pkill -f "hapi hub"
pkill -f "hapi runner"
```
</details>

<details>
<summary>pm2（推荐给 Node.js 用户）</summary>

pm2 支持崩溃自动重启、开机自启。

```bash
# 安装 pm2
npm install -g pm2

# 启动 hub 与 runner
pm2 start "hapi hub --relay" --name hapi-hub
pm2 start "hapi runner start --foreground" --name hapi-runner

# 查看状态与日志
pm2 status
pm2 logs hapi-hub
pm2 logs hapi-runner

# 系统重启后自动恢复
pm2 startup    # 按提示执行
pm2 save       # 保存进程列表
```
</details>

<details>
<summary>macOS：launchd</summary>

在 macOS 上可通过 plist 配置自动启动。

**Hub**（`~/Library/LaunchAgents/com.hapi.hub.plist`）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.hapi.hub</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/hapi</string>
        <string>hub</string>
        <string>--relay</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/.hapi/logs/hub.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/.hapi/logs/hub.log</string>
</dict>
</plist>
```

**Runner**（`~/Library/LaunchAgents/com.hapi.runner.plist`）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.hapi.runner</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/hapi</string>
        <string>runner</string>
        <string>start</string>
        <string>--foreground</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/.hapi/logs/runner.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/.hapi/logs/runner.log</string>
</dict>
</plist>
```

加载/卸载服务：

```bash
# 加载（启动）
launchctl load ~/Library/LaunchAgents/com.hapi.hub.plist
launchctl load ~/Library/LaunchAgents/com.hapi.runner.plist

# 卸载（停止）
launchctl unload ~/Library/LaunchAgents/com.hapi.hub.plist
launchctl unload ~/Library/LaunchAgents/com.hapi.runner.plist
```

> **macOS 休眠提示**：显示器休眠后，后台进程可能被挂起。可使用 `caffeinate` 防止休眠：
> ```bash
> caffeinate -dimsu hapi hub --relay
> ```
> 或在单独终端运行 `caffeinate -dimsu`。
</details>

<details>
<summary>Linux：systemd</summary>

可创建 user-level systemd 服务实现自动启动。

**Hub**（`~/.config/systemd/user/hapi-hub.service`）：

```ini
[Unit]
Description=HAPI Hub
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/hapi hub --relay
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

**Runner**（`~/.config/systemd/user/hapi-runner.service`）：

```ini
[Unit]
Description=HAPI Runner
After=network.target hapi-hub.service

[Service]
Type=simple
ExecStart=/usr/local/bin/hapi runner start --foreground
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

启用并启动：

```bash
# 重新加载 systemd
systemctl --user daemon-reload

# 启用（登录时自启）
systemctl --user enable hapi-hub
systemctl --user enable hapi-runner

# 立即启动
systemctl --user start hapi-hub
systemctl --user start hapi-runner

# 查看状态/日志
systemctl --user status hapi-hub
journalctl --user -u hapi-hub -f
```

> **注销后继续运行**：
> ```bash
> loginctl enable-linger $USER
> ```
</details>

### 安全建议

- 妥善保管 token，并在必要时轮换
- 对外访问务必启用 HTTPS
- 生产环境应严格限制 CORS 来源

<details>
<summary>防火墙示例（ufw）</summary>

```bash
ufw allow from 192.168.1.0/24 to any port 3006
```
</details>
