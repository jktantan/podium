import { setupWorker } from 'msw/browser'
import type { RequestHandler } from 'msw'
import { handlers as layerHandlers } from './handlers'

/**
 * 项目侧 mock handlers（可选）。
 *
 * 约定：项目自己的接口 mock 写在 app/mocks/handlers.ts，导出 handlers 数组。
 * 这里用 Vite 的 glob 探测文件是否存在——项目没有这个文件时返回空对象，
 * 不需要在框架里为了类型检查保留一个空文件。
 *
 * 项目接入真实后端后，删除自己的 handlers 并把 NUXT_PUBLIC_API_MOCK 设为 0 即可；
 * 想完全换一套 mock 方案，直接删除 optional-layers/mock 与 nuxt.config.ts 里的
 * extends 条目，宿主不会留下任何 msw 引用。
 */
const projectHandlerModules = import.meta.glob<{ handlers?: RequestHandler[] }>(
  '/app/mocks/handlers.ts',
  { eager: true }
)

const projectHandlers = Object.values(projectHandlerModules).flatMap(
  (module) => module.handlers ?? []
)

/**
 * 浏览器端 mock worker。
 *
 * 只被 mock.client.ts 动态导入：NUXT_PUBLIC_API_MOCK=0 时，
 * 插件里的分支是构建期死代码，这里连同 msw 一起不会进入产物。
 */
export const worker = setupWorker(...layerHandlers, ...projectHandlers)
