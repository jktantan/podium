import { STOMP_DEFAULTS } from '../app/config/stomp'
import type { StompRuntimeConfig } from '../app/types/stomp'
import { loadAppEnv } from '../scripts/env.mjs'

/**
 * 应用环境与公开配置（构建期）。
 *
 * 这是 nuxt.config.ts 和 config/ 下其它构建期配置的唯一环境入口：
 * - 环境名、打包策略、demo 开关都由这里派生；
 * - runtimeConfig.public 的默认值也在这里生成，nuxt.config.ts 只负责挂载。
 *
 * 为什么在模块顶层调用 loadAppEnv：
 * ES module 的 import 先于 nuxt.config.ts 的 body 执行，如果放到 body 里，
 * 其它配置模块在 import 阶段读到的是未加载的 process.env。
 * dotenv 不覆盖已有值，重复调用是幂等的。
 */

/** 当前环境：dev / test / staging / prod */
export const appEnv = loadAppEnv()

/** 打包保留 sourceMap 与调试语句 */
export const isDebugEnv = appEnv === 'dev' || appEnv === 'test'

/** 打包不产出 sourceMap，并移除 console / debugger */
export const isReleaseEnv = appEnv === 'staging' || appEnv === 'prod'

const isProductionBuild = process.env.NODE_ENV === 'production'

/**
 * Demo 内容开关（构建期）。
 *
 * - dev / test 默认开启；
 * - staging 的正式打包强制关闭，保证产物与生产一致；
 * - `PODIUM_DEMO=0` 显式关闭（pnpm build:prod / build:staging 会自动设置）。
 */
export const demoEnabled =
  process.env.PODIUM_DEMO !== '0' && !(isProductionBuild && appEnv === 'staging')

export function envValue(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback
}

export function numberEnv(key: string, fallback: number): number {
  const raw = envValue(key, '')

  if (!raw) {
    return fallback
  }

  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

export function boolEnv(key: string, fallback: boolean): boolean {
  const raw = envValue(key, '').toLowerCase()

  if (!raw) {
    return fallback
  }

  return raw === '1' || raw === 'true' || raw === 'on'
}

/**
 * 生成 runtimeConfig.public。
 *
 * 变量名保持 NUXT_PUBLIC_ 前缀，既作为默认值，也允许 Nuxt 在部署时
 * 按同名环境变量覆盖；两套机制读写的是同一组键，不会互相打架。
 *
 * 注意：Nuxt 会用 destr 把 NUXT_PUBLIC_* 再写回一次，因此这里的
 * 数字 / 布尔解析在构建期可能被覆盖成原始字符串或数字。运行时由
 * app/config/stomp.ts 的 normalizeStompConfig() 统一归一化。
 */
export function createPublicRuntimeConfig(): {
  appEnv: string
  demoEnabled: boolean
  appName: string
  apiBaseUrl: string
  stomp: StompRuntimeConfig
} {
  const stompUrl = envValue('NUXT_PUBLIC_STOMP_URL', STOMP_DEFAULTS.url)

  if (stompUrl && !/^wss?:\/\//i.test(stompUrl)) {
    console.warn(`[stomp] NUXT_PUBLIC_STOMP_URL 必须以 ws:// 或 wss:// 开头，当前值：${stompUrl}`)
  }

  return {
    appEnv,
    demoEnabled,
    appName: envValue('NUXT_PUBLIC_APP_NAME', 'Podium'),
    apiBaseUrl: envValue('NUXT_PUBLIC_API_BASE_URL', ''),
    stomp: {
      url: stompUrl,
      reconnectDelay: numberEnv('NUXT_PUBLIC_STOMP_RECONNECT_DELAY', STOMP_DEFAULTS.reconnectDelay),
      authHeader: envValue('NUXT_PUBLIC_STOMP_AUTH_HEADER', STOMP_DEFAULTS.authHeader),
      debug: boolEnv('NUXT_PUBLIC_STOMP_DEBUG', STOMP_DEFAULTS.debug)
    }
  }
}
