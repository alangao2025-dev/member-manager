# 平台准备：GitHub 与 Cloudflare 网页操作

本文档只包含需要在 **GitHub / Cloudflare 网页上**完成的操作，以及把凭据存入 GitHub 的命令。这些操作只在前期做一次（或新增机器、Token 到期时再做）。完成后，日常的建仓库、编译、发布都在开发机命令行完成，见 [deploy.md](deploy.md)。

## 总览

| 平台 | 准备什么 | 数量 | 存放位置 |
| --- | --- | --- | --- |
| GitHub | Fine-grained Token | **每台开发机一个** | 开发机上（由 `scripts/setup-gh.sh` 写入） |
| Cloudflare | Account ID | 一个 | 每个仓库的 GitHub Secrets |
| Cloudflare | API Token | 一个 | 每个仓库的 GitHub Secrets |

> 所有 Token 都等同于账号密码：只显示一次，立即复制保存到密码管理器；不要提交到仓库，不要发到聊天里，不要截图分享。

---

## 一、GitHub：创建 Fine-grained Token

### 1. 进入创建页面

1. 登录 https://github.com ，点右上角**头像** → **Settings**。
2. 左侧菜单拉到最底部 → **Developer settings**。
3. 左侧 **Personal access tokens** → **Fine-grained tokens**。
4. 点 **Generate new token**（可能要求输入密码或两步验证）。

### 2. 填写基本信息

| 字段 | 填写 |
| --- | --- |
| Token name | 机器名，例如 `cloud-a`（同一账号下不能重名） |
| Description | 可选，例如“云服务器 A 编译部署用” |
| Resource owner | **自己的账号**（不要选组织） |
| Expiration | 90 days 或 Custom（最长一年），到期前重新生成 |

### 3. Repository access

选 **All repositories**。

> 不要选 “Only select repositories”，否则以后用命令行新建的仓库，这个 Token 无权操作。

### 4. 权限

在 **Permissions** → **Repository permissions**（新版界面先点 **Add permissions** 再勾选）设置：

| 权限 | 级别 | 用途 |
| --- | --- | --- |
| Actions | Read and write | 查看编译状态、手动触发发布 |
| Administration | Read and write | 用命令行新建仓库、修改公开/私有 |
| Contents | Read and write | 推送代码 |
| Secrets | Read and write | 用命令行写入 Cloudflare 凭据 |
| Workflows | Read and write | 推送 `.github/workflows/` 下的文件 |
| Metadata | Read-only | 必选，自动勾上 |

其他权限保持 **No access**，Account permissions 不用动。

### 5. 生成并保存

