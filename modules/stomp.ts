import { defineNuxtModule } from 'nuxt/kit'
import type { StompRuntimeConfig } from '../app/types/stomp'

/**
 * STOMP 配置模块。
 *
 * 只负责把 .env 里的 NUXT_PUBLIC_STOMP_* 读进 runtimeConfig.public.stomp，
 * 连接、订阅和 token 都放在 app/composables/useStomp*.ts 里。
 *
 * Nuxt 会自动加载根目录 modules/ 下的 *.ts，不需要在 nuxt.config.ts 的
 * modules 数组里重复登记。
 *
 * 注意：这是纯前端静态应用，NUXT_PUBLIC_* 会写进构建产物，
 * 地址在构建期确定，部署后不能只改环境变量生效。
 */

function envValue(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback
}

function numberEnv(key: string, fallback: number): number {
  const raw = envValue(key, '')

  if (!raw) {
    return fallback
  }

  const value = Number(raw)
  return Number.isFinite(value) ? value : fallback
}

function boolEnv(key: string, fallback: boolean): boolean {
  const raw = envValue(key, '').toLowerCase()

  if (!raw) {
    return fallback
  }

  return raw === '1' || raw === 'true' || raw === 'on'
}

export default defineNuxtModule({
  meta: {
    name: 'podium-stomp'
  },
  setup(_options, nuxt) {
    const stomp: StompRuntimeConfig = {
      url: envValue('NUXT_PUBLIC_STOMP_URL', ''),
      reconnectDelay: numberEnv('NUXT_PUBLIC_STOMP_RECONNECT_DELAY', 5000),
      authHeader: envValue('NUXT_PUBLIC_STOMP_AUTH_HEADER', 'Authorization'),
      debug: boolEnv('NUXT_PUBLIC_STOMP_DEBUG', false)
    }

    if (stomp.url && !/^wss?:\/\//i.test(stomp.url)) {
      console.warn(
        `[stomp] NUXT_PUBLIC_STOMP_URL 必须以 ws:// 或 wss:// 开头，当前值：${stomp.url}`
      )
    }

    nuxt.options.runtimeConfig.public.stomp = stomp
  }
})
