import { fileURLToPath } from 'node:url'

/**
 * Demo 层（可选）。
 *
 * 只有项目在 nuxt.config.ts 里 extends 本目录时才会加载。
 * 本层强依赖 mock 层：demo 页面里的示例接口由 mock 提供，
 * 因此这里通过嵌套 extends 声明依赖。嵌套 extends 的相对路径
 * 在 layer 内是解析到 layer 自己（Nuxt 文档的例外），不是用户项目。
 */
export default defineNuxtConfig({
  $meta: {
    name: 'demo'
  },

  extends: ['../mock'],

  /**
   * 给 demo 页面统一加上「允许访问」标记。
   *
   * 宿主的路由守卫只认识这个 meta，不认识 /demo 前缀；
   * 本层不加载时，demo 页面本身也不存在，宿主无需任何 demo 相关判断。
   */
  hooks: {
    'pages:extend'(pages) {
      for (const page of pages) {
        const file = page.file?.replace(/\\/g, '/')

        if (file?.includes('/optional-layers/demo/app/pages/')) {
          page.meta = { ...page.meta, podium: { allow: true } }
        }
      }
    }
  },

  /**
   * demo 静态资源挂到 /demo-assets。
   *
   * 不能放 public/：Nuxt 会无条件把 public/ 拷进产物；
   * 也不能挂在 /demo 下：Nitro 的静态中间件会先命中 /demo/*，
   * 导致 /demo/settings 这类 SPA 路由返回 404。
   */
  nitro: {
    publicAssets: [
      {
        dir: fileURLToPath(new URL('./public', import.meta.url)),
        baseURL: 'demo-assets',
        maxAge: 0
      }
    ]
  }
})
