import DemoMenuItems from '../components/DemoMenuItems.vue'

/**
 * 把 demo 菜单组件注册为全局组件。
 *
 * 宿主布局通过 appConfig 拿到组件名后用 <component :is="name"> 渲染，
 * 动态组件不会经过 Nuxt 的模板自动导入，因此需要在这里显式注册。
 * 注册动作只存在于 demo 层：层不加载时，宿主的 v-if 直接跳过渲染。
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('DemoMenuItems', DemoMenuItems)
})
