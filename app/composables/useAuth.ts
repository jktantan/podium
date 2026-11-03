import { computed } from 'vue'
import type { AuthUser } from '~/stores/auth'
import { useAuthStore } from '~/stores/auth'
import { setStompAuthorizationProvider } from './useStompAuthorization'
import { toAuthorizationHeader } from '~/utils/auth'
import { ApiError } from '~/utils/api-error'

export type PermissionMode = 'all' | 'any'

interface DemoAccount {
  password: string
  permissions: string[]
}

const DEMO_USERS: Record<string, DemoAccount> = {
  admin: {
    password: 'admin123',
    permissions: ['*']
  },
  viewer: {
    password: 'viewer123',
    permissions: []
  }
}

/** 登录接口；后端路径确定后只需改这里 */
const LOGIN_PATH = '/auth/login'

interface LoginPayload {
  authorization?: string
  user?: Record<string, unknown>
  permissions?: string[]
  name?: string
  username?: string
}

function pickPermissions(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function toAuthUser(payload: LoginPayload, fallbackName: string): AuthUser {
  const source = (payload.user ?? payload) as Record<string, unknown>
  const name =
    typeof source.name === 'string'
      ? source.name
      : typeof source.username === 'string'
        ? source.username
        : fallbackName

  const permissions = pickPermissions(source.permissions)

  return {
    ...source,
    name,
    permissions: permissions.length ? permissions : pickPermissions(payload.permissions)
  }
}

/**
 * 轻量登录 / 权限门面。
 *
 * - 认证状态在 Pinia（sessionStorage），页面调用方式保持不变；
 * - 演示环境保留本地账号，避免没有后端时无法进入工作台；
 * - 真实环境登录成功后把 authorization 写入 store，并注册 STOMP provider；
 * - 登录失败由登录页统一显示固定文案，不在这里暴露后端原因。
 */
export function useAuth() {
  const store = useAuthStore()
  const { apiBaseUrl, apiMock, demoEnabled } = useRuntimeConfig().public

  /**
   * 本地演示账号只在「demo 已开启、但既没配后端也没开 mock」时兜底。
   *
   * 正常路径始终走 $api：dev / pages 由内置 mock 接管，业务项目走真实接口。
   * 这样登录链路（authorization、Authorization 头、STOMP provider）在框架阶段
   * 就被验证过，而不会因为 demo 开关被短路成本地账号。
   */
  const useLocalDemoAccount = demoEnabled && !apiBaseUrl && !apiMock

  const user = computed(() => store.user?.name ?? null)
  const isLoggedIn = computed(() => store.isLoggedIn)
  const permissions = computed(() => store.permissions)

  function can(required: string | string[], mode: PermissionMode = 'all') {
    const requiredList = Array.isArray(required) ? required : [required]

    if (requiredList.length === 0) {
      return true
    }

    const granted = permissions.value

    if (granted.includes('*')) {
      return true
    }

    return mode === 'any'
      ? requiredList.some((permission) => granted.includes(permission))
      : requiredList.every((permission) => granted.includes(permission))
  }

  function registerStompAuthorization() {
    setStompAuthorizationProvider(() => {
      const token = store.authorization
      return token ? toAuthorizationHeader(token) : null
    })
  }

  async function login(username: string, password: string) {
    const name = username.trim()

    if (useLocalDemoAccount) {
      const account = DEMO_USERS[name]

      if (account && account.password === password) {
        store.setSession(`demo-${name}`, { name, permissions: account.permissions })
        registerStompAuthorization()
        return
      }

      throw new ApiError({
        status: 500,
        code: -1,
        reason: useNuxtApp().$i18n.t('login.failedCredentials')
      })
    }

    const payload =
      (await useNuxtApp().$api.post<LoginPayload>(LOGIN_PATH, {
        body: { username: name, password },
        silent: true,
        skipAuthRedirect: true
      })) ?? {}

    const authorization = (payload.authorization ?? '').trim()

    if (!authorization) {
      throw new ApiError({
        status: 500,
        code: -1,
        reason: useNuxtApp().$i18n.t('login.failedCredentials')
      })
    }

    store.setSession(authorization, toAuthUser(payload, name))
    registerStompAuthorization()
  }

  async function logout() {
    store.clear()
  }

  return {
    user,
    permissions,
    isLoggedIn,
    can,
    login,
    logout
  }
}
