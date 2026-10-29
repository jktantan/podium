import type { AppLocale } from '../config'

/**
 * vue-lite-layer 语言包。
 *
 * 库内置 zh-CN / en，缺失的语言在 EXTRA_MESSAGES 里按库的 messages 结构补，
 * 由 app/plugins/vue-lite-layer.ts 在安装时注入。
 *
 * 每个弹层实例会独立初始化内部 i18n：openLayer() 的 i18n.messages 优先于
 * 插件安装时的 messages，两者都会与内置语言包合并。因此只需在插件里注册
 * 繁体补充包，调用时传 locale 即可。
 */
export const LITE_LAYER_LOCALES: Record<AppLocale, string> = {
  'zh-CN': 'zh-CN',
  en: 'en',
  'zh-TW': 'zh-TW'
}

/** 键名必须与库内置语言包一致（VueLiteLayer.*） */
const EXTRA_MESSAGES: Partial<Record<AppLocale, Record<string, unknown>>> = {
  'zh-TW': {
    VueLiteLayer: {
      close: '關閉',
      maximum: '最大化',
      restore: '還原',
      minimum: '最小化',
      loading: '載入中',
      error: '內容載入失敗。',
      retry: '重試',
      ok: '確認',
      cancel: '取消'
    }
  }
}

export function getLiteLayerExtraMessages() {
  return EXTRA_MESSAGES
}
