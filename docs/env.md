# 环境配置（.env）

Podium 有两类环境：

- **框架自用**：`dev`（本地开发）、`pages`（GitHub Pages 演示站）
- **业务项目占位**：`test` / `staging` / `prod`，派生业务项目后按自己的部署流程填写

环境由 `APP_ENV` 决定，启动脚本负责设置，`nuxt.config.ts` 在加载配置前读取
对应的 `.env.<环境>`。

## 环境与命令

| 环境    | 归属     | 配置文件       | 开发               | 构建                                 |
| ------- | -------- | -------------- | ------------------ | ------------------------------------ |
| dev     | Podium   | `.env.dev`     | `pnpm dev`         | `pnpm build:dev`（自检，加载可选层） |
| pages   | Podium   | `.env.pages`   | —                  | `pnpm build:github-pages`            |
| test    | 业务项目 | `.env.test`    | `pnpm dev:test`    | `pnpm build:test`                    |
| staging | 业务项目 | `.env.staging` | `pnpm dev:staging` | `pnpm build:staging`                 |
| prod    | 业务项目 | `.env.prod`    | `pnpm dev:prod`    | `pnpm build` / `pnpm build:prod`     |

- `dev` / `pages` 默认加载 `optional-layers/`（demo + mock），没有后端也能登录和浏览页面。
- `test` / `staging` / `prod` 默认不加载可选层，构建产物里没有 demo 页面、菜单、文案与 msw。
- `pnpm build` 与 `pnpm build:prod` 行为一致：都是 prod 环境，不加载可选层。
- 需要在某个环境临时加载 / 关闭时，用 `PODIUM_DEMO=1` / `0` 覆盖；`pnpm dev:staging`
  只是用 staging 配置调试，默认同样不加载可选层。

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

| 变量                                | 说明                                    | runtimeConfig                 |
| ----------------------------------- | --------------------------------------- | ----------------------------- |
| `NUXT_PUBLIC_APP_NAME`              | 应用名，构建期写入 `index.html` 的标题  | `public.appName`              |
| `NUXT_APP_BASE_URL`                 | 部署子路径，例如 `/podium/`；默认 `/`   | `app.baseURL`                 |
| `NUXT_PUBLIC_API_BASE_URL`          | 接口基础地址；使用 mock 时可留空        | `public.apiBaseUrl`           |
| `NUXT_PUBLIC_API_MOCK`              | `1` 启用内置 MSW mock（需加载 mock 层） | —（由 mock 层读取）           |
| `NUXT_PUBLIC_PAGE_LOADING`          | `1` 显示导航 loading，`0` 关闭          | `public.pageLoading`          |
| `NUXT_PUBLIC_STOMP_URL`             | 原生 WebSocket STOMP 地址，留空不连接   | `public.stomp.url`            |
| `NUXT_PUBLIC_STOMP_RECONNECT_DELAY` | 断线重连间隔（毫秒），`0` 关闭重连      | `public.stomp.reconnectDelay` |
| `NUXT_PUBLIC_STOMP_AUTH_HEADER`     | CONNECT 帧里放 token 的 header 名       | `public.stomp.authHeader`     |
| `NUXT_PUBLIC_STOMP_DEBUG`           | `1` 输出 stompjs 调试日志               | `public.stomp.debug`          |
| `PODIUM_DEMO`                       | `1` / `0` 强制加载 / 不加载可选层       | —（构建期）                   |
| `APP_ENV`                           | 当前环境，由脚本写入                    | `public.appEnv`               |

STOMP 的使用方式见 [stomp.md](./stomp.md)。

页面里读取：

```ts
const { appEnv, appName, apiBaseUrl, pageLoading, stomp } = useRuntimeConfig().public
```

新增配置项：在 `.env.example` 和各份 `.env.*` 里补上变量，并在
`config/env.ts` 的 `createPublicRuntimeConfig()` 中登记默认值（键名去掉
`NUXT_PUBLIC_` 前缀）；`nuxt.config.ts` 只负责挂载 `runtimeConfig.public`，
Nuxt 会按 `NUXT_PUBLIC_<KEY>` 自动覆盖。

## 内置 mock

`optional-layers/mock` 只在 dev / pages（或 `PODIUM_DEMO=1`）时加载。
`NUXT_PUBLIC_API_MOCK=1` 时，该层的 `mock.client.ts` 注册 Service Worker，
接口请求由两层 handlers 共同接管：

- mock 层：`optional-layers/mock/app/mocks/handlers.ts`，登录 `POST */auth/login`
- demo 层：`optional-layers/demo/app/mocks/demo-handlers.ts`，示例列表 `GET */demo/items`

项目自己的接口 mock 写在 `app/mocks/handlers.ts`（可选），会由 mock 层通过
Vite glob 自动合并；没登记 handler 的请求继续走真实网络，因此可以
「一部分接口 mock、一部分连真实后端」。

关闭时 `__PODIUM_MOCK__` 为 `false`，插件分支被构建期移除，msw 与 handlers
都不会进入产物。Service Worker 脚本在
`optional-layers/mock/public/mockServiceWorker.js`，升级 msw 后重新执行
`pnpm exec msw init optional-layers/mock/public --save`。

业务项目接入真实后端后：把 `NUXT_PUBLIC_API_MOCK` 删掉或设为 `0`，填写
`NUXT_PUBLIC_API_BASE_URL` 即可，业务代码不需要改。想完全换一套 mock 方案，
删除 `optional-layers/mock` 与 `nuxt.config.ts` 里对应的 extends 条目即可。

## 子路径部署（GitHub Pages）

GitHub Pages 项目页的地址是 `https://<user>.github.io/<repo>/`，站点根不在 `/`。
`pnpm build:github-pages` 固定使用 pages 环境并加载可选层（demo + mock），同时：

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
