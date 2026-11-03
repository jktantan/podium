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
- demo 页面作为框架回归用例，生产构建自动剔除

### 依赖

- 升级 `vue-stack-tabs` 到 `3.2.1`：页签在导航前立即出现，内容区显示导航 loading；
  新增 `pageLoading` 开关（`NUXT_PUBLIC_PAGE_LOADING`，默认开启，内网等快速环境可关闭）

### 环境

- 新增 `pages` 环境（`.env.pages`），GitHub Pages 演示站不再借用 `test`
- `test` / `staging` / `prod` 明确为派生业务项目的部署环境
- 新增 `NUXT_PUBLIC_API_MOCK` 开关

### Mock

- 内置 MSW：`auth/login` 与 `demo/items` 示例接口
- 通过构建期常量 `__PODIUM_MOCK__` 控制，关闭时 msw 不进入产物

### 工程化

- README 重写为框架说明；新增 `docs/template.md` 派生与升级指南
- `package.json` 补齐 version / engines / packageManager / repository
- 新增 `typecheck`（vue-tsc）、`clean` 脚本，`check` 串联 lint / 格式 / 类型
- 修复 `i18n/vendors/vxe-table.ts` 的两处类型错误
