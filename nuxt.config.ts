// https://nuxt.com/docs/api/configuration/nuxt-config
import { appearanceBootstrap } from './config/appearance'
import { createViteConfig } from './config/build'
import { demoAliasEntry, demoPublicAssets, extendPages } from './config/demo'
import { createPublicRuntimeConfig, demoEnabled, isDebugEnv } from './config/env'
import { DEFAULT_LOCALE, LOCALE_COOKIE_KEY, LOCALE_OPTIONS } from './i18n/config'
import { STACK_TABS_LOCALES, getStackTabsExtraLocales } from './i18n/vendors/vue-stack-tabs'
import { LITE_LAYER_LOCALES, getLiteLayerExtraMessages } from './i18n/vendors/vue-lite-layer'

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

// 手动指定使用哪一个模板
const spaLoadingTemplate = SPA_LOADING_TEMPLATES.cog

/**
 * 应用环境与公开配置全部由 config/env.ts 派生：
 * appEnv / isDebugEnv / isReleaseEnv / demoEnabled 以及 runtimeConfig.public。
 *
 * 环境文件与变量说明见 docs/env.md。
 */
const publicRuntimeConfig = createPublicRuntimeConfig()

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
    '@pinia/nuxt',
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
    '#podium-demo': demoAliasEntry
  },

  /**
   * 生产构建时移除 /demo 路由。
   * 按页面文件路径过滤而不是 URL 前缀，目录改名后仍然有效。
   */
  hooks: {
    'pages:extend': extendPages
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
    publicAssets: demoPublicAssets
  },

  vite: createViteConfig(),

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
