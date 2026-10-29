import type { AppLocale } from '../config'

/**
 * vue-stack-tabs 语言包。
 *
 * 库内置 zh-CN / en，缺失的语言在 EXTRA_MESSAGES 里按库的 messages 结构补，
 * 由 app/plugins/vue-stack-tabs.ts 在安装时注入。
 */
export const STACK_TABS_LOCALES: Record<AppLocale, string> = {
  'zh-CN': 'zh-CN',
  en: 'en',
  'zh-TW': 'zh-TW'
}

/** 键名必须与库内置语言包一致（VueStackTab.*） */
const EXTRA_MESSAGES: Partial<Record<AppLocale, Record<string, unknown>>> = {
  'zh-TW': {
    VueStackTab: {
      close: '關閉',
      closeLeft: '關閉左側',
      closeRight: '關閉右側',
      closeOthers: '關閉其他',
      closeAll: '關閉所有',
      reload: '重新整理',
      reloadAll: '重新整理全部',
      maximum: '最大化',
      restore: '還原',
      undefined: '未命名',
      loading: '載入中',
      iframeTitle: '分頁內嵌頁面',
      iframeLoadTimeout: 'iframe 載入逾時',
      retry: '重試',
      openInNewWindow: '在新視窗開啟',
      scrollLeft: '向左捲動',
      scrollRight: '向右捲動'
    }
  }
}

export function getStackTabsExtraLocales() {
  return Object.entries(EXTRA_MESSAGES).map(([locale, messages]) => ({ locale, messages }))
}
