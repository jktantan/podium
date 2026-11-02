// https://nuxt.com/docs/api/configuration/nuxt-config
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import font from 'vite-plugin-font'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons-ng'
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_DENSITY,
  DENSITY_OPTIONS,
  getDensityOption
} from './app/config/appearance'
import { DEFAULT_LOCALE, LOCALE_COOKIE_KEY, LOCALE_OPTIONS } from './i18n/config'
import { STACK_TABS_LOCALES, getStackTabsExtraLocales } from './i18n/vendors/vue-stack-tabs'
import { LITE_LAYER_LOCALES, getLiteLayerExtraMessages } from './i18n/vendors/vue-lite-layer'
import {
  ICON_OUT_DIR,
  ICON_SRC_DIR,
  buildIcons,
  removeIcon,
  syncIcon
} from './scripts/build-icons.mjs'
import { createPublicRuntimeConfig, demoEnabled, isDebugEnv, isReleaseEnv } from './config/env'

/**
 * 首屏防闪脚本：
 * 在任何 DOM 渲染前把外观状态写到 <html> 上，避免刷新时先闪一下默认主题。
 *
 * 这段脚本必须在 <head> 内联执行，不能等到 app.vue 的 useHead，
 * 也不能放进 app/spa-loading-templates/（那在 <body> 里，且晚于样式表）。
 *
 * 键名和密度映射都从 app/config/appearance.ts 生成，不在两处维护。
 */
const densityMap = Object.fromEntries(
  DENSITY_OPTIONS.map((option) => [option.value, option.stackTabSize])
)
const defaultStackTabSize = getDensityOption(DEFAULT_DENSITY).stackTabSize

const appearanceBootstrap = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)})||'{}');var d=document.documentElement;if(s.scheme==='dark')d.classList.add('dark');if(s.themeId)d.setAttribute('data-theme',s.themeId);if(s.density)d.setAttribute('data-density',s.density);if(s.color)d.style.setProperty('--brand-seed',s.color);var m=${JSON.stringify(densityMap)};if(s.density)d.setAttribute('data-stack-tab-size',m[s.density]||${JSON.stringify(defaultStackTabSize)});d.setAttribute('data-vxe-ui-theme',s.scheme==='dark'?'dark':'light')}catch(e){}})()`

/**
 * SPA 首屏 loading 模板清单。
 *
 * 文件名相对 srcDir（本项目是 app/），所以路径里不要再带 app/ 前缀，
 * 否则会被解析成 app/app/... 而静默回退成空白。
 *
 * 新增模板：把自包含的 HTML 片段放进 app/spa-loading-templates/，
 * 在这里登记一个键，然后把下面的 spaLoadingTemplate 改成对应的键。
 * 模板在构建期被读入并注入 index.html，切换后需重启 dev / 重新 build。
 */
const SPA_LOADING_TEMPLATES = {
  cog: 'spa-loading-templates/cog.html',
  gegga: 'spa-loading-templates/gegga.html',
  helix: 'spa-loading-templates/helix.html'
} as const

/**
 * SVG 图标：源目录保持原始 SVG，生成目录只放处理后的版本。
 *
 * - app/assets/icons 是源目录，入库，保持设计稿 / 图标包原样；
 * - .icons 是 scripts/build-icons.mjs 的产物，已被 gitignore，只作为 sprite 输入；
 * - 处理规则改动后重跑 `pnpm icons:build` 即可，不需要用 git 回滚源文件。
 *
 * symbolId 规则为 icon-[dir]-[name]，目录层级会保留：
 *   app/assets/icons/color/cms-b/SEO.svg -> #icon-color-cms-b-SEO
 *   app/assets/icons/mono/ant/close.svg   -> #icon-mono-ant-close
 *
 * 必须保留目录层级：mono/ant 与 mono/opt 有大量同名文件（如 close.svg）。
 */

/**
 * 图标构建插件：
 * - buildStart 时全量同步一次，保证 dev / build 用的 .icons 与源目录一致；
 * - dev 下监听源目录，新增 / 修改 / 删除时增量同步，不用手动重跑命令。
 */
function iconsBuildPlugin(): Plugin {
  const sync = async (file: string) => {
    const relative = path.relative(ICON_SRC_DIR, file)

    if (relative.startsWith('..') || !relative.endsWith('.svg')) {
      return
    }

    try {
      await syncIcon(relative)
    } catch (error) {
      console.warn(
        `[icons] 同步失败 ${relative}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return {
    name: 'podium-icons-build',
    async buildStart() {
      const stats = await buildIcons()

      if (stats.updated || stats.removed || stats.failed) {
        // eslint-disable-next-line no-console
        console.log(
          `[icons] ${stats.total} 个图标：${stats.updated} 更新，${stats.removed} 清理，${stats.failed} 失败`
        )
      }
    },
    configureServer(server) {
      server.watcher.add(ICON_SRC_DIR)
      server.watcher.on('add', (file) => void sync(file))
      server.watcher.on('change', (file) => void sync(file))
      server.watcher.on('unlink', (file) => {
        const relative = path.relative(ICON_SRC_DIR, file)

        if (!relative.startsWith('..') && relative.endsWith('.svg')) {
          void removeIcon(relative)
        }
      })
    }
  }
}

