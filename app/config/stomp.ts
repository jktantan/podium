import type { StompRawRuntimeConfig, StompRuntimeConfig } from '../types/stomp'

/**
 * STOMP 配置默认值与运行时归一化。
 *
 * - 默认值同时被构建期（config/env.ts 生成 runtimeConfig）和运行时使用；
 * - NUXT_PUBLIC_STOMP_* 会被 Nuxt 用 destr 写回 runtimeConfig，
 *   所以运行时拿到的值可能是 string / number，必须在读取边界统一类型。
 */

export const STOMP_DEFAULTS: StompRuntimeConfig = {
  url: '',
  reconnectDelay: 5000,
  authHeader: 'Authorization',
  debug: false
}

function toReconnectDelay(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return STOMP_DEFAULTS.reconnectDelay
  }

  // 空字符串来自 `.env` 里的 `KEY=`，应回退默认值而不是当成 0
  if (typeof value === 'string' && !value.trim()) {
    return STOMP_DEFAULTS.reconnectDelay
  }

  const delay = Number(value)
  return Number.isFinite(delay) && delay >= 0 ? delay : STOMP_DEFAULTS.reconnectDelay
}

function toDebug(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on'
}

export function normalizeStompConfig(raw: StompRawRuntimeConfig | undefined): StompRuntimeConfig {
  return {
    url: typeof raw?.url === 'string' ? raw.url.trim() : STOMP_DEFAULTS.url,
    reconnectDelay: toReconnectDelay(raw?.reconnectDelay),
    authHeader:
      typeof raw?.authHeader === 'string' && raw.authHeader.trim()
        ? raw.authHeader.trim()
        : STOMP_DEFAULTS.authHeader,
    debug: toDebug(raw?.debug)
  }
}
