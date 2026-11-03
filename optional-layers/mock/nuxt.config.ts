import { fileURLToPath } from 'node:url'

/**
 * 内置 MSW mock 层（可选）。
 *
 * 只有项目在 nuxt.config.ts 里 extends 本目录时才会加载：
 * - 开发期用于本地联调，也可以和真实后端混用（未登记 handler 的请求照常走网络）；
 * - 构建期不 extends 时，本层不参与构建，msw 与 handlers 都不会进入产物。
 *
 * NUXT_PUBLIC_API_MOCK=0 时，插件里的 mock 分支仍然是构建期死代码，
 * 即使本层被加载也不会注册 Service Worker。
 */
const apiMockEnabled = /^(1|true|on)$/i.test(process.env.NUXT_PUBLIC_API_MOCK?.trim() ?? '')

export default defineNuxtConfig({
  $meta: {
    name: 'mock'
  },

  /**
   * Service Worker 必须从站点根路径提供（scope 由 baseURL 决定），
   * 因此这里以 baseURL: '/' 挂载，而不是放到 /mock-assets 下。
   * maxAge: 0 避免浏览器缓存旧版本的 mockServiceWorker.js。
   */
  nitro: {
    publicAssets: [
      {
        dir: fileURLToPath(new URL('./public', import.meta.url)),
        baseURL: '/',
        maxAge: 0
      }
    ]
  },

  /**
   * 构建期常量 __PODIUM_MOCK__：
   * NUXT_PUBLIC_API_MOCK=0 时插件里的 mock 分支会被整段移除。
   */
  vite: {
    define: {
      __PODIUM_MOCK__: JSON.stringify(apiMockEnabled)
    }
  }
})