/**
 * SVG sprite：构建期把 .icons 下的所有 .svg 转成 <symbol>，
 * 运行时由 app/plugins/svg-icons.client.ts 注入到 <body> 末尾。
 *
 * - htmlMode: 'none'：Nuxt 的 index.html 由 Nitro 生成，插件的 transformIndexHtml
 *   不可靠，改为在客户端入口显式 import virtual:svg-icons/register。
 * - 输入目录 .icons 由 scripts/build-icons.mjs 生成（移除尺寸、收缩 viewBox、
 *   mono 颜色转 currentColor）；构建期 svg-icon-baker 再用 svgo 4 安全预设压一次，
 *   默认保留 viewBox。需要自定义时用 bakerOptions.svgoOptions，
 *   不要重新打开 cleanupIds / removeUnknownsAndDefaults。
 * - failOnError: 损坏的 SVG 直接让构建失败，避免图标静默缺失。
 */
const svgIconsPlugin = createSvgIconsPlugin({
  iconDirs: [ICON_OUT_DIR],
  symbolId: 'icon-[dir]-[name]',
  inject: 'body-last',
  htmlMode: 'none',
  failOnError: true
})

// 手动指定使用哪一个模板
const spaLoadingTemplate = SPA_LOADING_TEMPLATES.cog

/**
 * 应用环境与公开配置全部由 config/env.ts 派生：
 * appEnv / isDebugEnv / isReleaseEnv / demoEnabled 以及 runtimeConfig.public。
 *
 * 环境文件与变量说明见 docs/env.md。
 */
const publicRuntimeConfig = createPublicRuntimeConfig()

/**
 * 错误页字体子集化的兜底字符表（见下方 font.vite 配置）。
 *
 * scanFiles 之外的字符不会进入子集，浏览器会逐字回退到系统字体，
 * 表现为同一行里字体混排而不是缺字方块。这里保留 ASCII 可打印字符、
 * 常用中英文标点，覆盖错误码、运行时 message、日期等动态文本。
 */
const FONT_SUBSET_WHITELIST = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ' .,:;!?()[]{}<>/\\|@#$%^&*_-+=~`\'"',
  '，。！？、；：“”‘’（）【】《》〈〉…—～·「」『』',
  '×÷±°'
]

/** app/pages/demo 的绝对路径（统一成 / 分隔，便于和 page.file 比较） */
const demoPagesDir = fileURLToPath(new URL('./app/pages/demo/', import.meta.url)).replace(
  /\\/g,
  '/'
)

