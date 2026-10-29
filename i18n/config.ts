/**
 * 语言配置（唯一配置来源）。
 *
 * 只放「有哪些语言、默认哪个、cookie 用哪个键」这类与具体组件库无关的信息。
 * 第三方库的语言包映射在 i18n/vendors/ 下按库分文件维护。
 */

export type AppLocale = 'zh-CN' | 'en' | 'zh-TW'

export interface LocaleOption {
  value: AppLocale
  /** 语言自称：选择器里始终显示本语言名称，不跟随当前界面语言翻译 */
  label: string
  /** 顶栏触发按钮上的短标签 */
  shortLabel: string
  /** i18n/locales 下的语言包文件名 */
  file: string
}

export const DEFAULT_LOCALE: AppLocale = 'zh-CN'

/** 与 @nuxtjs/i18n 的 detectBrowserLanguage.cookieKey 共用，保证刷新后语言不丢 */
export const LOCALE_COOKIE_KEY = 'podium_locale'

export const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { value: 'zh-CN', label: '简体中文', shortLabel: '中', file: 'zh-CN.json' },
  { value: 'en', label: 'English', shortLabel: 'EN', file: 'en.json' },
  { value: 'zh-TW', label: '繁體中文', shortLabel: '繁', file: 'zh-TW.json' }
]

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && LOCALE_OPTIONS.some((option) => option.value === value)
}

export function getLocaleOption(value: AppLocale): LocaleOption {
  return LOCALE_OPTIONS.find((option) => option.value === value) ?? LOCALE_OPTIONS[0]!
}
