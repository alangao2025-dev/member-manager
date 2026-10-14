# 部署指南：GitHub Actions 编译 + 云服务器运行

本项目是 Next.js 15 应用，带 API 路由，并把数据写入 `members.json`，因此服务器上必须运行 Node.js，不能作为纯静态网站部署。

## 总体方案

```
云服务器(开发机) --gh / git push--> GitHub --Actions 编译--> release.tar.gz --SSH 部署--> 目标服务器 (node server.js)
```

原则：**GitHub 网页只在前期操作一次（创建 Token），之后所有操作都在云服务器上通过 `gh` 命令行完成。**

| 角色 | 说明 |
| --- | --- |
| 开发机 | 写代码的云服务器，可以有多台，每台一个 Token |
| GitHub | 存代码 + 用 Actions 编译 |
| 目标服务器 | 运行编译后的成品，供浏览器访问 |

---

## 第零步：一次性准备（GitHub 网页）

### 0.1 为每台开发机创建一个 Token

每台机器单独一个 Token，命名带机器名（如 `cloud-a`）。某台机器出问题时只需吊销对应 Token，不影响其他机器。

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token：

- **Token name**：机器名，例如 `cloud-a`
- **Expiration**：设置过期时间，到期前重新生成即可
- **Repository access**：**All repositories**（否则以后新建的仓库无法使用该 Token）
- **Repository permissions**：

| 权限 | 级别 | 用途 |
| --- | --- | --- |
| Administration | Read and write | 新建仓库 |
| Contents | Read and write | 推送代码 |
| Workflows | Read and write | 推送 `.github/workflows` 下的文件 |
| Actions | Read and write | 查看编译状态、下载成品、手动触发编译 |
| Secrets | Read and write | 用命令行配置部署所需的 Secrets |
| Metadata | Read-only | 必选（自动勾上） |

生成后**立即复制保存** Token，页面关闭后无法再次查看。

> Token 等同于账号密码，不要提交到任何仓库，也不要发到聊天里。

---

## 第一步：开发机配置（每台机器一次）

### 1.1 一键安装与登录

项目里的 `scripts/setup-gh.sh` 会依次完成：

1. 安装 gh（支持 Debian/Ubuntu、CentOS/RHEL/Fedora、macOS；已安装则跳过）
2. 用 Token 登录 gh，并执行 `gh auth setup-git`，让 `git push/pull` 也使用该凭据（已登录则跳过）
3. 设置 git 提交身份（用户名、邮箱），默认分支设为 `main`（已设置则跳过）

脚本可以重复执行，不会重复安装。

**交互方式**（按提示粘贴 Token、输入用户名和邮箱）：

```bash
bash scripts/setup-gh.sh
```

**新机器上没有项目代码时**，把脚本复制过去执行即可：

```bash
scp scripts/setup-gh.sh <用户>@<新机器IP>:/tmp/
ssh -t <用户>@<新机器IP> "bash /tmp/setup-gh.sh"
```

**非交互方式**（适合批量配置）：

```bash
GH_SETUP_TOKEN=<token> GIT_NAME="<你的名字>" GIT_EMAIL="<你的邮箱>" bash scripts/setup-gh.sh
```

> 非交互方式会让 Token 留在 shell 历史里，执行后可用 `history -c` 清除，或在命令前加一个空格（bash 默认 `HISTCONTROL=ignorespace` 时不记录）。

### 1.2 验证

```bash
gh auth status        # 显示 Logged in to github.com account <用户名>
git config --global --list | grep user
```

---

## 第二步：新建项目并在 GitHub 编译

### 2.1 项目需要具备的文件

以本项目为例，已经准备好：

| 文件 | 作用 |
| --- | --- |
| `next.config.mjs` | 设置 `output: "standalone"`，编译出可直接 `node server.js` 运行的独立包 |
| `lib/store.ts` | 支持环境变量 `DATA_DIR` 指定数据目录，重新部署时不会覆盖数据 |
| `.github/workflows/build.yml` | push 到 `main` 时自动编译，成品打包为 `release.tar.gz` artifact |
| `.gitignore` | 忽略 `node_modules`、`.next`、`.env*` |

其他 Next.js 项目可以复制 `next.config.mjs` 的 `output` 配置和 `.github/workflows/build.yml` 直接复用。

### 2.2 在命令行创建 GitHub 仓库并推送

```bash
cd /home/allen/compile_test

# 尚未初始化 git 的项目先执行：
# git init && git add -A && git commit -m "init"

gh repo create member-manager --public --source=. --remote=origin --push
```

