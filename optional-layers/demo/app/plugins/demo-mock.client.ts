/**
 * 把 demo 专属接口合并进 mock 层的 worker。
 *
 * 两个 import 都放在 `__PODIUM_MOCK__` 分支之后：
 * NUXT_PUBLIC_API_MOCK=0 时这段是构建期死代码，msw 与 demo handlers
 * 都不会进入产物，即使 demo 层被加载。
 */
export default defineNuxtPlugin(async () => {
  if (!__PODIUM_MOCK__) {
    return
  }

  const [{ worker }, { demoHandlers }] = await Promise.all([
    import('../../../mock/app/mocks/browser'),
    import('../mocks/demo-handlers')
  ])

  worker.use(...demoHandlers)
})
