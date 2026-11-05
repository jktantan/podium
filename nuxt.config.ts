// https://nuxt.com/docs/api/configuration/nuxt-config
import { appearanceBootstrap } from './config/appearance'
import { assetCompress } from './config/asset-compress'
import { createViteConfig } from './config/build'
import { createPublicRuntimeConfig, isReleaseEnv, optionalLayersEnabled } from './config/env'
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
 * isReleaseEnv / optionalLayersEnabled 以及 runtimeConfig.public。
 *
 * 环境文件与变量说明见 docs/env.md。
 */
const publicRuntimeConfig = createPublicRuntimeConfig()

/**
 * 部署子路径（例如 GitHub Pages 项目页 `https://<user>.github.io/podium/`）。
 *
 * Nuxt 自己会读取 NUXT_APP_BASE_URL，这里显式规范化一次：
 * - 必须以 / 开头和结尾，否则 client router 与资源路径会拼错；
 * - 默认是根路径，本地开发和正式部署都不受影响。
 */
const appBaseURL = (() => {
  const raw = process.env.NUXT_APP_BASE_URL?.trim() || '/'
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
})()

export default defineNuxtConfig({
  /**
   * 可选开发层：demo 与 mock。
   *
   * 只在这些层“属于本次构建”时才 extends：
   * - dev / pages 默认加载，方便本地开发和演示站；
   * - test / staging / prod 默认不加载，产物里不会出现 demo 页面、菜单、
   *   文案、静态资源与 msw；
   * - PODIUM_DEMO=1/0 可显式覆盖。
   *
   * 层目录放在 optional-layers/ 而不是 layers/：layers/* 会在读配置前
   * 被 Nuxt 自动注册，无法按环境关闭；optional-layers/ 只通过这里的
   * extends 加载，目录本身可以一直保留，git 更新不会产生删除冲突。
   */
  extends: optionalLayersEnabled ? ['./optional-layers/mock', './optional-layers/demo'] : [],
  // 纯前端 SPA：构建产物是静态文件，可直接放到 nginx
  ssr: false,
  // staging / prod 的打包产物不产出 sourceMap；dev / test / pages 保留
  sourcemap: {
    client: !isReleaseEnv,
    server: !isReleaseEnv
  },
  spaLoadingTemplate,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  /**
   * config/ 是构建期配置目录；optional-layers/ 是可选开发层。
   * 两者都不在 Nuxt 默认生成的 tsconfig include 范围内，显式加入后，
   * 类型检查与 eslint 的 projectService 才能覆盖到这些文件。
   */
  typescript: {
    tsConfig: {
      include: ['../optional-layers/*/app/**/*']
    },
    nodeTsConfig: {
      include: ['../config/**/*', '../optional-layers/*/nuxt.config.*']
    }
  },

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@element-plus/nuxt',
    '@nuxt/eslint',
    'vue-stack-tabs/nuxt',
    'vue-lite-layer/nuxt',
    'vue-flow-upload/nuxt',
    // 必须排在 @element-plus/nuxt 之后：组件复用 Element Plus 的 CSS 变量
    'ep-field-view/nuxt',
    // 静态生成后压缩 HTML 并更新其 .gz / .br 副本（见 config/asset-compress.ts）
    assetCompress
  ],

  /**
   * 暴露给运行时：环境名和公开配置。
   * 页面里通过 useRuntimeConfig().public 读取。
   *
   * demo / mock 相关的展示信息由可选层的 appConfig 提供，
   * 不占用 runtimeConfig，宿主也不需要知道层是否加载。
   */
  runtimeConfig: {
    public: publicRuntimeConfig
  },

  /**
   * 国际化：纯前端后台系统，不做语言前缀路由。
   * - no_prefix：语言只影响界面文案，URL 不带语言前缀
   * - 语言包放在项目根 i18n/locales/（@nuxtjs/i18n v10 的约定目录）
   * - demo 专属文案在 optional-layers/demo/，由该层的插件合并；宿主语言包
   *   不知道 demo 的存在
   * - 选择语言后写 cookie，刷新/下次访问时由 detectBrowserLanguage 恢复
   * - Element Plus / VXE / vue-stack-tabs 的语言包映射在 i18n/vendors/ 下按库分文件
   */
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    strategy: 'no_prefix',
    locales: LOCALE_OPTIONS.map(({ value: code, label: name, file }) => ({
      code,
      name,
      files: [file]
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
   * vue-flow-upload 模块：注册仅客户端渲染的 FlowUpload / AvatarUpload。
   * 设置 css: false，由下面的 css 数组手动登记库样式，
   * 保证 adapters/vue-flow-upload.css 在库样式之后加载。
   */
  vueFlowUpload: {
    prefix: '',
    css: false
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
   * 纯静态产物。
   *
   * demo / mock 的静态资源由各自层在自己的 nuxt.config 里通过
   * nitro.publicAssets 挂载：层不加载时，这些文件也不会进产物。
   */
  nitro: {
    preset: 'static',
    /*
     * 构建时为 public 资源生成 .gz / .br 预压缩副本（阈值与可压缩类型由
     * Nitro 决定）。HTML 的副本由 config/asset-compress.ts 在 minify 后重写，
     * 否则会和最终 HTML 不一致。
     */
    compressPublicAssets: {
      gzip: true,
      brotli: true
    }
  },

  /**
   * 构建期常量 __PODIUM_MOCK__ 已移到 optional-layers/mock/nuxt.config.ts：
   * 只有 mock 层参与构建时才会注入，宿主不再关心 msw 开关。
   */
  vite: {
    ...createViteConfig()
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
    'vue3-giant-tree-wasm/style.css',
    // vue-flow-upload/style.css 只带 Viewer 的局部外观样式，基础布局在 viewerjs 官方样式里；
    // 先引基础样式，再引库样式，保证 toolbar / navbar / title 的定位生效。
    // 等 vue-flow-upload 自行补齐 viewer 基础样式后，可以删除这一行和 viewerjs 依赖。
    'viewerjs/dist/viewer.css',
    'vue-flow-upload/style.css',
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
    '~/assets/css/adapters/vue3-giant-tree-wasm.css',
    '~/assets/css/adapters/vue-flow-upload.css',
    '~/assets/css/adapters/overlayscrollbars.css',
    // Tailwind -> 基础样式 -> 页面共享排版
    '~/assets/css/tailwind.css',
    '~/assets/scss/base.scss',
    '~/assets/scss/pages.scss'
  ],

  app: {
    baseURL: appBaseURL,
    head: {
      title: publicRuntimeConfig.appName,
      link: [
        // 关键：type 指定为 image/svg+xml
        { rel: 'icon', type: 'image/svg+xml', href: `${appBaseURL}favicon.svg` }
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
