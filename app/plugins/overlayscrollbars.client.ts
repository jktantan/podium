import { ClickScrollPlugin, OverlayScrollbars } from 'overlayscrollbars'

/**
 * OverlayScrollbars 默认只支持拖拽手柄，点击轨道跳转需要显式注册 ClickScrollPlugin。
 * 对应 el-scrollbar 的点击轨道行为；注册是全局的，只执行一次。
 */
export default defineNuxtPlugin(() => {
  OverlayScrollbars.plugin(ClickScrollPlugin)
})
