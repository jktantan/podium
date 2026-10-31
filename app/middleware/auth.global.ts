/**
 * 路由守卫：
 * - `/` 是登录页，已登录时回到 /admin；
 * - 除根路径外，未登录一律进入 401 错误页（不再先判路径、不出现全屏 404）；
 * - 已登录只能访问 /admin；demo 开启时额外放行 /demo（演示页面）。
 *   生产构建关闭 demo 后，/demo 路由不存在，这里仍按 404 处理。
 */
export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useAuth()
  const { $i18n } = useNuxtApp()
  const { demoEnabled } = useRuntimeConfig().public

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
  const isDemoRoute = to.path === '/demo' || to.path.startsWith('/demo/')
  // vue-stack-tabs 的 iframe 占位路由：正式能力，始终放行
  const isIframeRoute = to.path === '/iframe'

  if (!isAdminRoute && !isIframeRoute && !(demoEnabled && isDemoRoute)) {
    throw createError({
      statusCode: 404,
      message: $i18n.t('error.notFoundMessage')
    })
  }
})