1. 页面底部确认权限摘要 → **Generate token**。
2. 复制以 `github_pat_` 开头的 Token。离开页面后无法再查看。
3. 到开发机上执行 `bash scripts/setup-gh.sh`，按提示粘贴（见 [deploy.md 第一步](deploy.md#第一步开发机配置每台机器一次)）。

### 6. 多台机器

每台机器重复以上步骤，只改 Token name（`cloud-a`、`cloud-b` …）。在 Fine-grained tokens 列表可以看到每个 Token 的最近使用时间，某台机器出问题时只删除对应 Token 即可。

### 7. 修改已有 Token 的权限

权限漏选时（例如执行 `gh secret set` 报 `HTTP 403: Resource not accessible by personal access token`）：

1. Fine-grained tokens 列表 → 点击对应 Token → **Edit**。
2. 修改权限 → 页面底部 **Update**。

**Token 值不变，立即生效，开发机上不需要重新配置。**

### 8. Token 到期或泄露

1. Fine-grained tokens 列表 → 对应 Token → **Delete**（泄露时立即删除）。
2. 按上面步骤重新生成一个同名 Token。
3. 在该开发机上执行 `gh auth logout`，再执行 `bash scripts/setup-gh.sh` 粘贴新 Token。

---

## 二、Cloudflare：Account ID 与 API Token

### 1. 注册并进入 Workers

1. 登录 https://dash.cloudflare.com （没有账号先注册，选 **Free** 套餐）。
2. 左侧菜单 → **Workers & Pages**（新版界面可能在 **Compute (Workers)** 下）。
3. 首次进入如果提示设置 `workers.dev` 子域名，填一个名字（例如 `alangao2025`）。以后预览地址为 `项目名.子域名.workers.dev`。

> **不要点 Create application。** 应用由 GitHub Actions 首次发布时自动创建，手动创建可能与代码中的配置冲突。

### 2. 复制 Account ID

任选一种方式：

- Workers & Pages 页面**右侧栏**的 **Account ID** → 复制按钮。
- 浏览器地址栏 `https://dash.cloudflare.com/` 后面那串 32 位字母数字。

Account ID 不是机密。

### 3. 创建 API Token

1. 右上角**头像** → **My Profile** → 左侧 **API Tokens**。
2. **Create Token** → 在 **Edit Cloudflare Workers** 模板那一行点 **Use template**。
3. **补充 D1 权限**（模板默认不含）：Permissions 区域点 **+ Add more** →
   - `Account` → `D1` → `Edit`
4. **Account Resources**：`Include` → 自己的账号。
5. **Zone Resources**：`Include` → `All zones from an account` → 自己的账号（暂时没有域名也这样选，以后绑定域名可直接用）。
6. **Client IP Address Filtering**：留空（GitHub 编译机 IP 不固定）。
7. **TTL**：可不设，或设置过期时间。
8. **Continue to summary** → 确认列表中有 Workers Scripts、D1 等权限 → **Create Token**。
9. **立即复制** Token，只显示一次。

页面会给出一条 `curl` 测试命令，可用来验证，返回 `"status": "active"` 即有效。

### 4. Token 到期或泄露

My Profile → API Tokens → 对应 Token 右侧 `...` → **Roll**（重新生成值）或 **Delete**，然后按下一节重新写入所有仓库的 Secrets。

---

## 三、把 Cloudflare 凭据存入 GitHub Secrets

Secrets 按仓库存储，**每个新仓库都要执行一次**。在开发机上：

```bash
cd <项目目录>                          # gh 根据当前目录的 git 远程判断是哪个仓库
gh secret set CLOUDFLARE_API_TOKEN     # 提示 ? Paste your secret 时粘贴，回车
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret list                         # 能看到这两个名字即成功
```

不进入项目目录时，用 `-R` 指定仓库：

```bash
gh secret set CLOUDFLARE_API_TOKEN  -R <GitHub用户名>/<仓库名>
gh secret set CLOUDFLARE_ACCOUNT_ID -R <GitHub用户名>/<仓库名>
```

粘贴的值不会显示，也不会记入 shell 历史。

---

## 四、可选：绑定自己的域名

1. Cloudflare 控制台首页 → **Add a site**（或 **Add a domain**）→ 输入域名 → 选 Free 套餐。
2. Cloudflare 给出两个 Nameserver 地址，到**域名注册商**的管理后台把域名的 Nameserver 改成这两个地址。
3. 等待生效（几分钟到 24 小时），Cloudflare 会发邮件通知，控制台中域名状态变为 **Active**。
4. 之后在项目的 `wrangler.json` 中配置路由即可，见 [deploy.md 3.6](deploy.md#36-绑定自己的域名可选)。

---

## 五、检查清单

| 项目 | 检查方式 |
| --- | --- |
| GitHub Token 权限齐全 | Token 详情页，六项权限与上表一致 |
| 开发机已登录 GitHub | `gh auth status` 显示 `Logged in` |
| Cloudflare Token 含 D1 | Token 摘要中有 `D1: Edit` |
| 仓库 Secrets 已配置 | `gh secret list` 显示两个 `CLOUDFLARE_*` |

## 六、常见错误

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `gh secret set` 报 403 `Resource not accessible by personal access token` | GitHub Token 缺 Secrets 写权限 | 一-7 修改权限 |
| `gh repo create` 报 403 | GitHub Token 缺 Administration 写权限 | 一-7 修改权限 |
| push 时提示无权推送 workflow 文件 | GitHub Token 缺 Workflows 写权限 | 一-7 修改权限 |
| 新建的仓库无法操作 | Repository access 不是 All repositories | 编辑 Token 改为 All repositories |
| 发布时 D1 相关步骤报认证错误 | Cloudflare Token 缺 D1 Edit | 编辑 Cloudflare Token 补权限 |
| 发布时报 `CLOUDFLARE_API_TOKEN` 未设置 | 该仓库没有配置 Secrets | 第三节 |
| 编译日志末尾有 `checks:read` 相关 403 提示 | Fine-grained Token 不支持该权限 | 可忽略，不影响结果 |
