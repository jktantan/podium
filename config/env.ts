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

/** 当前环境：dev / pages / test / staging / prod */
export const appEnv = loadAppEnv()

/**
 * podium 自身的展示站环境。
 *
 * pages 只用于构建 GitHub Pages 演示站；test / staging / prod 是给派生
 * 业务项目准备的部署环境，框架本身不往这三个环境发布。
 */
export const isPagesEnv = appEnv === 'pages'

/** 打包保留 sourceMap 与调试语句（pages 是演示站，同样保留） */
export const isDebugEnv = appEnv === 'dev' || appEnv === 'test' || isPagesEnv

/** 打包不产出 sourceMap，并移除 console / debugger */
export const isReleaseEnv = appEnv === 'staging' || appEnv === 'prod'

/**
 * 是否加载 optional-layers（demo + mock，构建期）。
 *
 * - dev / pages 默认开启：框架本地开发和演示站需要 demo/mock；
 * - test / staging / prod 默认关闭：业务项目的构建产物里不包含 demo/mock；
 * - `PODIUM_DEMO=1` / `0` 可以显式覆盖，便于 CI 或临时验证。
 *
 * 注意：这里只控制“是否 extends 可选层”，不删除源码。
 * 项目确定永远不需要 demo/mock 时，直接删除 optional-layers 目录即可。
 */
export const optionalLayersEnabled = boolEnv('PODIUM_DEMO', appEnv === 'dev' || isPagesEnv)

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
 *
 * demo / mock 不在 runtimeConfig 里：它们是可选层，是否加载由构建期
 * extends 决定，宿主通过 appConfig 读取层提供的扩展信息。
 */
export function createPublicRuntimeConfig(): {
  appEnv: string
  appName: string
  apiBaseUrl: string
  pageLoading: boolean
  stomp: StompRuntimeConfig
} {
  const stompUrl = envValue('NUXT_PUBLIC_STOMP_URL', STOMP_DEFAULTS.url)

  if (stompUrl && !/^wss?:\/\//i.test(stompUrl)) {
    console.warn(`[stomp] NUXT_PUBLIC_STOMP_URL 必须以 ws:// 或 wss:// 开头，当前值：${stompUrl}`)
  }

  return {
    appEnv,
    appName: envValue('NUXT_PUBLIC_APP_NAME', 'Podium'),
    apiBaseUrl: envValue('NUXT_PUBLIC_API_BASE_URL', ''),
    /**
     * 导航期间是否显示页面加载态，默认开启。
     *
     * 内网等页面 chunk 加载很快的场景可以在 .env.<环境> 里设为 0：
     * 关闭后页签仍然立即出现，但内容区不再显示 loading 遮罩。
     */
    pageLoading: boolEnv('NUXT_PUBLIC_PAGE_LOADING', true),
    stomp: {
      url: stompUrl,
      reconnectDelay: numberEnv('NUXT_PUBLIC_STOMP_RECONNECT_DELAY', STOMP_DEFAULTS.reconnectDelay),
      authHeader: envValue('NUXT_PUBLIC_STOMP_AUTH_HEADER', STOMP_DEFAULTS.authHeader),
      debug: boolEnv('NUXT_PUBLIC_STOMP_DEBUG', STOMP_DEFAULTS.debug)
    }
  }
}
