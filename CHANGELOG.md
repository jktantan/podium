# 变更记录

遵循 [语义化版本](https://semver.org/lang/zh-CN/)。当前处于 **0.x 开发阶段**：
目录结构、配置项和对外 API 仍可能调整，业务项目升级前先看本文件的变更说明。
框架稳定并经过至少一个业务项目验证后，再发布 1.0.0。

## 0.1.0（开发中，尚未发布）

当前开发阶段的能力清单，不是稳定版本。

### 框架能力

- Nuxt 4 + Vue 3 + TypeScript，纯前端 SPA，静态产物
- 工作台布局、页签、权限门面、401/403/404/500 错误页
- 统一 `$api` 客户端（ofetch）+ `ApiError` 错误总线
- 国际化 zh-CN / en / zh-TW，含 Element Plus / VXE / 第三方库语言映射
- Tailwind CSS 4 + SCSS 设计令牌，深浅色主题
- demo 页面作为框架回归用例，位于 `optional-layers/demo`，构建默认不加载

### 可选层

- demo 与 mock 从 `app/` 拆到 `optional-layers/`，通过 `nuxt.config.ts` 的
  `extends` 条件加载：dev / pages 默认加载，test / staging / prod 默认不加载
- 宿主通过 appConfig 与 route meta 读取可选层扩展，不再 import `#podium-demo`
- 删除 `config/demo.ts`、`app/demo/stub.ts`、`scripts/build-production.mjs`
  以及 `pages:extend` / i18n / nitro 的构建期剔除逻辑
- menu index 统一加 `demo-` 前缀，避免和项目侧 API 菜单冲突

### 依赖

- 新增 `vue-flow-upload@0.6.0`：文件与头像上传组件。通过 `vue-flow-upload/nuxt`
  注册仅客户端组件，模块设置 `css: false`，库样式在 `nuxt.config.ts` 的 `css`
  数组登记；`adapters/vue-flow-upload.css` 只补字体、字号、圆角与由
  `--control-height` 推导的密度尺寸；语言由 `useLocale()` 提供
  `flowUploadI18n`，同时传给 `FlowUpload` 与 `AvatarUpload`
  （`i18n/vendors/vue-flow-upload.ts` 补繁体）。demo 页面位于
  `optional-layers/demo/app/pages/demo/flow-upload-demo.vue`，使用内存 transport，
  不请求后端
- 显式引入 `viewerjs/dist/viewer.css` 并声明 `viewerjs` 依赖：`vue-flow-upload@0.6.0`
  的 `style.css` 只带 Viewer 的局部外观样式，缺少 toolbar / navbar / title 的定位规则，
  预览时会全部堆到顶部；库补齐后可删除该依赖与 CSS 登记
- 新增 `vue3-giant-tree-wasm`：WASM 虚拟树组件。库样式与
  `adapters/vue3-giant-tree-wasm.css` 在 `nuxt.config.ts` 登记，颜色映射到
  Element Plus 令牌，密度通过 `useAppearance()` 的 `giantTreeSize` 传入；
  demo 页面位于 `optional-layers/demo/app/pages/demo/giant-tree-demo.vue`
- 升级 `vue-stack-tabs` 到 `3.2.1`：页签在导航前立即出现，内容区显示导航 loading；
  新增 `pageLoading` 开关（`NUXT_PUBLIC_PAGE_LOADING`，默认开启，内网等快速环境可关闭）

### 环境

- 新增 `pages` 环境（`.env.pages`），GitHub Pages 演示站不再借用 `test`
- `test` / `staging` / `prod` 明确为派生业务项目的部署环境
- 新增 `NUXT_PUBLIC_API_MOCK` 开关
- `.env` 改用 Nuxt CLI 自带的 `--dotenv` 加载，每条命令只加载一个
  `.env.<环境>`；删除 `dotenv` 依赖与 `scripts/env.mjs`、`scripts/run-nuxt.mjs`，
  环境名由 `config/env.ts` 从 `--dotenv` 文件名推断
- 删除 `scripts/build-pages.mjs`：Pages 子路径由 `.env.pages` 的
  `NUXT_APP_BASE_URL` 决定，`.nojekyll` 改为 `public/` 下的空文件

### Mock

- 内置 MSW 位于 `optional-layers/mock`：登录等通用接口在该层，
  `demo/items` 等演示接口在 demo 层
- 通过构建期常量 `__PODIUM_MOCK__` 控制，关闭时 msw 不进入产物
- 项目自己的 `app/mocks/handlers.ts` 会被自动合并；未登记的请求继续走真实网络

### 工程化

- 组件目录重组：`global/` 只保留跨页面基础能力（`App*`、`WaterMark`、
  `PermissionGuard`、`ApiError*`）；页面骨架移到 `(frame)/`，通用控件移到
  `(widgets)/`，错误页移到 `(error)/`；`stackTabs/PageScroll.vue` 移到
  `layout/`。括号分组目录不参与组件名、也不做全局注册，因此 `FlipClock`、
  `DropDownCaptcha`、`CommonFrame`、`SearchCard`、`SearchFrame`、`Error401~500`
  的用法不变；显式引用 `~/components/stackTabs/PageScroll.vue` 的地方要改成
  `~/components/layout/PageScroll.vue`
- README 重写为框架说明；新增 `docs/template.md` 派生与升级指南
- `package.json` 补齐 version / engines / packageManager / repository
- 新增 `typecheck`（vue-tsc）、`clean` 脚本，`check` 串联 lint / 格式 / 类型
- 修复 `i18n/vendors/vxe-table.ts` 的两处类型错误
