# Podium

基于 Nuxt 4 的后台管理前端框架 / 脚手架。

**Podium 本身不是一个业务应用。** 业务项目从这里派生：另起一个 repository，填自己的页面、接口地址和部署配置。Podium 负责布局、页签、权限、错误处理、国际化、请求客户端、构建脚本和一套 demo 回归页。

> **状态：开发中（0.x）。** 目录结构、配置项和组件 API 仍可能调整，
> 派生业务项目前请先看 [CHANGELOG.md](./CHANGELOG.md)。

## 技术栈

- Nuxt 4 + Vue 3 + TypeScript，纯前端 SPA（`ssr: false`），产物是静态文件
- Element Plus、VXE Table、vue-stack-tabs、vue-lite-layer、ep-field-view
- Pinia（sessionStorage 持久化）、`@nuxtjs/i18n`（zh-CN / en / zh-TW）
- Tailwind CSS 4 + SCSS 设计令牌，深浅色主题
- 统一 `$api` 客户端（ofetch）+ `ApiError` 错误总线
- 内置 MSW mock，没有后端也能跑通登录和示例页面

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

演示账号（由内置 mock 提供）：

| 账号   | 密码      | 权限 |
| ------ | --------- | ---- |
| admin  | admin123  | `*`  |
| viewer | viewer123 | 无   |

`.env.dev` 默认 `NUXT_PUBLIC_API_MOCK=1`，并加载 `optional-layers/`（demo + mock）。
接入真实后端时，把该行设为 `0` 或删掉，并填写 `NUXT_PUBLIC_API_BASE_URL`；
`test` / `staging` / `prod` 构建默认不加载可选层，产物里不会有 demo/mock。

## 目录

```
app/
  pages/          正式页面（demo 页面在 optional-layers/demo）
  components/     通用组件（global/ 为全局布局级组件）
  layouts/        布局（工作台、登录页等）
  composables/    useAuth / useStomp / useLayer 等
  stores/         Pinia
  plugins/        $api、vxe-table、外观初始化
  assets/         设计令牌、SCSS、图标、字体
optional-layers/  可选开发层（dev/pages 默认加载，构建默认不加载）
  demo/           demo 页面、菜单、页签、文案、静态资源
  mock/           内置 MSW mock（handlers 与 Service Worker）
config/           构建期配置（环境、图标、Vite）
i18n/             语言包与第三方库语言映射
scripts/           环境加载、构建入口、图标生成
docs/              使用与约定文档
```

## 环境

| 环境      | 归属     | 用途                                      |
| --------- | -------- | ----------------------------------------- |
| `dev`     | Podium   | 框架本地开发，默认加载 demo/mock          |
| `pages`   | Podium   | GitHub Pages 演示站构建（加载 demo/mock） |
| `test`    | 业务项目 | 测试环境（不加载可选层）                  |
| `staging` | 业务项目 | 预发布环境，产物与生产一致                |
| `prod`    | 业务项目 | 生产环境（不加载可选层）                  |

个人覆盖写 `.env.<环境>.local`（已 gitignore），不要改入库的 `.env.*`。
变量清单和加载优先级见 [docs/env.md](./docs/env.md)。

## 常用命令

| 命令                      | 说明                                            |
| ------------------------- | ----------------------------------------------- |
| `pnpm dev`                | dev 环境本地开发（加载 demo/mock）              |
| `pnpm build`              | prod 环境构建（不加载 demo/mock）               |
| `pnpm build:dev`          | dev 环境构建（框架自检，加载可选层）            |
| `pnpm build:prod`         | 与 `build` 相同，语义化别名                     |
| `pnpm build:staging`      | 预发布构建（不加载可选层）                      |
| `pnpm build:github-pages` | 构建 Pages 演示站（pages 环境，加载 demo/mock） |
| `pnpm check`              | lint + 格式检查 + 类型检查                      |
| `pnpm typecheck`          | `nuxt typecheck`                                |
| `pnpm clean`              | 清理 `.nuxt` / `.output` 等构建缓存             |

## 派生业务项目

新项目不要直接在 podium 里加业务页面，而是派生一个新仓库，并保留 podium 作为
upstream，方便后续合并框架更新。完整步骤与替换清单见
[docs/template.md](./docs/template.md)。

## 演示站

GitHub Pages 上的站点是 podium 的展示站，不是业务部署环境：

- workflow：`.github/workflows/pages.yml`，push 到 `master` / `main` 或手动触发
- 首次部署前在仓库 **Settings → Pages → Source** 选择 **GitHub Actions**
- 项目页子路径自动推导为 `/<repo>/`；绑定自定义域名时把 Actions Variable
  `NUXT_APP_BASE_URL` 设为 `/`
- 站点没有真实后端，接口全部由内置 mock 提供

## 文档

- [环境配置](./docs/env.md)
- [派生业务项目](./docs/template.md)
- [Demo 页面与生产构建](./docs/demo.md)
- [样式规范（SCSS + Tailwind）](./docs/styling.md)
- [API 客户端](./docs/api-client.md)
- [STOMP 实时消息](./docs/stomp.md)
- [国际化](./docs/i18n.md)
- [图标](./docs/icons.md)
- [变更记录](./CHANGELOG.md)
