import type { PartialOptions } from 'overlayscrollbars'

/**
 * OverlayScrollbars 全局默认配置。
 *
 * AppScrollbar 内固定使用这份配置，调用点不需要再手动引用；
 * 个别场景需要覆盖时，通过 <AppScrollbar :options="..."> 传入，会与这里合并。
 * 主题变量在 app/assets/css/adapters/overlayscrollbars.css 中定义。
 */
export const overlayScrollbarOptions: PartialOptions = {
  scrollbars: {
    theme: 'os-theme-podium',
    // 与 el-scrollbar 对齐：鼠标离开后立即开始淡出
    autoHide: 'leave',
    autoHideDelay: 0,
    // 与 el-scrollbar 对齐：点击轨道跳转（需要 ClickScrollPlugin）
    clickScroll: true
  }
}
