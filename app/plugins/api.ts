import { h } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * 统一 API 客户端：
 * - 401：已登录状态下提示“登录状态已失效”，由用户点击返回登录页；
 * - 403：当前操作无权限，只提示，不打断当前页面。
 *
 * 用法：const { $api } = useNuxtApp(); await $api('/api/xxx')
 */
export default defineNuxtPlugin(() => {
  const router = useRouter()
  const { logout } = useAuth()
  const nuxtApp = useNuxtApp()

  function translate(key: string) {
    return nuxtApp.$i18n.t(key)
  }

  let sessionExpiredMessage: ReturnType<typeof ElMessage> | null = null

  async function goLogin() {
    sessionExpiredMessage?.close()
    sessionExpiredMessage = null

    const current = router.currentRoute.value
    const query = { ...current.query }
    delete query.__tab

    const redirect =
      current.path === '/'
        ? undefined
        : router.resolve({ path: current.path, query, hash: current.hash }).fullPath

    if (import.meta.client) {
      sessionStorage.removeItem('stacktab-active-tab')
    }

    await logout()
    await router.push({
      path: '/',
      query: redirect ? { redirect } : undefined
    })
  }

  function notifySessionExpired() {
    if (sessionExpiredMessage) {
      return
    }

    sessionExpiredMessage = ElMessage({
      type: 'warning',
      duration: 0,
      showClose: true,
      message: h('span', { class: 'inline-flex items-center gap-2' }, [
        translate('error.sessionExpired'),
        h(
          'a',
          {
            class: 'cursor-pointer font-semibold text-primary underline underline-offset-2',
            onClick: goLogin
          },
          translate('error.backToLogin')
        )
      ]),
      onClose: () => {
        sessionExpiredMessage = null
      }
    })
  }

  const api = $fetch.create({
    onResponseError({ response }) {
      if (response.status === 401) {
        if (router.currentRoute.value.path === '/') {
          return
        }

        notifySessionExpired()
        return
      }

      if (response.status === 403) {
        ElMessage.error({
          message: translate('error.noPermission'),
          grouping: true
        })
      }
    }
  })

  return {
    provide: {
      api
    }
  }
})
