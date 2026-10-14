# cf-preview 使用说明

cf-preview 让 AI 把你和它一起写的网站发布到 Cloudflare，得到一个可以直接打开的预览地址：

```
https://<项目名>.accrepo.com
```

使用前，这台机器需要已经按 [cf-preview-install.md](cf-preview-install.md) 配置好。

---

## 一、怎么用

**不需要特别的提示词**，正常说话即可。下面这些说法都会让 AI 使用这个 skill：

- “发布一下”
- “部署看看效果”
- “上线”“预览”“推到 GitHub”
- “做一个咖啡店官网，做完发布”
- “把首页标题改成红色，然后发布”

如果 AI 没有自动使用，在消息前面加上 `/skill:cf-preview` 强制使用：

```
/skill:cf-preview 发布当前项目
```

---

## 二、AI 会做什么

1. **检查环境**：GitHub、Cloudflare 凭据是否可用。没配好会停下来，让你在终端运行 `setup.sh`。
2. **确定项目名**：项目名同时用作 GitHub 仓库名和子域名。
   - 已经发布过的项目，沿用原来的名字。
   - 新项目由 AI 根据你的描述取名，中文名会翻译成简短的英文，例如“会员管理” → `member-manager`，“咖啡店官网” → `coffee-shop`。
   - 首次发布前 AI 会告诉你名字和预览地址，不满意可以让它换。
3. **首次发布时适配 Cloudflare**：添加发布配置；遇到 Cloudflare 不支持的写法（例如把数据写进本地文件）会改成支持的方式（例如 D1 数据库）。
4. **提交并发布**：自动初始化 git、创建 GitHub 仓库（默认公开）、写入 Cloudflare 密钥、提交、推送，然后等待 GitHub Actions 编译发布（通常 1–2 分钟）。
5. **反馈结果**：
   - 成功：给出预览地址，并确认地址能正常打开。
   - 失败：读取错误日志，修改代码后重新发布。同一个错误连续修 3 次还不行，会停下来向你说明。

---

## 三、常用的说法

| 想做的事 | 可以这样说 |
| --- | --- |
| 新建并发布 | “做一个 xxx 页面并发布” |
| 改完再发布 | “把 xxx 改成 yyy，然后发布” |
| 只重新发布 | “重新发布一下” |
| 指定项目名 | “项目名用 `my-shop`” |
| 私有仓库 | “发布，仓库设为私有” |
| 需要存数据 | “做一个留言板，留言要能保存” （AI 会使用 D1 数据库） |
| 发布失败自己看日志 | “把上次发布失败的日志给我看看” |

---

## 四、你需要知道的规则

### 预览地址

- 主地址：`https://<项目名>.accrepo.com`
- 备用地址：`https://<项目名>.alangao2025.workers.dev`
- 新项目第一次发布后，主地址的 HTTPS 证书可能要等几分钟才生效，期间可以先用备用地址。
- 如果在发布完成前就打开过主地址，电脑会缓存“域名不存在”的结果，最长约 30 分钟。此时备用地址能打开、主地址打不开：清除 DNS 缓存（Windows `ipconfig /flushdns`；macOS `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`；Chrome 还要在 `chrome://net-internals/#dns` 点 Clear host cache），或换手机流量 / 无痕窗口试试。

### 项目名

- 只能用小写字母、数字和连字符，最长 63 个字符。
- 发布后就固定了，**不要再改**。改名相当于新建一个项目，旧地址和旧数据库会留在原处。

### 公开仓库

- 默认建成**公开**仓库：编译不限时长，但任何人都能看到代码。
- 不要让 AI 把密码、Token、真实用户数据写进代码。
- 需要保密的项目，发布时说“设为私有”。私有仓库每月有 2000 分钟免费编译额度，所有私有项目共享。

### Cloudflare 能跑什么

| 能跑 | 不能跑 |
| --- | --- |
| 静态网页（HTML/CSS/JS） | 需要写本地文件的程序 |
| 前端项目（Vite、React、Vue 等） | Python、Java、PHP 等服务端程序 |
| Next.js（包括 API 接口） | 长连接、后台常驻任务 |
| 用 D1 数据库存数据 | 体积很大的应用（压缩后超过 3 MiB） |

遇到不能跑的情况，AI 会告诉你并建议改写方式。

### 免费额度

- 每天约 10 万次访问，预览完全够用。
- 每个账号最多 10 个 D1 数据库，只有需要存数据的项目才会用到。

---

## 五、自己手动操作（不经过 AI）

在终端里也可以直接用脚本：

```bash
# 检查环境
bash ~/.agents/skills/cf-preview/scripts/setup.sh --check

# 发布项目（目录里需要已有 wrangler.json 和 .github/workflows/deploy.yml）
bash ~/.agents/skills/cf-preview/scripts/publish.sh -m "说明本次改动" <项目目录>

# 首次发布建成私有仓库
bash ~/.agents/skills/cf-preview/scripts/publish.sh --private -m "init" <项目目录>
```

查看发布记录：

```bash
cd <项目目录>
gh run list --limit 5          # 最近几次发布
gh run view --log-failed       # 最近一次失败的日志
```

---

## 六、删除不要的项目

1. 删除 GitHub 仓库（需要 Token 有 Administration 权限，`gh` 可能还需要 `delete_repo` 授权，网页上删除最简单）：GitHub 仓库页 → **Settings** → 最底部 **Delete this repository**。
2. 删除 Cloudflare 上的应用：https://dash.cloudflare.com → **Workers & Pages** → 点项目名 → **Settings** → 最底部 **Delete**。绑定的子域名会一起删除。
3. 如果项目用了数据库：**Storage & Databases** → **D1** → 删除同名数据库。
4. 删除本机项目目录。
