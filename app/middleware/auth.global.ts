/**
 * 路由守卫：
 * - `/` 是登录页，已登录时回到 /admin；
 * - 除根路径外，未登录一律进入 401 错误页（不再先判路径、不出现全屏 404）；
 * - 已登录访问 /admin 之外的路径，才显示全屏 404。
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

  if (!isLoggedIn.value) {
    throw createError({
      statusCode: 401,
      message: $i18n.t('error.unauthorizedMessage')
    })
  }

  const isAdminRoute = to.path === '/admin' || to.path.startsWith('/admin/')

  if (!isAdminRoute) {
    throw createError({
      statusCode: 404,
      message: $i18n.t('error.notFoundMessage')
    })
  }
})
