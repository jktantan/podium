import VxeUITable from 'vxe-table'
import { VxeUI } from '@vxe-ui/core'
import { VxeButton, VxeModal, VxePager } from 'vxe-pc-ui'
import 'vxe-pc-ui/lib/style.css'
import { h } from 'vue'
import nodataImage from '~/assets/images/nodata.svg'
import VxeUIPluginRenderElement from '@vxe-ui/plugin-render-element'
import {
  ElAutocomplete,
  ElButton,
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElOption,
  ElOptionGroup,
  ElRadio,
  ElRadioGroup,
  ElRate,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTimePicker,
  ElTimeSelect
} from 'element-plus'
// 下面这些组件是在 JS 里显式导入的，@element-plus/nuxt 只在模板中扫描并注入按需样式，
// 扫不到这里的导入，所以必须自己带进各自的 style/css 入口（内部会带上 base 和依赖组件）。
import 'element-plus/es/components/autocomplete/style/css'
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/cascader/style/css'
import 'element-plus/es/components/checkbox/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/input-number/style/css'
import 'element-plus/es/components/radio/style/css'
import 'element-plus/es/components/rate/style/css'
import 'element-plus/es/components/select/style/css'
import 'element-plus/es/components/slider/style/css'
import 'element-plus/es/components/switch/style/css'
import 'element-plus/es/components/time-picker/style/css'
import 'element-plus/es/components/time-select/style/css'
import { registerVxeLocales } from '~~/i18n/vendors/vxe-table'

/**
 * 提供给 VXE 渲染器的 Element Plus 组件。
 *
 * 项目通过 @element-plus/nuxt 按需引入，组件不会全局注册；而 VXE 的
 * cell-render / edit-render / filter-render 都在渲染函数里按名字查找组件
 * （resolveComponent），拿不到按需引入的局部组件，所以这里显式登记。
 *
 * 清单来自插件文档中的 name 取值：ElInput、ElAutocomplete、ElInputNumber、
 * ElSelect、ElCascader、ElTimeSelect、ElTimePicker、ElDatePicker、ElSwitch、
 * ElRate、ElSlider、ElButton，以及表单设计器用到的 ElCheckbox / ElRadio 组。
 * ElOption / ElOptionGroup 不在文档的 name 列表里，但插件的 Select 渲染器会用
 * getCurrComponent('el-option') 拼下拉项，也必须登记，否则下拉面板是空的。
 * ElButtons、ElTextarea 是插件内部的组合名，不是 Element Plus 组件，不用注册。
 */
const RENDER_ELEMENT_COMPONENTS = [
  ElAutocomplete,
  ElButton,
  ElCascader,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElInput,
  ElInputNumber,
  ElOption,
  ElOptionGroup,
  ElRadio,
  ElRadioGroup,
  ElRate,
  ElSelect,
  ElSlider,
  ElSwitch,
  ElTimePicker,
  ElTimeSelect
]

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

  // 兼容 element-plus 组件的渲染器（cell-render / edit-render / filter-render）
  RENDER_ELEMENT_COMPONENTS.forEach((component) => {
    VxeUIPluginRenderElement.component(component)
  })
  VxeUI.use(VxeUIPluginRenderElement)

  /**
   * 全局空数据视图：空表格 / 空 Grid 统一显示 nodata.svg + 当前语言的空数据文案。
   *
   * 为什么不直接配 emptyText：它只接受纯文本，渲染不了图片。
   * 这里注册一个 renderer，再把 table.emptyRender 指向它；grid 内部用的
   * 就是 vxe-table，所以表格和 Grid 都会命中同一份全局配置。
   * 文案在渲染时读取，跟着 VXE 当前语言走，不需要在这里再维护一份。
   */
  VxeUI.renderer.add('PodiumEmpty', {
    renderTableEmpty() {
      return h('div', { class: 'vxe-table--empty-image' }, [
        h('img', { src: nodataImage, alt: '', draggable: false }),
        h('span', { class: 'vxe-table--empty-image-text' }, VxeUI.getI18n('vxe.table.emptyText'))
      ])
    }
  })
  VxeUI.setConfig({ table: { emptyRender: { name: 'PodiumEmpty' } } })

  registerVxeLocales()
})
