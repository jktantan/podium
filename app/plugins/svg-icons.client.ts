import 'virtual:svg-icons/register'

/**
 * 注册 SVG sprite。
 *
 * 这行 import 会被 vite-plugin-svg-icons-ng 替换成注入代码，在 <body> 末尾创建
 * 隐藏的 <svg id="__svg__icons__dom__">，AppIcon 的 <use href="#icon-..."> 依赖它。
 *
 * 只需在客户端入口执行一次，所以放 .client 插件；服务端构建阶段由插件直接产出代码。
 */
export default defineNuxtPlugin(() => {})
