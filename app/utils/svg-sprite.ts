/**
 * 按需注入 SVG sprite。
 *
 * sprite 是 1252 个图标打成的单个 <symbol> 集合（约 1 MB / gzip 260 KB）。
 * 以前在 app/plugins/svg-icons.client.ts 里 app:mounted 之后无条件加载，
 * 结果任何页面首屏都会 prefetch 这一整块，哪怕页面上一张图标都没渲染。
 *
 * 现在改成由 AppIcon 在首次挂载时触发：
 * - 页面没有 <AppIcon>（例如只用了 Element Plus 图标的首页）时完全不加载；
 * - 图标选择器等用到图标的地方，第一次渲染时加载一次，之后从模块级 promise 复用；
 * - <use href="#icon-..."> 在 symbol 注入后自动生效，不需要重新渲染。
 *
 * 业务项目如果大量依赖 AppIcon，行为与之前一致，只是加载时机从「挂载后」
 * 推迟到「第一个图标挂载时」。
 */
let pending: Promise<unknown> | null = null

export function ensureSvgSprite(): Promise<unknown> {
  pending ??= import('virtual:svg-icons/register')

  return pending
}
