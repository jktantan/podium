# Demo 页面与生产构建

项目里的演示页面和正式页面分开存放：

- 正式页面：`app/pages/index.vue`（登录页）、`app/pages/admin/index.vue`（工作台首页）
- 通用占位路由：`app/pages/iframe.vue`、`app/pages/[...slug].vue`
- Demo 页面：`app/pages/demo/`（URL 前缀 `/demo`）
- Demo 菜单 / 首页入口：`app/demo/`
- Demo 静态资源：`app/demo/public/`
- Demo 文案：`i18n/locales/demo/`

`pnpm build:prod` 会把 demo 内容从产物中剔除；`pnpm dev` 和 `pnpm build` 仍然带 demo。

## 目录

```
app/
  pages/
    index.vue                 # 登录页
    admin/
      index.vue               # 工作台首页
    iframe.vue                # vue-stack-tabs 的 iframe 占位路由（通用）
    [...slug].vue             # 页签内 404 兜底（通用）
    demo/                     # demo 页面（URL 为 /demo/*）
      about.vue
      detail.vue
      settings.vue
      element-plus-demo.vue
      ep-field-view-demo.vue
      layer-demo.vue
      permission-demo.vue
      search-demo.vue
      table-demo.vue
      error-pages/{401,403,404,500}.vue
      common-frame/{bare,full,no-header}.vue
      [...slug].vue           # /demo 下的 404 兜底（「404 示例」菜单）
  demo/                       # demo 的菜单、页签表与首页入口
    index.ts                  # 真实实现
    stub.ts                   # 生产构建用的空实现
    menu/DemoMenuItems.vue
    public/iframe-demo.html   # 内嵌页面示例，挂载到 /demo-assets/iframe-demo.html
i18n/locales/
  *.json                      # 正式页面文案
  demo/*.json                 # demo 专属文案
```

## 判定规则

- 文件名带 `-demo`、只用于演示组件的页面；
- 错误页预览（`error-pages/*`）、查询框架演示（`search-demo`）及其配套的
  `common-frame/*`；
- 页签缓存教程（`about` / `detail`）、设置页（`settings`）、内嵌页面示例
  （`iframe-demo.html`）也属于演示内容；
- 被这些页面独占的文案放进 `i18n/locales/demo/`。

保留在正式页面里的东西：

- 工作台首页、登录页、401/403/404/500 错误处理；
- 页签内 403 / 404 复用 `Error403` / `Error404`，全屏错误由 `app/error.vue` 统一处理；
- `app/pages/iframe.vue` 只是 vue-stack-tabs 的 iframe 占位路由，
  `app/pages/[...slug].vue` 是页签内 404 兜底，两者都是通用能力；
- 通用组件的文案（如 `iconPicker`、`searchCard`）留在基础语言包：
  这些组件以后可能被正式页面复用，不能随 demo 一起移除。

## 菜单与首页入口

侧边栏的 demo 项全部收在 `nav.demo`（示例）这个 `el-sub-menu` 下，
菜单项在 `app/demo/menu/DemoMenuItems.vue` 里维护。

布局和首页不直接 import `app/demo/*`，而是 import `#podium-demo`：

| `PODIUM_DEMO` | `#podium-demo` 指向 | 效果                           |
| ------------- | ------------------- | ------------------------------ |
| 未设置 / `1`  | `app/demo/index.ts` | 真实菜单、demo 页签、首页卡片  |
| `0`           | `app/demo/stub.ts`  | 空组件 / 空页签表 / 空卡片列表 |

这样生产包里不会留下 demo 菜单和首页卡片的代码。

## 生产构建

```bash
pnpm build:prod    # 生产包：剔除 demo
pnpm build         # 完整包：保留 demo，用于演示 / 回归
```

`pnpm build:prod` 执行 `scripts/build-production.mjs`，设置 `PODIUM_DEMO=0`
后调用 `nuxt generate`。`nuxt.config.ts` 里会做四件事：

1. `pages:extend` 按文件路径移除 `app/pages/demo` 下的全部路由；
2. `alias['#podium-demo']` 指向 `app/demo/stub.ts`；
3. `i18n.locales[].files` 不再追加 `demo/<locale>.json`；
4. `nitro.publicAssets` 不再挂载 `app/demo/public`，`iframe-demo.html` 不会进产物。

开关是构建期常量，切换后需要重启 dev server 或重新 build。

## 新增一个 demo 页面

1. 页面放在 `app/pages/demo/`，URL 前缀自动是 `/demo`；
2. 文案放进 `i18n/locales/demo/{zh-CN,en,zh-TW}.json`，三份都要补；
3. 在 `app/demo/index.ts` 的 `DEMO_TAB_PAGES` 中登记页签；
4. 在 `app/demo/menu/DemoMenuItems.vue` 中加对应菜单项，`index` 与页签 id 一致；
5. 如果页面要出现在首页，在 `createDemoHomeCards()` 里加卡片。

以上步骤都不需要改 `nuxt.config.ts` 或布局，生产构建会自动排除。

## 验证

生产包构建完成后，可以检查产物里没有 demo 路由和文案：

```bash
grep -rl "element-plus-demo\|permissionDemo\|epFieldViewDemo" .output/public/_nuxt
test ! -e .output/public/demo-assets/iframe-demo.html
```

正常情况下第一条没有输出，第二条返回成功（文件不存在）。
