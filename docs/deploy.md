# 部署指南：GitHub Actions 编译 + Cloudflare Workers 预览

本项目是 Next.js 15 应用（带 API 路由），通过 OpenNext 适配器运行在 Cloudflare Workers 上，数据存储在 Cloudflare D1（SQLite）。

当前线上地址：https://member-manager.accrepo.com （备用：https://member-manager.alangao2025.workers.dev）

## 总体方案

```
开发机 --git push--> GitHub --Actions: 编译 + 建库 + 迁移 + 发布--> Cloudflare Workers --> 浏览器预览
```

原则：**GitHub 和 Cloudflare 网页只在前期操作一次（创建 Token），之后所有操作都在开发机上通过命令行完成。**

| 角色 | 说明 |
| --- | --- |
| 开发机 | 写代码的云服务器，可以有多台，每台一个 GitHub Token |
| GitHub | 存代码 + 用 Actions 编译和发布 |
| Cloudflare | 运行网站（Workers）+ 存数据（D1），免费套餐 |

---

## 第零步：一次性准备（网页操作）

GitHub Token、Cloudflare Account ID 和 API Token 的创建步骤见 **[platform-setup.md](platform-setup.md)**。

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

**非交互方式**（适合批量配置，命令前加一个空格可避免记入 shell 历史）：

```bash
 GH_TOKEN=<token> GIT_NAME="<你的名字>" GIT_EMAIL="<你的邮箱>" bash scripts/setup-gh.sh
```

如果 Token 已被记入历史：`history | grep GH_TOKEN` 找到编号，`history -d <编号> && history -w` 删除。

### 1.2 验证

```bash
gh auth status        # 显示 Logged in to github.com account <用户名>
git config --global --list | grep user
```

### 1.3 注意：服务进程需要 HOME

AI 助手等以 systemd 服务方式运行的程序，如果服务配置里没有 `User=` 或 `HOME`，执行的命令拿不到 `HOME`，`gh` 和 `git` 会找不到登录信息。需要在 service 文件的 `[Service]` 中加：

```ini
Environment=HOME=/root
```

然后 `sudo systemctl daemon-reload && sudo systemctl restart <服务名>`。

---

## 第二步：创建 GitHub 仓库

```bash
cd <项目目录>

# 尚未初始化 git 的项目先执行：
# git init && git add -A && git commit -m "init"

gh repo create <仓库名> --public --source=. --remote=origin --push
```

这一条命令会：在 GitHub 上创建仓库 → 添加 `origin` 远程 → 推送当前分支。

公开还是私有：

| | `--public` | `--private`（免费账号） |
| --- | --- | --- |
| Actions 编译时长 | 标准编译机不限量 | 每月 2000 分钟，多个项目共享 |
| 编译成品存储 | 不计入额度 | 共 500MB |
| 代码可见性 | 所有人可见 | 仅自己可见 |

练手和预览项目用 `--public`；含隐私或商业代码的项目用 `--private`。不要把密钥、真实用户数据提交进公开仓库。

已有仓库切换可见性：

```bash
gh repo edit <用户名>/<仓库名> --visibility public --accept-visibility-change-consequences
```

---

## 第三步：发布到 Cloudflare

### 3.1 项目需要具备的文件

| 文件 | 作用 |
| --- | --- |
| `wrangler.json` | Worker 名称（即预览子域名）、D1 绑定。`database_id` 为占位值，部署时自动替换 |
| `open-next.config.ts` | OpenNext 适配器配置 |
| `migrations/*.sql` | D1 数据库结构和初始数据，按文件名顺序执行，已执行过的不会重复执行 |
| `lib/store.ts` | 通过 `getCloudflareContext().env.DB` 读写 D1 |
| `cloudflare-env.d.ts` | 绑定的 TypeScript 类型，修改 `wrangler.json` 后执行 `npm run cf:types` 重新生成 |
| `.github/workflows/deploy.yml` | 编译和发布流程 |

`package.json` 中的脚本：

| 命令 | 作用 |
| --- | --- |
| `npm run cf:build` | 用 OpenNext 编译出 Workers 版本（输出到 `.open-next/`） |
| `npm run cf:types` | 根据 `wrangler.json` 生成绑定类型 |

Cloudflare Workers 运行环境的限制：

- **不能写本地文件**，数据要存 D1 / KV / R2
- 免费套餐压缩后的代码包上限 3 MiB（本项目约 860 KiB），每天约 10 万次请求

### 3.2 配置仓库 Secrets（每个仓库一次）

在项目目录执行（或加 `-R <用户名>/<仓库名>` 在任意目录执行），按提示粘贴值：

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret list
```

Secrets 按仓库存储，每个新仓库都要配置一次。如果报 `HTTP 403: Resource not accessible by personal access token`，说明 GitHub Token 缺少 **Secrets: Read and write** 权限，修改方法见 [platform-setup.md](platform-setup.md#7-修改已有-token-的权限)。

### 3.3 发布流程

push 到 `main`（或手动 `gh workflow run deploy.yml`）后，`deploy.yml` 依次执行：

1. `npm ci` 安装依赖
2. 按 `wrangler.json` 中的 `database_name` 查找 D1 数据库，不存在则自动创建，并把真实 ID 写入 `wrangler.json`（仅在编译机上，不会提交回仓库）
3. `wrangler d1 migrations apply` 执行尚未执行过的 `migrations/*.sql`
4. `npm run cf:build` 编译
5. `wrangler deploy` 发布

整个过程约 1–2 分钟。首次发布后访问：`https://<worker名>.<你的子域>.workers.dev`

### 3.4 查看发布结果

```bash
gh run list --limit 5          # 最近的发布记录
gh run watch                   # 实时跟踪正在进行的发布
gh run view --log-failed       # 失败时查看错误日志
gh workflow run deploy.yml     # 不推送代码，手动触发一次发布
```

日常流程：改代码 → `git commit` → `git push` → `gh run watch` → 打开预览地址。

### 3.5 修改数据库结构

不要修改已经执行过的迁移文件，新增一个编号更大的文件，例如：

```sql
-- migrations/0002_add_note.sql
ALTER TABLE members ADD COLUMN note TEXT NOT NULL DEFAULT '';
```

push 后会自动执行。线上数据在每次发布间保留。

### 3.6 绑定自己的域名（可选）

1. Cloudflare 控制台 → Add a site → 添加域名，到域名注册商处把 Nameserver 改为 Cloudflare 提供的地址，等待生效。
2. 在 `wrangler.json` 中加入：

```json
"routes": [
  { "pattern": "member-manager.你的域名.com", "custom_domain": true }
],
"workers_dev": true
```

   `workers_dev: true` 用来保留 `workers.dev` 备用地址；不写的话，配置了 `routes` 后该地址会被自动关闭。

3. push 后自动生效，Cloudflare 会自动创建 DNS 记录并签发 HTTPS 证书（Let's Encrypt，自动续期）。

---

## 附：后续计划

- 新建项目脚本：一条命令完成 建目录 → 套用模板 → 建 GitHub 仓库 → 配置 Cloudflare Secrets → 首次发布。
- 把 GitHub / Cloudflare 相关操作封装成 skill，供 AI 助手直接调用。
