import { nextTick } from 'vue'
import { useTabActions } from 'vue-stack-tabs'
import { useAuthStore } from '~/stores/auth'
import { useApiError } from '~/composables/useApiError'

const TAB_SESSION_KEY = 'stacktab-active-tab'
const AUTH_SESSION_KEY = 'podium-auth'

/**
 * 退出登录：清空认证状态、销毁 STOMP 连接、重置页签后回到登录页，
 * 避免下一个账号恢复上一个账号的页签和实时订阅。
 */
export function useLogout() {
  const authStore = useAuthStore()
  const { clear: clearApiError } = useApiError()
  const { destroy } = useStomp()

  let resetTabs: (() => void) | undefined

  try {
    resetTabs = useTabActions().reset
  } catch {
    // 登录页 / 没有 VueStackTabs 的场景没有页签上下文
    resetTabs = undefined
  }

  return async function logoutToLogin() {
    // 先关闭错误弹层，避免它挂在即将被重置的 tab 容器里
    clearApiError()
    await nextTick()
    resetTabs?.()

    if (import.meta.client) {
      sessionStorage.removeItem(TAB_SESSION_KEY)
    }

    // 先清除 token 来源并丢弃连接，避免下一个账号复用旧 token
    setStompAuthorizationProvider(null)
    await destroy()
    authStore.clear()
    clearApiError()

    if (import.meta.client) {
      sessionStorage.removeItem(AUTH_SESSION_KEY)
    }

    await navigateTo('/')
  }
}
