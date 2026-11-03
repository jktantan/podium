import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/**
 * 浏览器端 mock worker。
 *
 * 只被 app/plugins/mock.client.ts 动态导入：NUXT_PUBLIC_API_MOCK=0 时
 * 插件里的分支是构建期死代码，这里连同 msw 一起不会进入产物。
 */
export const worker = setupWorker(...handlers)
