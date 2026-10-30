/**
 * 注册 SVG sprite。
 *
 * 这里用动态 import 而不是顶层静态 import：
 * sprite 有 2.3MB（gzip 约 690KB），静态导入会被算进入口依赖，
 * 并在 index.html 里 modulepreload，首屏就要下载。
 * 动态导入会生成独立 chunk，应用挂载后再加载，注入 <body> 末尾的隐藏
 * <svg id="__svg__icons__dom__">。
 *
 * AppIcon 的 <use href="#icon-..."> 会在 symbol 注入后生效。
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    void import('virtual:svg-icons/register')
  })
})