export default defineNuxtConfig({
  // 纯前端 SPA：构建产物是静态文件，可直接放到 nginx
  ssr: false,
  // dev / test 的打包产物保留 sourceMap；staging / prod 不产出
  sourcemap: {
    client: isDebugEnv,
    server: isDebugEnv
  },
  spaLoadingTemplate,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  /**
   * config/ 是构建期配置目录，不在 Nuxt 默认生成的 node tsconfig include 范围内。
   * 显式加入后，类型检查与 eslint 的 projectService 才能覆盖到这些文件。
   */
  typescript: {
    nodeTsConfig: {
      include: ['../config/**/*']
    }
  },

  modules: [
    '@nuxtjs/i18n',
    '@element-plus/nuxt',
    '@nuxt/eslint',
    'vue-stack-tabs/nuxt',
    'vue-lite-layer/nuxt',
    // 必须排在 @element-plus/nuxt 之后：组件复用 Element Plus 的 CSS 变量
    'ep-field-view/nuxt'
  ],

  /**
   * Demo 模块入口。
   *
   * 布局 / 首页只 import '#podium-demo'，构建期决定真实实现还是空实现，
   * 避免生产包里残留 demo 菜单与首页卡片代码。
   */
  alias: {
    '#podium-demo': fileURLToPath(
      new URL(demoEnabled ? './app/demo/index.ts' : './app/demo/stub.ts', import.meta.url)
    )
  },

  /**
   * 生产构建时移除 /demo 路由。
   * 按页面文件路径过滤而不是 URL 前缀，目录改名后仍然有效。
   */
  hooks: {
    'pages:extend'(pages) {
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
  },

  /**
   * 暴露给运行时：环境名、demo 开关和公开配置。
   * 页面里通过 useRuntimeConfig().public 读取。
   */
  runtimeConfig: {
    public: publicRuntimeConfig
  },

  /**
   * 国际化：纯前端后台系统，不做语言前缀路由。
   * - no_prefix：语言只影响界面文案，URL 不带语言前缀
   * - 语言包放在项目根 i18n/locales/（@nuxtjs/i18n v10 的约定目录）
   * - demo 专属文案在 i18n/locales/demo/，关闭 demo 时整个文件不加载；
   *   locales[].files 支持数组，按顺序深度合并且后面的文件优先
   * - 选择语言后写 cookie，刷新/下次访问时由 detectBrowserLanguage 恢复
   * - Element Plus / VXE / vue-stack-tabs 的语言包映射在 i18n/vendors/ 下按库分文件
   */
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    strategy: 'no_prefix',
    locales: LOCALE_OPTIONS.map(({ value: code, label: name, file }) => ({
      code,
      name,
      files: demoEnabled ? [file, `demo/${file}`] : [file]
    })),
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: LOCALE_COOKIE_KEY,
      redirectOn: 'root',
      alwaysRedirect: false,
      fallbackLocale: DEFAULT_LOCALE
    }
  },

  elementPlus: {
    // 自动按需引入组件 / 样式 / 图标，方法类组件需要显式登记
    defaultLocale: 'zh-cn',
    // @element-plus/nuxt 1.1.5 的 transform 会破坏 .vue 的 sourcemap；
    // 关闭样式自动注入，改为下面的全量 CSS。
    importStyle: false,
    installMethods: ['ElLoading', 'ElMessage', 'ElMessageBox', 'ElNotification']
  },

  /**
   * vue-stack-tabs 模块：注册组件 / 自动导入 composables，并在安装时注入语言包。
   * 模块内置只有 zh-CN / en，繁体从 i18n/vendors 补；运行时语言仍由
   * <VueStackTabs :i18n="stackTabsLocale"> 切换。
   */
  vueStackTabs: {
    locale: STACK_TABS_LOCALES[DEFAULT_LOCALE],
    messages: getStackTabsExtraLocales()
  },

  /**
   * ep-field-view 模块：表单文本态组件（TextFormItem / JsonPreview）。
   * - 模块自动注册组件并把 style.css 追加到 css 末尾，无需手动 import；
   * - 组件样式全部取自 --el-* 变量，主题色 / 暗色 / 密度跟随宿主，
   *   因此不要在 adapters/ 下再写一套「对齐 Element Plus」的覆盖；
   * - 这里只覆盖中文后台的文案习惯，其余保持库默认。
   */
  epFieldView: {
    emptyText: '-',
    separator: '、',
    rangeSeparator: ' 至 '
  },

  /**
   * vue-lite-layer 模块：注册客户端插件 / 自动导入 composables。
   * - css: false：宿主自己控制样式顺序，保证 adapters/vue-lite-layer.css 在库样式之后
   * - i18n.messages：补齐库内置 zh-CN / en 之外的繁体包
   * - 不设置 theme.mode：让弹层通过 html.dark 跟随项目明暗
   */
  vueLiteLayer: {
    css: false,
    banner: false,
    i18n: {
      locale: LITE_LAYER_LOCALES[DEFAULT_LOCALE],
      messages: getLiteLayerExtraMessages()
    }
  },

  /**
   * Demo 静态资源。
   *
   * app/demo/public 只在 demo 开启时挂到 /demo-assets 下（当前是 iframe-demo.html）；
   * 关闭 demo 时不注册，静态生成产物里不会出现该文件。
   * 不能放 public/：Nuxt 会无条件把 public/ 拷进产物。
   * 也不能挂在 /demo 下：Nitro 的静态中间件会先命中 /demo/*，
   * 导致 /demo/settings 这类 SPA 路由返回 404。
   */
  nitro: {
    preset: 'static',
    publicAssets: demoEnabled
      ? [
          {
            dir: fileURLToPath(new URL('./app/demo/public', import.meta.url)),
            baseURL: 'demo-assets',
            maxAge: 0
          }
        ]
      : []
  },

  vite: {
    build: {
      /*
       * staging / prod 用 terser 压缩，顺带移除 console / debugger。
       * Vite 8 默认的 oxc 压缩器没有等价的 drop 选项，所以这里显式切到 terser。
       * dev / test 不设置 minify，保持默认压缩并保留调试语句。
       */
      ...(isReleaseEnv
        ? {
            minify: 'terser' as const,
            terserOptions: {
              compress: {
                drop_debugger: true,
                /*
                 * 不用 drop_console：它会连 console.error / warn 一起删掉。
                 * 这里只把纯调试方法声明为无副作用，保留错误和警告作为线上线索。
                 * window.console.* 不匹配普通 console.*，需要单独列出。
                 */
                pure_funcs: [
                  'console.log',
                  'console.info',
                  'console.debug',
                  'console.trace',
                  'window.console.log',
                  'window.console.info',
                  'window.console.debug',
                  'window.console.trace'
                ]
              }
            }
          }
        : {})
    },
    plugins: [
      /*
       * 本地字体交给 vite-plugin-font：
       * import *.ttf 时自动切分、转 woff2 并注入 @font-face，
       * 中文字体按字符范围分包，浏览器只下载实际用到的分片。
       *
       * 错误页字体以 ?subsets 引入，只保留下列 scanFiles 里出现过的字符。
       * 扫描范围必须包含 i18n 的 JSON：错误页文案在语言包里，不在 .vue 中；
       * 漏扫的字符不会缺字，而是逐字回退到系统字体，出现字体混排。
       * 只扫语言包根目录（各语言文件），demo 文案与错误页字体无关，不必计入。
       */
      font.vite({
        scanFiles: [
          'app/**/*.{vue,ts,tsx,js,css,scss}',
          'i18n/locales/*.json',
          'i18n/vendors/**/*.ts'
        ],
        whiteList: FONT_SUBSET_WHITELIST
      }),
      tailwindcss(),
      iconsBuildPlugin(),
      svgIconsPlugin
    ]
  },

  css: [
    /*
     * 自托管 Inter（与 Element Plus 官网同一套字体）。
     * 后备字体栈里只有系统字体，Windows 上会落到微软雅黑，而雅黑没有
     * Medium(500)，button 等组件的 font-weight: 500 会被映射回 Regular，
     * 看起来和正常字重一样。只引 latin 子集，中文继续由系统字体回退。
     */
    '@fontsource/inter/latin-400.css',
    '@fontsource/inter/latin-500.css',
    '@fontsource/inter/latin-600.css',
    '@fontsource/inter/latin-700.css',
    'modern-normalize/modern-normalize.css',
    'vue-stack-tabs/dist/style.css',
    'vue-lite-layer/style.css',
    'vxe-table/lib/style.css',
    // VXE 渲染 Element Plus 组件时的单元格内控件样式，必须排在 vxe-table 之后
    '@vxe-ui/plugin-render-element/dist/style.css',
    'overlayscrollbars/overlayscrollbars.css',
    // ep-field-view 内部直接 import ElFormItem，不经过 @element-plus/nuxt 的模板扫描，
    // 按需样式不会自动补上；这里统一引入 Element Plus 全量样式，
    // 同时避免 @element-plus/nuxt 的样式注入 transform 破坏 .vue 的 sourcemap。
    'element-plus/dist/index.css',
    // Element Plus 深色变量，由 <html> 的 .dark 类激活
    'element-plus/theme-chalk/dark/css-vars.css',
    // 令牌 -> 密度 -> 各组件库适配层
    '~/assets/css/tokens.css',
    '~/assets/css/density.css',
    '~/assets/css/adapters/element-plus.css',
    '~/assets/css/adapters/vxe-table.css',
    '~/assets/css/adapters/vue-stack-tabs.css',
    '~/assets/css/adapters/vue-lite-layer.css',
    '~/assets/css/adapters/overlayscrollbars.css',
    // Tailwind -> 基础样式 -> 页面共享排版
    '~/assets/css/tailwind.css',
    '~/assets/scss/base.scss',
    '~/assets/scss/pages.scss'
  ],

  app: {
    head: {
      title: publicRuntimeConfig.appName,
      link: [
        // 关键：type 指定为 image/svg+xml
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
      ],
      script: [
        {
          innerHTML: appearanceBootstrap,
          tagPosition: 'head'
        }
      ]
    }
  }
})
