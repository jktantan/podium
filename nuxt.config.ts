// https://nuxt.com/docs/api/configuration/nuxt-config
import path from 'node:path'
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

export default defineNuxtConfig({
  // 纯前端 SPA：构建产物是静态文件，可直接放到 nginx
  ssr: false,
  spaLoadingTemplate,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

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
   * 国际化：纯前端后台系统，不做语言前缀路由。
   * - no_prefix：语言只影响界面文案，URL 保持 /admin/... 不变
   * - 语言包放在项目根 i18n/locales/（@nuxtjs/i18n v10 的约定目录）
   * - 选择语言后写 cookie，刷新/下次访问时由 detectBrowserLanguage 恢复
   * - Element Plus / VXE / vue-stack-tabs 的语言包映射在 i18n/vendors/ 下按库分文件
   */
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    strategy: 'no_prefix',
    locales: LOCALE_OPTIONS.map(({ value: code, label: name, file }) => ({ code, name, file })),
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

  nitro: {
    preset: 'static'
  },

  vite: {
    plugins: [
      /*
       * 本地字体交给 vite-plugin-font：
       * import *.ttf 时自动切分、转 woff2 并注入 @font-face，
       * 中文字体按字符范围分包，浏览器只下载实际用到的分片。
       */
      font.vite(),
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
    // 按需样式不会自动补上；这里显式引入表单容器与 form-item 的样式，
    // 否则 .el-form-item 缺少 display:flex，label 与内容会竖排。
    // 若使用 rateMode="rate" / imageMode="image"，还需保证 el-rate / el-image 样式存在。
    'element-plus/es/components/form/style/css',
    'element-plus/es/components/form-item/style/css',
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
      title: 'Podium',
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
