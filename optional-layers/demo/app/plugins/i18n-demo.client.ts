import en from '../../i18n/locales/en.json'
import zhCN from '../../i18n/locales/zh-CN.json'
import zhTW from '../../i18n/locales/zh-TW.json'

/**
 * 合并 demo 专属文案。
 *
 * 不在 nuxt.config 里改 i18n.locales：宿主的语言包配置保持与 demo 无关，
 * 本层不加载时不会留下任何不存在的文件引用。mergeLocaleMessage 是深度合并，
 * 基础语言包后加载也不会覆盖这里新增的键。
 */
export default defineNuxtPlugin((nuxtApp) => {
  const i18n = nuxtApp.$i18n

  i18n.mergeLocaleMessage('zh-CN', zhCN)
  i18n.mergeLocaleMessage('en', en)
  i18n.mergeLocaleMessage('zh-TW', zhTW)
})
