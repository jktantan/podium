/**
 * STOMP 的 Authorization 预留接口。
 *
 * STOMP 层不关心 token 存在哪里、什么时候刷新，只要求业务在登录后注册
 * 一个 provider。每次建立连接（包括断线自动重连）前都会调用 provider，
 * 因此 token 更新后重连就能拿到新值。
 *
 * provider 返回完整的 header 值，例如 `Bearer eyJ...`。
 * 没有注册 provider 时返回 null，连接不会携带 Authorization，也不会阻断连接。
 */

export type StompAuthorizationProvider = () =>
  string | null | undefined | Promise<string | null | undefined>

let provider: StompAuthorizationProvider | null = null

/**
 * 注册 token 来源。
 *
 * 登录成功后调用；登出时传 null 清除。
 * 如果连接已经建立，需要再调用 useStomp().reconnect() 让新 token 生效。
 */
export function setStompAuthorizationProvider(next: StompAuthorizationProvider | null) {
  provider = next
}

/**
 * 获取当前 Authorization。
 *
 * 可以在任意位置调用，不依赖组件上下文。
 */
export async function getStompAuthorization(): Promise<string | null> {
  if (!provider) {
    return null
  }

  try {
    const value = await provider()
    return value?.trim() || null
  } catch (error) {
    console.error('[stomp] 获取 Authorization 失败：', error)
    return null
  }
}
