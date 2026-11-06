# 派生业务项目

Podium 是框架仓库，业务项目另起 repository。不要让业务页面直接进 podium，
否则框架升级时会把业务改动一起带走。

## 1. 创建项目仓库

```bash
git clone https://gitee.com/jktantan/podium.git my-project
cd my-project

# podium 保留为 upstream，业务仓库作为 origin
git remote rename origin podium
git remote add origin <业务项目仓库地址>
git push -u origin master
```

如果不需要后续合并框架更新，也可以直接下载 zip / 用 `degit` 拷贝后删除 `.git`，
但那样就放弃了自动同步能力。

## 2. 替换清单

派生后必须改：

| 位置                                                    | 内容                                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `package.json`                                          | `name`、`description`、`repository`；`version` 与 podium 无关，从 `0.1.0` 开始               |
| `.env.dev` / `.env.test` / `.env.staging` / `.env.prod` | `NUXT_PUBLIC_APP_NAME`、`NUXT_PUBLIC_API_BASE_URL`、`NUXT_PUBLIC_API_MOCK=0`、STOMP 相关变量 |
| `.env.example`                                          | 同上，作为团队参考                                                                           |
| `README.md`                                             | 换成业务项目的说明                                                                           |

展示站相关资产可以整份删除：

- `.env.pages`
- `package.json` 里的 `build:github-pages`
- `.github/workflows/pages.yml`
- `README.md` 的「演示站」章节

`optional-layers/`（demo + mock）默认保留在仓库里：`pnpm dev` 加载、构建默认不加载，
不影响生产产物，也方便框架升级后用 `/demo` 做回归。确定永远不要时，删除
`optional-layers/` 并移除 `nuxt.config.ts` 里对应的 `extends` 条目即可，
详见 [demo.md](./demo.md)。

## 3. 目录职责与可改边界

| 区域                                                                                                                           | 建议                                                |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `app/pages/**`                                                                                                                 | 业务页面，可自由新增 / 修改                         |
| `app/stores/**`、`app/components/**`（普通目录）                                                                               | 业务状态与组件，可自由修改                          |
| `i18n/locales/*.json`                                                                                                          | 业务文案，可自由修改（三份语言包要同步）            |
| `.env.*`                                                                                                                       | 按项目部署环境填写                                  |
| `app/layouts/**`、`app/components/{global,layout}/**`、`app/components/` 下括号分组目录（`(frame)` / `(widgets)` / `(error)`） | 框架资产，优先用 props / slots 定制                 |
| `app/composables/**`、`app/plugins/**`、`app/utils/**`                                                                         | 框架资产，需要改动时先在 podium 侧改，再合并        |
| `optional-layers/**`                                                                                                           | 框架开发参考层；不要写业务代码，需要时复制到 `app/` |
| `app/mocks/handlers.ts`                                                                                                        | 项目自己的接口 mock（按需自建，mock 层自动合并）    |
| `config/**`、`scripts/**`、`nuxt.config.ts`                                                                                    | 工程骨架，尽量保持原样，方便后续 merge              |

判断标准很简单：**改动是否对所有业务项目都成立**。成立就回 podium 改，
不成立才留在业务项目里。

## 4. 升级框架

```bash
git fetch podium --tags
git merge podium/master      # 0.x 阶段跟 master；发布 tag 后换成对应 tag
pnpm install
pnpm check
pnpm build
pnpm dev                     # 跑一遍 /demo 页面做回归
```

> 框架仍在开发阶段，推荐直接合并 `master` 并每天跑一次检查；
> 等发布稳定 tag 后再改为按 tag 合并。

- 冲突集中在你改过的框架文件上；如果冲突过多，说明边界被打破了
- 破坏性变更看 [CHANGELOG.md](../CHANGELOG.md) 的 Major 条目
- `pnpm check` 包含 lint、格式和类型检查，合并后必须通过
- `pnpm build:prod` 之后按 [demo.md](./demo.md) 的验证命令确认产物里没有 demo

## 5. mock 的去留

业务项目接入真实后端后：

1. 把 `.env.*` 里的 `NUXT_PUBLIC_API_MOCK` 删掉或设为 `0`；
2. `test` / `staging` / `prod` 构建默认不加载 `optional-layers/`，msw 与 demo
   不会进入产物；
3. 项目自己的接口 mock 新建 `app/mocks/handlers.ts` 并导出 `handlers` 数组，
   mock 层会自动合并（文件不存在时什么都不做）；
4. 想完全自研 mock：删除 `optional-layers/mock`、`nuxt.config.ts` 里对应的
   `extends` 条目，并移除 `msw` 依赖。

`optional-layers/` 保留在仓库里不影响生产产物，也方便框架升级后回归；
不要在层目录里写业务代码。

## 6. 版本约定

当前是 0.x 开发阶段：

- 0.x 期间 Minor 版本也可能包含不兼容调整，升级前看 [CHANGELOG.md](../CHANGELOG.md)
- 框架稳定、至少一个业务项目验证通过后，再发布 1.0.0
- 1.0.0 之后：新增能力 Minor、修复 Patch、破坏性变更 Major 并写迁移步骤
- 发布 tag 后业务项目按 tag 合并；0.x 阶段直接跟 `master` 即可
