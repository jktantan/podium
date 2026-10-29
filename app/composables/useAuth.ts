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

/**
 * 轻量登录 / 权限状态管理。
 *
 * 目前使用 Cookie 存用户名，权限从演示账号表推导，仅用于演示。
 * 接入真实后端时，把 `login` 替换成登录接口，并把接口返回的 permissions 存到状态里即可。
 */
export function useAuth() {
  const user = useCookie<string | null>('podium_user', {
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    default: () => null
  })

  const isLoggedIn = computed(() => Boolean(user.value))

  const permissions = computed(() => {
    const account = user.value ? DEMO_USERS[user.value] : undefined
    return account?.permissions ?? []
  })

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

  async function login(username: string, password: string) {
    const name = username.trim()
    const account = DEMO_USERS[name]

    if (!account || account.password !== password) {
      // 延迟到调用时取 t：useAuth 也会在插件里被调用，插件初始化阶段 i18n 可能尚未就绪
      throw new Error(useNuxtApp().$i18n.t('login.invalidCredentials'))
    }

    user.value = name
  }

  async function logout() {
    user.value = null
  }

  return {
    user: readonly(user),
    permissions: readonly(permissions),
    isLoggedIn,
    can,
    login,
    logout
  }
}
