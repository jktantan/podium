import en from 'element-plus/es/locale/lang/en'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import type { Language } from 'element-plus/es/locale'
import type { AppLocale } from '../config'

/**
 * Element Plus 语言包。
 *
 * 直接引用官方语言包；如果某个语言官方缺失，可以在这里手写一份 Language 对象补上，
 * 不影响其他库。
 */
export const ELEMENT_PLUS_LOCALES: Record<AppLocale, Language> = {
  'zh-CN': zhCn,
  en,
  'zh-TW': zhTw
}
