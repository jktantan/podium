/**
 * 路由守卫：
 * - `/` 是登录页，已登录时回到 /admin；
 * - `/admin/**` 是后台管理页面，未登录时进入 401 错误页；
 * - 非 /admin 开头且不是根路径的 URL，一律显示全屏 404。
 */
export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useAuth()
  const { $i18n } = useNuxtApp()

  if (to.path === '/') {
    if (isLoggedIn.value) {
      return navigateTo('/admin')
    }
    return
  }

  const isAdminRoute = to.path === '/admin' || to.path.startsWith('/admin/')

  if (!isAdminRoute) {
    throw createError({
      statusCode: 404,
      message: $i18n.t('error.notFoundMessage')
    })
  }

  if (!isLoggedIn.value) {
    throw createError({
      statusCode: 401,
      message: $i18n.t('error.unauthorizedMessage')
    })
  }
})
