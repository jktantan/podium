import type { ITabData } from 'vue-stack-tabs'
import DemoMenuItems from './menu/DemoMenuItems.vue'

/**
 * Demo 模块的统一出口。
 *
 * 布局不直接 import 这里的子文件，而是 import '#podium-demo'。
 * 该别名在 nuxt.config.ts 里按 PODIUM_DEMO 指向：
 * - 本文（demo 开启）：真实菜单与页签；
 * - ./stub（demo 关闭）：空实现，生产包里不会留下 demo 组件代码。
 */

export { DemoMenuItems }

/** 翻译函数的最小签名，避免把 vue-i18n 的完整重载类型泄漏到调用方 */
export type DemoTranslate = (key: string) => string

/**
 * Demo 页签清单（id 同时是 el-menu 的 index，必须稳定）。
 * 与 DemoMenuItems.vue 里的菜单项一一对应。
 */
const DEMO_TAB_PAGES = [
  ['about', 'nav.about', '/demo/about'],
  ['404-demo', 'nav.notFound', '/demo/404-demo'],
  ['permission-demo', 'nav.permissionDemo', '/demo/permission-demo'],
  ['table-demo', 'nav.tableDemo', '/demo/table-demo'],
  ['element-plus-demo', 'nav.elementPlusDemo', '/demo/element-plus-demo'],
  ['ep-field-view-demo', 'nav.epFieldViewDemo', '/demo/ep-field-view-demo'],
  ['layer-demo', 'nav.layerDemo', '/demo/layer-demo'],
  ['search-demo', 'nav.searchDemo', '/demo/search-demo'],
  ['settings', 'nav.settings', '/demo/settings'],
  ['iframe', 'nav.iframe', '/demo-assets/iframe-demo.html', true],
  ['error-401', 'nav.error401', '/demo/error-pages/401'],
  ['error-403', 'nav.error403', '/demo/error-pages/403'],
  ['error-404', 'nav.error404', '/demo/error-pages/404'],
  ['error-500', 'nav.error500', '/demo/error-pages/500']
] as const

/** 语言切换后按页签 id 回写标题，与布局里正式页签的 TAB_TITLE_KEYS 合并使用 */
export const DEMO_TAB_TITLE_KEYS: Record<string, string> = Object.fromEntries(
  DEMO_TAB_PAGES.map(([id, titleKey]) => [id, titleKey])
)

export function createDemoMenuTabs(t: DemoTranslate): Record<string, ITabData> {
  // 部署在子路径时，静态资源不走 router，需要手动补 app.baseURL
  const { baseURL } = useRuntimeConfig().app

  return Object.fromEntries(
    DEMO_TAB_PAGES.map(([id, titleKey, path, isIframe]) => [
      id,
      {
        id,
        title: t(titleKey),
        path: path.startsWith('/demo-assets/') ? `${baseURL}${path.slice(1)}` : path,
        ...(isIframe ? { iframe: true } : {})
      }
    ])
  )
}
