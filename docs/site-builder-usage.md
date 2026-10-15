# site-builder 使用说明

site-builder 让 AI 把你和它一起写的网站发布到 Cloudflare，得到一个可以直接打开的预览地址：

```
https://<项目名>.accrepo.com
```

使用前，这台机器需要已经按 [site-builder-install.md](site-builder-install.md) 配置好。

---

## 一、怎么用

**不需要特别的提示词**，正常说话即可。下面这些说法都会让 AI 使用这个 skill：

- “做一个 xxx 网站 / 页面 / 小工具”（开始写代码前就会加载，用来选技术架构）
- “发布一下”
- “部署看看效果”
- “上线”“预览”“推到 GitHub”
- “做一个咖啡店官网，做完发布”
- “把首页标题改成红色，然后发布”

如果 AI 没有自动使用，在消息前面加上 `/skill:site-builder` 强制使用：

```
/skill:site-builder 发布当前项目
```

---

## 二、AI 会做什么

1. **选技术架构**（仅新项目）：在写代码之前，从默认架构中选最简单能满足需求的一种，并告诉你选了什么、为什么。见第四节“默认技术架构”。
2. **检查环境**：GitHub、Cloudflare 凭据是否可用。没配好会停下来，让你在终端运行 `setup.sh`。
3. **确定项目名**：项目名同时用作 GitHub 仓库名和子域名。
   - 已经发布过的项目，沿用原来的名字。
   - 新项目由 AI 根据你的描述取名，中文名会翻译成简短的英文，例如“会员管理” → `member-manager`，“咖啡店官网” → `coffee-shop`。
   - 首次发布前 AI 会告诉你名字和预览地址，不满意可以让它换。
4. **首次发布时适配 Cloudflare**：添加发布配置；遇到 Cloudflare 不支持的写法（例如把数据写进本地文件）会改成支持的方式（例如 D1 数据库）。
5. **提交并发布**：自动初始化 git、创建 GitHub 仓库（默认公开）、写入 Cloudflare 密钥、提交、推送，然后等待 GitHub Actions 编译发布（通常 1–2 分钟）。
6. **反馈结果**：
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
| 指定技术 | “用 Astro 做”“用 Next.js 做” |
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

### 默认技术架构

GitHub Actions 几乎什么都能编译，真正的限制在 Cloudflare 能运行什么。AI 会从下面 5 种已验证的架构中，选**最简单**能满足需求的一种：

| 架构 | 适合 | 例子 |
| --- | --- | --- |
| 纯静态 HTML | 一两页的展示页面 | 活动页、个人名片、落地页 |
| Astro | 内容多、页面多，不需要登录和保存数据 | 企业官网、博客、文档站、作品集 |
| Vite + React | 交互复杂的前端应用，不需要自己的服务器存数据 | 计算器、小工具、小游戏 |
| Vite + React + Hono + D1 | 需要自己的接口或保存数据 | 留言板、预约表单、后台管理、小型业务系统 |
| Next.js + D1 | 需要 SEO 的动态页面，或你明确要求用 Next.js | 内容会变化的商品页、会员系统 |

- 你可以指定技术。在上表里的直接用；不在表里但 Cloudflare 能运行的（例如用 Vue 代替 React），AI 也会照做，并说明这是非默认架构。
- 你指定的技术 Cloudflare 运行不了时，AI 会先说明原因并推荐替代方案，你同意后才开始写。

### Cloudflare 运行不了的

| 不支持 | AI 会改用 |
| --- | --- |
| 把数据写进本地文件 | D1 数据库 |
| Express 等需要常驻、监听端口的服务器 | Hono 写接口 |
| PHP、Java、Python 服务、WordPress | 用上表的架构重写 |
| 需要本机编译的依赖（`sharp`、`better-sqlite3` 等） | 纯 JS 替代方案 |
| 服务端处理大图、视频等重计算 | 放到浏览器里处理 |
| Docker | — |

文件、图片存储（R2）需要先在 Cloudflare 控制台开通（要绑定付款方式），默认不用，需要时 AI 会先问你。

### 免费额度

- 每天约 10 万次访问，预览完全够用。
- 压缩后的代码包不超过 3 MiB；每次请求的服务端计算时间约 10 毫秒，普通页面和接口足够。
- 每个账号最多 10 个 D1 数据库，只有需要存数据的项目才会用到。

---

## 五、自己手动操作（不经过 AI）

在终端里也可以直接用脚本：

```bash
# 检查环境
bash ~/.agents/skills/site-builder/scripts/setup.sh --check

# 发布项目（目录里需要已有 wrangler.json 和 .github/workflows/deploy.yml）
bash ~/.agents/skills/site-builder/scripts/publish.sh -m "说明本次改动" <项目目录>

# 首次发布建成私有仓库
bash ~/.agents/skills/site-builder/scripts/publish.sh --private -m "init" <项目目录>
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
