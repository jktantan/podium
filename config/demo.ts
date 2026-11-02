import { fileURLToPath } from 'node:url'
import type { NuxtPage } from 'nuxt/schema'
import { demoEnabled } from './env'

/**
 * Demo 模块入口。
 *
 * 布局 / 首页只 import '#podium-demo'，构建期决定真实实现还是空实现，
 * 避免生产包里残留 demo 菜单与首页卡片代码。
 */
export const demoAliasEntry = fileURLToPath(
  new URL(demoEnabled ? '../app/demo/index.ts' : '../app/demo/stub.ts', import.meta.url)
)

/** app/pages/demo 的绝对路径（统一成 / 分隔，便于和 page.file 比较） */
const demoPagesDir = fileURLToPath(new URL('../app/pages/demo/', import.meta.url)).replace(
  /\\/g,
  '/'
)

/**
 * 生产构建时移除 /demo 路由。
 * 按页面文件路径过滤而不是 URL 前缀，目录改名后仍然有效。
 */
export function extendPages(pages: NuxtPage[]): void {
  if (demoEnabled) {
    return
  }

  for (let index = pages.length - 1; index >= 0; index -= 1) {
    const file = pages[index]?.file?.replace(/\\/g, '/')

    if (file?.startsWith(demoPagesDir)) {
      pages.splice(index, 1)
    }
  }
}

/**
 * Demo 静态资源。
 *
 * app/demo/public 只在 demo 开启时挂到 /demo-assets 下（当前是 iframe-demo.html）；
 * 关闭 demo 时不注册，静态生成产物里不会出现该文件。
 * 不能放 public/：Nuxt 会无条件把 public/ 拷进产物。
 * 也不能挂在 /demo 下：Nitro 的静态中间件会先命中 /demo/*，
 * 导致 /demo/settings 这类 SPA 路由返回 404。
 */
export const demoPublicAssets = demoEnabled
  ? [
      {
        dir: fileURLToPath(new URL('../app/demo/public', import.meta.url)),
        baseURL: 'demo-assets',
        maxAge: 0
      }
    ]
  : []
