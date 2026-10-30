// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
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
 * SVG 图标源目录。
 *
 * symbolId 规则为 icon-[dir]-[name]，目录层级会保留：
 *   app/assets/icons/color/cms-b/SEO.svg -> #icon-color-cms-b-SEO
 *   app/assets/icons/mono/ant/close.svg   -> #icon-mono-ant-close
 *
 * 必须保留目录层级：mono/ant 与 mono/opt 有大量同名文件（如 close.svg）。
 */
const ICON_DIR = fileURLToPath(new URL('./app/assets/icons', import.meta.url))

/**
 * SVG sprite：构建期把 app/assets/icons 下的所有 .svg 转成 <symbol>，
 * 运行时由 app/plugins/svg-icons.client.ts 注入到 <body> 末尾。
 *
 * - htmlMode: 'none'：Nuxt 的 index.html 由 Nitro 生成，插件的 transformIndexHtml
 *   不可靠，改为在客户端入口显式 import virtual:svg-icons/register。
 * - 源文件先由 scripts/optimize-icons.mjs 统一处理（移除尺寸、收缩 viewBox、
 *   mono 颜色转 currentColor）；构建期 svg-icon-baker 再用 svgo 4 安全预设压一次，
 *   默认保留 viewBox。需要自定义时用 bakerOptions.svgoOptions，
 *   不要重新打开 cleanupIds / removeUnknownsAndDefaults。
 * - failOnError: 损坏的 SVG 直接让构建失败，避免图标静默缺失。
 */
const svgIconsPlugin = createSvgIconsPlugin({
  iconDirs: [ICON_DIR],
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
    'vue-lite-layer/nuxt'
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
    plugins: [tailwindcss(), svgIconsPlugin]
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
    'overlayscrollbars/overlayscrollbars.css',
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
