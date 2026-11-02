/**
 * STOMP 运行时配置。
 *
 * 值由 modules/stomp.ts 从 .env 读取后写入 runtimeConfig.public.stomp，
 * 页面里通过 useRuntimeConfig().public.stomp 读取。
 */
export interface StompRuntimeConfig {
  /** 原生 WebSocket 地址，必须是 ws:// 或 wss://；为空表示不连接 */
  url: string
  /** 断线重连间隔（毫秒），0 表示关闭自动重连 */
  reconnectDelay: number
  /** STOMP CONNECT 帧里放 token 的 header 名 */
  authHeader: string
  /** 是否输出 stompjs 调试日志，生产环境必须关闭 */
  debug: boolean
}

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    stomp: StompRuntimeConfig
  }
}
