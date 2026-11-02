/**
 * STOMP 运行时配置。
 *
 * 默认值由 nuxt.config.ts 的 runtimeConfig.public.stomp 提供，
 * NUXT_PUBLIC_STOMP_* 环境变量会在构建期覆盖同名值；
 * NUXT_PUBLIC_* 经 Nuxt 的 destr 解析，类型可能是 string / number，
 * 读取时统一用 app/config/stomp.ts 的 normalizeStompConfig() 归一化。
 */

/** Nuxt 应用 env 后可能出现的原始值 */
export type StompConfigValue = string | number | boolean | null | undefined

/** runtimeConfig 中的原始形态（字段可能缺失，类型不保证） */
export interface StompRawRuntimeConfig {
  /** 原生 WebSocket 地址，必须是 ws:// 或 wss://；为空表示不连接 */
  url?: StompConfigValue
  /** 断线重连间隔（毫秒），0 表示关闭自动重连 */
  reconnectDelay?: StompConfigValue
  /** STOMP CONNECT 帧里放 token 的 header 名 */
  authHeader?: StompConfigValue
  /** 是否输出 stompjs 调试日志，生产环境必须关闭 */
  debug?: StompConfigValue
}

/** 归一化后的配置 */
export interface StompRuntimeConfig {
  url: string
  reconnectDelay: number
  authHeader: string
  debug: boolean
}

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    stomp: StompRawRuntimeConfig
  }
}
