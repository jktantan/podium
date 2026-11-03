/**
 * 构建期注入的 mock 开关。
 *
 * nuxt.config.ts 里通过 `vite.define` 把 NUXT_PUBLIC_API_MOCK 编译成字面量：
 * - 1 / true / on → true，app/plugins/mock.client.ts 注册 Service Worker；
 * - 其余情况 → false，插件里的 mock 分支连同 msw 依赖一起被构建期移除。
 */
declare const __PODIUM_MOCK__: boolean
