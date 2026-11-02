import { readonly, shallowRef } from 'vue'
import type { ApiError } from '~/utils/api-error'

export interface ApiErrorState {
  error: ApiError
  /** 401 会话失效：只能有一个，且优先于普通错误 */
  authExpired: boolean
  version: number
}

const state = shallowRef<ApiErrorState | null>(null)
let version = 0
let lastKey = ''
let lastAt = 0

function errorKey(error: ApiError): string {
  return `${error.status ?? 0}:${error.code}:${error.reason}`
}

/**
 * 全局错误总线。
 *
 * 请求层（`$api`）只负责把规范化后的错误推进来，不直接操作 UI；
 * `ApiErrorLayer` 在组件上下文里消费状态并打开 vue-lite-layer。
 * 模块级状态让非组件代码（插件、请求回调）也能安全调用。
 */
export function useApiError() {
  function report(error: ApiError, options: { authExpired?: boolean } = {}) {
    const authExpired = Boolean(options.authExpired)

    // 401 优先：401 已显示时，普通错误只记录不弹框
    if (!authExpired && state.value?.authExpired) {
      return
    }

    // 401 只保留第一个，后续并发 401 直接丢弃
    if (authExpired && state.value?.authExpired) {
      return
    }

    const key = errorKey(error)
    const now = Date.now()

    // 相同错误短时间内只弹一次，避免轮询刷屏
    if (!authExpired && key === lastKey && now - lastAt < 1_000) {
      return
    }

    lastKey = key
    lastAt = now
    state.value = { error, authExpired, version: ++version }
  }

  function clear() {
    state.value = null
    lastKey = ''
    lastAt = 0
  }

  return {
    state: readonly(state),
    report,
    clear
  }
}
