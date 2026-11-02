import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_DENSITY,
  DENSITY_OPTIONS,
  getDensityOption
} from '../app/config/appearance'

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

export const appearanceBootstrap = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)})||'{}');var d=document.documentElement;if(s.scheme==='dark')d.classList.add('dark');if(s.themeId)d.setAttribute('data-theme',s.themeId);if(s.density)d.setAttribute('data-density',s.density);if(s.color)d.style.setProperty('--brand-seed',s.color);var m=${JSON.stringify(densityMap)};if(s.density)d.setAttribute('data-stack-tab-size',m[s.density]||${JSON.stringify(defaultStackTabSize)});d.setAttribute('data-vxe-ui-theme',s.scheme==='dark'?'dark':'light')}catch(e){}})()`
