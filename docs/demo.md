# Demo 与 Mock（可选层）

Demo 页面和内置 mock 是**框架开发期 / 演示站资产**，不参与业务项目的生产构建。
它们放在 `optional-layers/`，由 `nuxt.config.ts` 的 `extends` 条件加载：

- 源码一直保留在仓库里，方便本地开发和框架升级后回归；
- 构建时只是不 `extends`，不删除文件、不移动目录，`git merge` 不受影响；
- 宿主不 import 层内模块，可选层缺席时仍能通过类型检查和构建。

## 目录

```
optional-layers/
  mock/
    nuxt.config.ts              # $meta.name、__PODIUM_MOCK__、SW publicAssets
    app/plugins/mock.client.ts  # 注册 Service Worker
    app/mocks/browser.ts        # worker 单例，自动合并项目侧 handlers
    app/mocks/handlers.ts       # 登录等通用接口
    app/app.config.ts           # 演示账号提示 / 默认账号
    public/mockServiceWorker.js
  demo/
    nuxt.config.ts              # extends: ['../mock']、route meta、demo-assets
    app/pages/demo/             # /demo/* 页面
    app/components/             # DemoMenuItems + demo 专用组件
    app/mocks/demo-handlers.ts  # /demo/items 等演示接口
    app/plugins/                # 组件注册、i18n 合并、demo handlers 注册
    app/app.config.ts           # 菜单组件名 + 页签数据
    i18n/locales/               # demo 专属文案
    public/iframe-demo.html
```

demo 层强依赖 mock 层，通过 `optional-layers/demo/nuxt.config.ts` 里的
`extends: ['../mock']` 声明。只复制 demo、不复制 mock 时，Nuxt 会直接报路径
不存在，而不是运行到页面才发现接口 404。

## 加载规则

```ts
// nuxt.config.ts
extends: optionalLayersEnabled ? ['./optional-layers/mock', './optional-layers/demo'] : []
```

`optionalLayersEnabled` 在 `config/env.ts` 里计算：

| 环境           | 默认   | 说明                 |
| -------------- | ------ | -------------------- |
| dev            | 加载   | 本地开发、跑回归用例 |
| pages          | 加载   | GitHub Pages 演示站  |
| test           | 不加载 | 业务测试环境         |
| staging / prod | 不加载 | 生产 / 预发布产物    |

`PODIUM_DEMO=1` / `0` 可以显式覆盖，用于临时验证。

## 为什么不在 `layers/` 下

Nuxt 会在读取 `nuxt.config.ts` **之前**自动注册 `layers/*`，没有任何配置能在
构建时跳过它。把 demo 放进去，关闭 demo 就只能删除 / 移动目录，会污染
git 工作区，导致框架升级时出现 modify/delete 冲突。

`optional-layers/` 不匹配自动扫描规则，只通过 `extends` 加载，目录内部仍然是
标准的 Nuxt 4 layer 结构。

## 宿主扩展点

宿主完全不认识 demo/mock，靠三个约定读取可选层提供的信息：

| 扩展点                          | 提供方                                   | 消费方                           |
| ------------------------------- | ---------------------------------------- | -------------------------------- |
| `appConfig.podium.sidebar.demo` | `optional-layers/demo/app/app.config.ts` | 布局动态渲染菜单组件、合并页签表 |
| `appConfig.podium.mock`         | `optional-layers/mock/app/app.config.ts` | 登录页展示演示账号提示           |
| route meta `podium.allow`       | demo 层的 `pages:extend`                 | 全局路由守卫放行 demo 页面       |

菜单顺序由宿主模板固定：**首页 → 项目 API 菜单 → demo 菜单**。demo 层只提供
最后一段内容，不控制位置。

其他细节：

- **菜单组件**：`DemoMenuItems` 由 demo 层的 `demo-components.ts` 注册为全局组件，
  宿主用 `<component :is="appConfig...menuComponent">` 渲染；层未加载时不渲染。
- **i18n**：demo 文案由 `i18n-demo.client.ts` 在运行时 `mergeLocaleMessage` 合并，
  宿主语言包配置不需要知道 demo 文件的存在。
- **mock handlers**：`demo-mock.client.ts` 在 `__PODIUM_MOCK__` 为 true 时把
  demo 专属接口合并进 mock 层的 worker；关闭 mock 时这段是构建期死代码。

## 新增一个 demo 页面

1. 页面放 `optional-layers/demo/app/pages/demo/`，URL 前缀是 `/demo`；
2. 文案放 `optional-layers/demo/i18n/locales/{zh-CN,en,zh-TW}.json`，三份都要补；
3. 在 `optional-layers/demo/app/app.config.ts` 的 `tabs` 里登记，id 统一带 `demo-` 前缀；
4. 在 `DemoMenuItems.vue` 加对应菜单项，`index` 与 tabs id 一致；
5. `pnpm dev` 验证菜单、页签和文案。

## 项目自己的 mock

- 项目接口 mock 写 `app/mocks/handlers.ts`（导出 `handlers` 数组），mock 层会通过
  Vite glob 自动合并；
- 没登记 handler 的请求继续走真实网络，因此可以「一部分接口 mock、一部分连真实后端」；
- 接入真实后端后，把 `NUXT_PUBLIC_API_MOCK` 设为 `0` 或删掉；
- 想完全自研 mock：删除 `optional-layers/mock` 和 `nuxt.config.ts` 里对应的
  `extends` 条目，再移除 `msw` 依赖即可。

## 生产构建验证

```bash
pnpm build
test ! -e .output/public/demo-assets
test ! -e .output/public/mockServiceWorker.js
grep -rl "element-plus-demo\|DemoMenuItems\|demo/items" .output/public/_nuxt
```

前两条返回成功（路径不存在），最后一条没有输出。也可以检查预渲染路由里没有
`/demo/*`：

```bash
find .output/public -maxdepth 2 -name "*.html" | sort
```

## 删除可选层

项目确定永远不需要 demo/mock 时：

1. 删除 `optional-layers/`；
2. 删除 `nuxt.config.ts` 里的 `extends` 条件（保留条件会在 dev 环境解析路径时报错）；
3. 删除 `package.json` 里的 `msw` 依赖；
4. `app/mocks/handlers.ts` 如果存在也一并删除。

删除后宿主不需要改任何页面代码：布局、守卫、登录页读取的都是可选的 appConfig
和 route meta。
