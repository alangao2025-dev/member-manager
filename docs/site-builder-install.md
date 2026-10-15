# site-builder 新机器部署指南

把 site-builder skill 装到一台新的开发机上。完成后，在这台机器上和 AI 对话就能把项目发布到 `https://<项目名>.accrepo.com`。

整个过程分三部分：

1. 网页上准备凭据（GitHub Token 每台机器一个；Cloudflare 凭据可以复用）
2. 把 skill 拷到新机器
3. 在新机器上运行一次 `setup.sh`

---

## 一、准备凭据

### 1. GitHub Fine-grained Token（每台机器新建一个）

GitHub → 头像 → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**：

| 字段 | 填写 |
| --- | --- |
| Token name | 机器名，例如 `cloud-b`（不能和已有 Token 重名） |
| Resource owner | 自己的账号 |
| Expiration | 90 天或自定义（最长一年） |
| Repository access | **All repositories**（否则以后新建的仓库无法操作） |

Repository permissions（新版界面先点 **Add permissions**）：

| 权限 | 级别 |
| --- | --- |
| Actions | Read and write |
| Administration | Read and write |
| Contents | Read and write |
| Secrets | Read and write |
| Workflows | Read and write |
| Metadata | Read-only（自动勾上） |

点 **Generate token**，复制 `github_pat_` 开头的值。离开页面后无法再看到。

每台机器单独一个 Token，某台机器出问题时只删除它对应的 Token。

### 2. Cloudflare Account ID 和 API Token（所有机器共用）

已有的话直接复用，不用新建。从密码管理器里取出来即可。

需要新建时：

- **Account ID**：https://dash.cloudflare.com → **Workers & Pages** 页面右侧栏，或浏览器地址栏 `dash.cloudflare.com/` 后的 32 位字符串。
- **API Token**：头像 → **My Profile** → **API Tokens** → **Create Token** → **Edit Cloudflare Workers** 模板 → **Use template**：
  - Permissions 点 **+ Add more**，补充 `Account` → `D1` → `Edit`
  - Account Resources：Include → 自己的账号
  - Zone Resources：Include → All zones from an account → 自己的账号
  - Client IP 过滤留空
  - **Continue to summary** → **Create Token** → 立即复制

> Token 等同于密码：不要发到对话里，不要提交到仓库，不要截图。

---

## 二、把 skill 拷到新机器

skill 是一个目录：`~/.agents/skills/site-builder/`。在已经装好 skill 的机器上执行：

```bash
ssh <用户>@<新机器> "mkdir -p ~/.agents/skills"
scp -r ~/.agents/skills/site-builder <用户>@<新机器>:~/.agents/skills/
```

也可以把这个目录放进一个 GitHub 仓库，新机器上 `git clone` 到 `~/.agents/skills/site-builder`，以后更新用 `git pull`。

拷完后确认：

```bash
ls ~/.agents/skills/site-builder/SKILL.md
```

---

## 三、在新机器上运行 setup.sh

在新机器的**终端**里执行（不要让 AI 代为执行，它需要你输入 Token）：

```bash
bash ~/.agents/skills/site-builder/scripts/setup.sh
```

脚本会依次：

1. 安装 `gh`（支持 Debian/Ubuntu、CentOS/RHEL/Fedora、macOS；已装则跳过）
2. 提示粘贴 **GitHub Token**，登录并让 `git push` 使用这个凭据
3. 提示输入 git 提交用户名和邮箱（已设置则跳过）
4. 提示粘贴 **Cloudflare API Token** 和 **Account ID**，在线验证有效后保存到 `~/.config/site-builder/config`（权限 600，只有自己能读）

输入 Token 时屏幕不显示内容，属于正常现象。看到 `全部完成` 即成功。

### 非交互方式（批量配置）

命令前加一个空格，避免 Token 记入 shell 历史：

```bash
 GH_TOKEN=<GitHub Token> \
 GIT_NAME="<名字>" GIT_EMAIL="<邮箱>" \
 CLOUDFLARE_API_TOKEN=<Cloudflare Token> CLOUDFLARE_ACCOUNT_ID=<Account ID> \
 bash ~/.agents/skills/site-builder/scripts/setup.sh
```

### 验证

```bash
bash ~/.agents/skills/site-builder/scripts/setup.sh --check
```

全部为绿色、最后显示 `环境就绪` 即可。

### 让 AI 加载 skill

- 已经打开的 pi 对话里输入 `/reload`，或新开一个对话。
- 对 AI 说一句“做一个简单的测试页面并发布”，能拿到 `https://<项目名>.accrepo.com` 地址就说明整条链路通了。

---

## 四、注意事项

### AI 以 systemd 服务运行时要设置 HOME

如果 pi-web 等 AI 服务由 systemd 启动，而 service 文件里没有 `User=` 或 `HOME`，AI 执行命令时找不到 `gh` 的登录信息，会误报“GitHub 未登录”。在 service 文件的 `[Service]` 中加：

```ini
Environment=HOME=/root
```

然后执行（会中断当前 AI 对话）：

```bash
sudo systemctl daemon-reload && sudo systemctl restart <服务名>
```

脚本自身在 `HOME` 为空时会默认使用 `/root`；用非 root 用户运行服务时必须正确设置 `HOME`。

### 更换预览域名

默认域名是 `accrepo.com`。换成其他已接入 Cloudflare 的域名：

```bash
 CF_RESET=1 PREVIEW_DOMAIN=<新域名> bash ~/.agents/skills/site-builder/scripts/setup.sh
```

只影响之后新建的项目；已有项目的域名写在各自的 `wrangler.json` 里。

---

## 五、维护

| 情况 | 处理 |
| --- | --- |
| GitHub Token 到期或泄露 | 网页上删除旧 Token、新建一个；新机器上 `gh auth logout`，再运行 `setup.sh` |
| GitHub Token 缺权限（报 403） | 网页上编辑该 Token 补权限，值不变，立即生效 |
| Cloudflare Token 到期或泄露 | 网页上 Roll 或新建；每台机器执行 `CF_RESET=1 bash .../setup.sh` 重新输入；已有仓库的 Secrets 需要逐个更新：`gh secret set CLOUDFLARE_API_TOKEN -R <owner>/<repo>` |
| 停用某台机器 | 删除它的 GitHub Token；删除该机器上的 `~/.config/site-builder/config` |
| 更新 skill | 用第二节的方法重新拷贝整个目录，然后在对话中 `/reload` |

## 六、常见错误

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `--check` 显示 GitHub 未登录，但终端里 `gh auth status` 正常 | AI 服务的 `HOME` 不对 | 见第四节 |
| `无法读取 ... 的 Secrets` | GitHub Token 缺 Secrets 写权限 | 编辑 Token 补权限 |
| `gh repo create` 失败 / 403 | 缺 Administration 写权限 | 编辑 Token 补权限 |
| 推送时提示无权修改 workflow | 缺 Workflows 写权限 | 编辑 Token 补权限 |
| `Cloudflare Token 无效或已过期` | Token 错误或过期 | `CF_RESET=1` 重新运行 `setup.sh` |
| 发布日志里 D1 步骤报认证错误 | Cloudflare Token 缺 D1 Edit | 编辑 Cloudflare Token 补权限 |
