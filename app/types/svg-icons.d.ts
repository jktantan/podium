/**
 * vite-plugin-svg-icons-ng 提供的虚拟模块。
 *
 * 包里虽然带了 client.d.ts（exports["./client"]），但 Nuxt 不会自动加载它，
 * 这里补一份声明，避免 import 'virtual:svg-icons/register' 报 TS2307。
 *
 * v1.3.0 起旧的 virtual:svg-icons-register / virtual:svg-icons-names
 * 已改为斜杠形式，旧名将在 v2.0.0 移除。
 */
declare module 'virtual:svg-icons/register' {
  const register: Record<string, never>
  export default register
}

declare module 'virtual:svg-icons/ids' {
  /** sprite 中所有 symbol 的 id，如 icon-color-cms-b-SEO */
  const ids: string[]
  export default ids
}

declare module 'virtual:svg-icons/sprite' {
  /** 完整的 <svg> sprite 标记，供 SSR 注入模板 */
  const sprite: string
  export default sprite
}
