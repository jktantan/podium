import { useTabActions } from 'vue-stack-tabs'

const TAB_SESSION_KEY = 'stacktab-active-tab'

/**
 * 退出登录：清空页签状态后回到登录页，避免下一个账号恢复上一个账号的页签。
 */
export function useLogout() {
  const { logout } = useAuth()
  const { reset } = useTabActions()

  return async function logoutToLogin() {
    reset()

    if (import.meta.client) {
      sessionStorage.removeItem(TAB_SESSION_KEY)
    }

    await logout()
    await navigateTo('/')
  }
}
