import { fileURLToPath } from 'node:url'

/**
 * dev server 启动时预转换的 demo 页面清单。
 *
 * 页面是按需懒加载的：切到某个页签时浏览器才 import 对应 chunk。
 * dev server 冷启动/重启后，模块图还在重建，此时首次切页签请求到的
 * chunk 可能返回 404/500 或被中断，浏览器报
 * "Failed to fetch dynamically imported module"（刷新即好）。
 * 在 Vite 启动时把这些页面先转换一遍，避开这段窗口。
 *
 * 必须是绝对路径：dev 下本层的模块 URL 是 /@fs/<绝对路径>，说明本层
 * 不在 Vite root 内，相对 glob 会解析到 root 下而匹配不到。
 * glob 分隔符统一为 /（glob 库不认 Windows 反斜杠）。
 */
const demoPageWarmupFiles = [
  fileURLToPath(new URL('./app/pages/demo/**/*.vue', import.meta.url)).replace(/\\/g, '/')
]

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
   * 启动预热 demo 页面（仅 dev 生效，构建时 server 配置被忽略）。
   *
   * 不必列出入口：入口由 Nuxt 启动后的模块图爬取预热（vite.warmupEntry）。
   * 注意开启 experimental.viteEnvironmentApi 后（本项目的
   * compatibilityVersion 尚未到 5），这里的 clientFiles 会替换
   * Vite 默认的 environments.client.dev.warmup。
   */
  vite: {
    server: {
      warmup: {
        clientFiles: demoPageWarmupFiles
      }
    }
  },

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
