/**
 * 路由守卫：
 * - `/` 是登录页，已登录时回到 /admin；
 * - 除根路径外，未登录一律进入 401 错误页（不再先判路径、不出现全屏 404）；
 * - 已登录默认只能访问 /admin；其他页面需要自己通过 route meta 声明
 *   `podium.allow`（demo 层会给自己的页面批量设置）。
 *
 * 宿主不认识 /demo 前缀：demo 层不加载时，这些页面和 meta 都不存在。
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
  // vue-stack-tabs 的 iframe 占位路由：正式能力，始终放行
  const isIframeRoute = to.path === '/iframe'
  // 可选层页面（demo 等）通过 meta 声明放行
  const isAllowedByMeta = to.meta.podium?.allow === true

  if (!isAdminRoute && !isIframeRoute && !isAllowedByMeta) {
    throw createError({
      statusCode: 404,
      message: $i18n.t('error.notFoundMessage')
    })
  }
})
