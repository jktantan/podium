# 环境配置（.env）

项目支持四套环境：**dev / test / staging / prod**。环境由 `APP_ENV` 决定，
启动脚本负责设置，`nuxt.config.ts` 在加载配置前读取对应的 `.env.<环境>`。

## 环境与命令

| 环境    | 配置文件       | 开发               | 构建（带 demo）                | 构建（不带 demo）      |
| ------- | -------------- | ------------------ | ------------------------------ | ---------------------- |
| dev     | `.env.dev`     | `pnpm dev`         | `pnpm build:dev`               | —                      |
| test    | `.env.test`    | `pnpm dev:test`    | `pnpm build:test`              | `pnpm build:prod test` |
| staging | `.env.staging` | `pnpm dev:staging` | —                              | `pnpm build:staging`   |
| prod    | `.env.prod`    | `pnpm dev:prod`    | `pnpm build` / `pnpm generate` | `pnpm build:prod`      |

staging 是预发布环境，打包产物必须与生产一致，因此 `pnpm build:staging`
强制关闭 demo（route / 菜单 / 文案都不会进产物）；`pnpm dev:staging` 只是
用 staging 配置调试，仍保留 demo 方便查看示例。

## 构建产物差异

| 环境           | sourceMap      | console / debugger                         |
| -------------- | -------------- | ------------------------------------------ |
| dev / test     | 生成 `.js.map` | 保留                                       |
| staging / prod | 不生成         | 移除 log/info/debug/trace，保留 error/warn |

staging / prod 使用 terser 压缩并开启 `drop_debugger`，同时把 `console.log` /
`console.info` / `console.debug` / `console.trace` 视为无副作用调用删除；
`console.error` / `console.warn` 保留，作为线上错误线索。`pnpm build` 与
`pnpm generate` 使用 prod 环境，行为相同。sourceMap 只影响打包产物，
dev server 的调试能力不受影响。

四份 `.env.*` 都已入库，只放非敏感的公开配置。个人覆盖用 `.env.<环境>.local`
（已 gitignore）；CI 里也可以直接用环境变量临时覆盖，不必改文件。

加载优先级（先加载者优先，命令行 / CI 注入的变量始终最高）：

```
.env.<环境>.local > .env.<环境> > .env.local > .env
```

## 变量

| 变量                                | 说明                                   | runtimeConfig                 |
| ----------------------------------- | -------------------------------------- | ----------------------------- |
| `NUXT_PUBLIC_APP_NAME`              | 应用名，构建期写入 `index.html` 的标题 | `public.appName`              |
| `NUXT_PUBLIC_API_BASE_URL`          | 接口基础地址                           | `public.apiBaseUrl`           |
| `NUXT_PUBLIC_STOMP_URL`             | 原生 WebSocket STOMP 地址，留空不连接  | `public.stomp.url`            |
| `NUXT_PUBLIC_STOMP_RECONNECT_DELAY` | 断线重连间隔（毫秒），`0` 关闭重连     | `public.stomp.reconnectDelay` |
| `NUXT_PUBLIC_STOMP_AUTH_HEADER`     | CONNECT 帧里放 token 的 header 名      | `public.stomp.authHeader`     |
| `NUXT_PUBLIC_STOMP_DEBUG`           | `1` 输出 stompjs 调试日志              | `public.stomp.debug`          |
| `PODIUM_DEMO`                       | `0` 关闭 demo 路由 / 菜单 / 文案       | `public.demoEnabled`          |
| `APP_ENV`                           | 当前环境，由脚本写入                   | `public.appEnv`               |

STOMP 的使用方式见 [docs/stomp.md](./stomp.md)。

页面里读取：

```ts
const { appEnv, appName, apiBaseUrl, stomp } = useRuntimeConfig().public
```

新增配置项：在 `.env.example` 和四份 `.env.*` 里补上变量，并在
`config/env.ts` 的 `createPublicRuntimeConfig()` 中登记默认值（键名去掉
`NUXT_PUBLIC_` 前缀）；`nuxt.config.ts` 只负责挂载 `runtimeConfig.public`，
Nuxt 会按 `NUXT_PUBLIC_<KEY>` 自动覆盖。

## 注意

- 这是纯前端静态应用，`NUXT_PUBLIC_*` 会原样打进 `.output/public`，**禁止放密钥**。
- 环境值在构建期确定，修改 `.env` 后需要重启 dev 或重新 build。
- 直接运行 `nuxt dev` / `nuxt build` 时按 `NODE_ENV` 推断为 dev / prod；
  要使用 test / staging 请走上面的脚本。
