# 环境配置（.env）

Podium 有两类环境：

- **框架自用**：`dev`（本地开发）、`pages`（GitHub Pages 演示站）
- **业务项目占位**：`test` / `staging` / `prod`，派生业务项目后按自己的部署流程填写

环境由 `APP_ENV` 决定，启动脚本负责设置，`nuxt.config.ts` 在加载配置前读取
对应的 `.env.<环境>`。

## 环境与命令

| 环境    | 归属     | 配置文件       | 开发               | 构建                              |
| ------- | -------- | -------------- | ------------------ | --------------------------------- |
| dev     | Podium   | `.env.dev`     | `pnpm dev`         | `pnpm build:dev`（自检，带 demo） |
| pages   | Podium   | `.env.pages`   | —                  | `pnpm build:github-pages`         |
| test    | 业务项目 | `.env.test`    | `pnpm dev:test`    | `pnpm build:test`                 |
| staging | 业务项目 | `.env.staging` | `pnpm dev:staging` | `pnpm build:staging`              |
| prod    | 业务项目 | `.env.prod`    | `pnpm dev:prod`    | `pnpm build` / `pnpm build:prod`  |

- `dev` 默认开启内置 mock，没有后端也能登录和浏览页面。
- `pages` 只用于构建展示站，接口全部由 mock 提供，不连接真实后端。
- `staging` 是预发布环境，打包产物必须与生产一致，因此 `pnpm build:staging`
  强制关闭 demo；`pnpm dev:staging` 只是用 staging 配置调试，仍保留 demo。
- `pnpm build` 与 `pnpm build:prod` 都是 prod 环境：前者保留 demo（回归 / 演示），
  后者剔除 demo（正式产物）。

## 构建产物差异

| 环境           | sourceMap      | console / debugger                         |
| -------------- | -------------- | ------------------------------------------ |
| dev / test     | 生成 `.js.map` | 保留                                       |
| pages          | 生成 `.js.map` | 保留                                       |
| staging / prod | 不生成         | 移除 log/info/debug/trace，保留 error/warn |

staging / prod 使用 terser 压缩并开启 `drop_debugger`，同时把 `console.log` /
`console.info` / `console.debug` / `console.trace` 视为无副作用调用删除；
`console.error` / `console.warn` 保留，作为线上错误线索。sourceMap 只影响打包产物，
dev server 的调试能力不受影响。

五份 `.env.*` 都已入库，只放非敏感的公开配置。个人覆盖用 `.env.<环境>.local`
（已 gitignore）；CI 里也可以直接用环境变量临时覆盖，不必改文件。

加载优先级（先加载者优先，命令行 / CI 注入的变量始终最高）：

```
.env.<环境>.local > .env.<环境> > .env.local > .env
```

## 变量

| 变量                                | 说明                                   | runtimeConfig                 |
| ----------------------------------- | -------------------------------------- | ----------------------------- |
| `NUXT_PUBLIC_APP_NAME`              | 应用名，构建期写入 `index.html` 的标题 | `public.appName`              |
| `NUXT_APP_BASE_URL`                 | 部署子路径，例如 `/podium/`；默认 `/`  | `app.baseURL`                 |
| `NUXT_PUBLIC_API_BASE_URL`          | 接口基础地址；使用 mock 时可留空       | `public.apiBaseUrl`           |
| `NUXT_PUBLIC_API_MOCK`              | `1` 启用内置 MSW mock                  | `public.apiMock`              |
| `NUXT_PUBLIC_PAGE_LOADING`          | `1` 显示导航 loading，`0` 关闭         | `public.pageLoading`          |
| `NUXT_PUBLIC_STOMP_URL`             | 原生 WebSocket STOMP 地址，留空不连接  | `public.stomp.url`            |
| `NUXT_PUBLIC_STOMP_RECONNECT_DELAY` | 断线重连间隔（毫秒），`0` 关闭重连     | `public.stomp.reconnectDelay` |
| `NUXT_PUBLIC_STOMP_AUTH_HEADER`     | CONNECT 帧里放 token 的 header 名      | `public.stomp.authHeader`     |
| `NUXT_PUBLIC_STOMP_DEBUG`           | `1` 输出 stompjs 调试日志              | `public.stomp.debug`          |
| `PODIUM_DEMO`                       | `0` 关闭 demo 路由 / 菜单 / 文案       | `public.demoEnabled`          |
| `APP_ENV`                           | 当前环境，由脚本写入                   | `public.appEnv`               |

STOMP 的使用方式见 [stomp.md](./stomp.md)。

页面里读取：

```ts
const { appEnv, appName, apiBaseUrl, apiMock, pageLoading, stomp } = useRuntimeConfig().public
```

新增配置项：在 `.env.example` 和各份 `.env.*` 里补上变量，并在
`config/env.ts` 的 `createPublicRuntimeConfig()` 中登记默认值（键名去掉
`NUXT_PUBLIC_` 前缀）；`nuxt.config.ts` 只负责挂载 `runtimeConfig.public`，
Nuxt 会按 `NUXT_PUBLIC_<KEY>` 自动覆盖。

## 内置 mock

`NUXT_PUBLIC_API_MOCK=1` 时，`app/plugins/mock.client.ts` 注册 Service Worker，
接口请求由 `app/mocks/handlers.ts` 接管：

- 登录：`POST */auth/login`（admin / admin123、viewer / viewer123）
- 示例列表：`GET */demo/items?page=1&pageSize=10`

关闭时 `__PODIUM_MOCK__` 为 `false`，插件分支被构建期移除，msw 与 handlers
都不会进入产物。Service Worker 脚本 `public/mockServiceWorker.js` 已入库，
升级 msw 后重新执行 `pnpm exec msw init public --save`。

业务项目接入真实后端后：把 `NUXT_PUBLIC_API_MOCK` 删掉或设为 `0`，填写
`NUXT_PUBLIC_API_BASE_URL` 即可，业务代码不需要改。

## 子路径部署（GitHub Pages）

GitHub Pages 项目页的地址是 `https://<user>.github.io/<repo>/`，站点根不在 `/`。
`pnpm build:github-pages` 固定使用 pages 环境并保留 demo，同时：

1. 按 `GITHUB_REPOSITORY` 自动推导 `NUXT_APP_BASE_URL=/<repo>/`；
2. 在产物里写入 `.nojekyll`，避免 `_nuxt/` 被 Jekyll 忽略；
3. 校验 `index.html` 不是重定向占位。

绑定自定义域名或部署在根路径时，把仓库 Variables 里的
`NUXT_APP_BASE_URL` 设为 `/`。workflow 见 `.github/workflows/pages.yml`。

## 注意

- 这是纯前端静态应用，`NUXT_PUBLIC_*` 会原样打进 `.output/public`，**禁止放密钥**。
- 环境值在构建期确定，修改 `.env` 后需要重启 dev 或重新 build。
- 直接运行 `nuxt dev` / `nuxt build` 时按 `NODE_ENV` 推断为 dev / prod；
  要使用 pages / test / staging 请走上面的脚本。
