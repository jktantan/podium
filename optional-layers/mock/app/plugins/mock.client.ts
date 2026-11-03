/**
 * 内置 mock 的注册入口（mock 层）。
 *
 * `__PODIUM_MOCK__` 由 mock 层的 nuxt.config.ts 通过 `vite.define` 注入：
 * - true：动态导入 msw 并注册 Service Worker，接口由 handlers 接管；
 * - false：下面的分支是死代码，msw 与 handlers 都不会进入产物。
 *
 * Service Worker 脚本在 mock 层的 public/mockServiceWorker.js，由
 * mock 层的 nitro.publicAssets 挂到站点根路径；升级 msw 后重新执行
 * `pnpm exec msw init optional-layers/mock/public --save` 即可。
 */
export default defineNuxtPlugin(async () => {
  if (!__PODIUM_MOCK__) {
    return
  }

  const { worker } = await import('../mocks/browser')
  const baseURL = useRuntimeConfig().app.baseURL

  await worker.start({
    // 没登记 mock 的接口继续走真实网络，避免 mock 悄悄掩盖漏配
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: `${baseURL}mockServiceWorker.js`,
      // 子路径部署（/podium/）时 scope 必须跟着 baseURL，否则拦不到页面请求
      options: { scope: baseURL }
    }
  })
})
