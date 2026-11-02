import { useTabActions } from 'vue-stack-tabs'

const TAB_SESSION_KEY = 'stacktab-active-tab'

/**
 * 退出登录：销毁 STOMP 连接、清空页签状态后回到登录页，
 * 避免下一个账号恢复上一个账号的页签和实时订阅。
 */
export function useLogout() {
  const { logout } = useAuth()
  const { destroy } = useStomp()
  const { reset } = useTabActions()

  return async function logoutToLogin() {
    reset()

    if (import.meta.client) {
      sessionStorage.removeItem(TAB_SESSION_KEY)
    }

    // 先清除 token 来源并丢弃连接，避免下一个账号复用旧 token
    setStompAuthorizationProvider(null)
    await destroy()
    await logout()
    await navigateTo('/')
  }
}
