import type { Pinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

/**
 * Pinia 持久化插件。
 *
 * `@pinia-plugin-persistedstate/nuxt` 的 peer 仍是 `@pinia/nuxt ^0.5.0`，
 * 与当前 1.x 不兼容，因此直接注册底层插件。
 */
export default defineNuxtPlugin((nuxtApp) => {
  const pinia = nuxtApp.$pinia as Pinia
  pinia.use(piniaPluginPersistedstate)
})