这一条命令会：在 GitHub 上创建仓库 → 添加 `origin` 远程 → 推送当前分支。

公开还是私有：

| | `--public` | `--private`（免费账号） |
| --- | --- | --- |
| Actions 编译时长 | 标准编译机不限量 | 每月 2000 分钟，多个项目共享 |
| 编译成品存储 | 不计入额度 | 共 500MB |
| 代码可见性 | 所有人可见 | 仅自己可见 |

练手和预览项目用 `--public`；含隐私或商业代码的项目用 `--private`。不要把密钥、真实用户数据提交进公开仓库，密钥应放在 GitHub Secrets 里。

已有仓库切换可见性：

```bash
gh repo edit <用户名>/<仓库名> --visibility public --accept-visibility-change-consequences
```

### 2.3 查看编译结果

```bash
gh run list --limit 5          # 最近的编译记录
gh run watch                   # 实时跟踪正在进行的编译
gh run view --log-failed       # 编译失败时查看错误日志
gh workflow run build.yml      # 不推送代码，手动触发一次编译
```

看到状态为 `completed` / `success` 即编译成功。

### 2.4 （可选）下载成品到本机检查

```bash
gh run download --name release --dir /tmp/release
tar -tzf /tmp/release/release.tar.gz | head
```

之后的日常流程就是：改代码 → `git commit` → `git push` → `gh run watch`。

---

## 第三步：部署到目标服务器

> GitHub Actions 的部署任务会在第二步跑通后加入 `build.yml`。下面是目标服务器端需要做的准备。

### 3.1 需要提供的信息

- 目标服务器操作系统（如 Ubuntu 22.04 / Debian 12）
- 公网 IP、SSH 用户名和端口
- 是否已安装 Node.js（需要 18.18 及以上，推荐 22）
- 访问方式：`http://IP:3000` 直接访问，还是域名 + Nginx 反向代理（可选 HTTPS）

### 3.2 安装 Node.js（如未安装）

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

### 3.3 准备目录

```bash
sudo mkdir -p /opt/member-manager/app /opt/member-manager/data
sudo chown -R $USER:$USER /opt/member-manager
```

- `/opt/member-manager/app`：每次部署覆盖的程序文件
- `/opt/member-manager/data`：会员数据，部署时**不会**被覆盖

首次部署前放入初始数据（在开发机项目目录执行）：

```bash
scp data/members.json <用户>@<服务器IP>:/opt/member-manager/data/
```

### 3.4 创建部署专用 SSH 密钥并配置 Secrets（在开发机执行）

GitHub Actions 用这个密钥登录目标服务器上传成品：

```bash
ssh-keygen -t ed25519 -f /tmp/deploy_key -N "" -C "github-actions-deploy"
ssh-copy-id -i /tmp/deploy_key.pub <用户>@<服务器IP>

# 用 gh 写入仓库 Secrets，无需打开网页
gh secret set SSH_HOST --body "<服务器IP>"
gh secret set SSH_USER --body "<SSH用户名>"
gh secret set SSH_PORT --body "22"
gh secret set SSH_KEY  < /tmp/deploy_key

rm /tmp/deploy_key /tmp/deploy_key.pub
gh secret list
```

### 3.5 用 systemd 运行服务（在目标服务器执行）

创建 `/etc/systemd/system/member-manager.service`：

```ini
[Unit]
Description=Member Manager (Next.js)
After=network.target

[Service]
User=<SSH用户名>
WorkingDirectory=/opt/member-manager/app
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=DATA_DIR=/opt/member-manager/data
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable member-manager
```

部署任务上传新版本后会执行 `sudo systemctl restart member-manager`。如果 SSH 用户不是 root，需要允许它免密重启该服务：

```bash
echo "<SSH用户名> ALL=(root) NOPASSWD: /usr/bin/systemctl restart member-manager" | sudo tee /etc/sudoers.d/member-manager
```

### 3.6 开放端口并访问

- 在云服务商控制台的**安全组 / 防火墙**放行 TCP `3000`（使用 Nginx 时放行 `80`/`443`）。
- 服务器本机有防火墙时也要放行，例如 `sudo ufw allow 3000`。
- 浏览器访问：`http://<服务器IP>:3000`

### 3.7 常用排查命令

```bash
sudo systemctl status member-manager      # 运行状态
sudo journalctl -u member-manager -f      # 实时日志
sudo systemctl restart member-manager     # 手动重启
```

---

## 附：后续计划

- 把 GitHub 相关操作（建仓库、推送、查看编译、配置 Secrets）封装成 skill，供 AI 助手直接调用。
