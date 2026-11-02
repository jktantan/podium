import { defineStore } from 'pinia'

export interface AuthUser {
  name: string
  permissions?: string[]
  [key: string]: unknown
}

interface AuthState {
  /** 后端登录返回的 Authorization，不带 `Bearer ` 前缀 */
  authorization: string
  user: AuthUser | null
}

/**
 * 认证状态。
 *
 * - 只持久化到 sessionStorage，关闭标签页后自动失效；
 * - HttpOnly Cookie 仍由浏览器自动携带，store 里的 token 用于 STOMP 和
 *   “不支持 Cookie 的客户端”的 header 兜底；
 * - 同标签页刷新会从 sessionStorage 恢复，因此刷新不会丢登录态。
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    authorization: '',
    user: null
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.authorization || state.user),
    permissions: (state) => state.user?.permissions ?? []
  },

  actions: {
    setSession(authorization: string, user: AuthUser | null) {
      this.authorization = authorization
      this.user = user
    },

    clear() {
      this.authorization = ''
      this.user = null
    }
  },

  persist: {
    key: 'podium-auth',
    storage: import.meta.client ? sessionStorage : undefined,
    pick: ['authorization', 'user']
  }
})
