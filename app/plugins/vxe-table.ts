import VxeUITable from 'vxe-table'
import { VxeButton, VxeModal, VxePager } from 'vxe-pc-ui'
import 'vxe-pc-ui/lib/style.css'
import { registerVxeLocales } from '~~/i18n/vendors/vxe-table'

/**
 * 全量导入 VXE Table：
 * 自动注册 VxeTable、VxeColumn、VxeColgroup、VxeGrid、VxeToolbar 等表格相关组件。
 * 完整样式在 nuxt.config.ts 的 css 中加载 vxe-table/lib/style.css。
 *
 * VXE Grid 的工具栏工具（刷新 / 列设置）和分页（vxe-pager）来自配套的 vxe-pc-ui，
 * 官方推荐一起使用；这里按需注册用到的组件。
 *
 * VXE 只自带 zh-CN，en-US / zh-TW 由 registerVxeLocales 注册。
 * 当前语言的同步在 app.vue 里完成（VXE 只有命令式 setLanguage）。
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VxeUITable)

  // vxe-pc-ui 的组件查找按全局组件名进行，Grid 内置工具栏/分页需要它们
  nuxtApp.vueApp.component('VxePager', VxePager)
  nuxtApp.vueApp.component('VxeButton', VxeButton)
  nuxtApp.vueApp.component('VxeModal', VxeModal)

  registerVxeLocales()
})
