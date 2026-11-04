import type { Language } from 'element-plus/es/locale'
import type { AppLocale } from '../config'
import { ELEMENT_PLUS_LOCALES } from './element-plus'
import { LITE_LAYER_LOCALES } from './vue-lite-layer'
import { FLOW_UPLOAD_LOCALES } from './vue-flow-upload'
import { STACK_TABS_LOCALES } from './vue-stack-tabs'

/**
 * 第三方库语言包聚合入口：
 * 每个库一个文件，缺失语言只改对应文件，互不影响。
 */
export interface VendorLocale {
  /** 交给 <el-config-provider :locale> */
  elementPlus: Language
  /** 交给 <VueStackTabs :i18n> */
  stackTabs: string
  /** 传给 useLiteLayer().openLayer() 的 i18n.locale */
  liteLayer: string
  /** 交给 createFlowUploadI18n 的 locale */
  flowUpload: string
}

export function getVendorLocale(locale: AppLocale): VendorLocale {
  return {
    elementPlus: ELEMENT_PLUS_LOCALES[locale],
    stackTabs: STACK_TABS_LOCALES[locale],
    liteLayer: LITE_LAYER_LOCALES[locale],
    flowUpload: FLOW_UPLOAD_LOCALES[locale]
  }
}

export * from './vxe-table'
