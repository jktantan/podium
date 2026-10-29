import { VxeUI } from 'vxe-table'
import enUS from 'vxe-table/es/locale/lang/en-US'
import zhCN from 'vxe-table/es/locale/lang/zh-CN'
import zhTW from 'vxe-table/es/locale/lang/zh-TW'
import type { AppLocale } from '../config'

/**
 * VXE Table 语言包。
 *
 * VXE 只自带 zh-CN，其他语言需要先 setI18n 注册再 setLanguage 切换。
 * 某个语言官方缺失时，在 VXE_LOCALES 里补 messages 即可。
 */
interface VxeLocale {
  code: string
  messages: Record<string, unknown>
}

export const VXE_LOCALES: Record<AppLocale, VxeLocale> = {
  'zh-CN': { code: 'zh-CN', messages: zhCN },
  en: { code: 'en-US', messages: enUS },
  'zh-TW': { code: 'zh-TW', messages: zhTW }
}

/** 注册所有语言包（应用启动时调用一次） */
export function registerVxeLocales() {
  for (const { code, messages } of Object.values(VXE_LOCALES)) {
    VxeUI.setI18n(code, messages)
  }
}

/** 切换 VXE 的当前语言（VXE 只有命令式 API） */
export function applyVxeLocale(locale: AppLocale) {
  VxeUI.setLanguage(VXE_LOCALES[locale].code)
}
