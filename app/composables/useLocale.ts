import type { AppLocale } from '~~/i18n/config'
import { DEFAULT_LOCALE, LOCALE_OPTIONS, getLocaleOption, isAppLocale } from '~~/i18n/config'
import { getVendorLocale } from '~~/i18n/vendors'

/**
 * 语言状态 + 第三方组件库映射。
 *
 * - currentLocale 是项目 i18n 的当前语言（受 @nuxtjs/i18n 管理，持久化到 cookie）
 * - elLocale 交给 <el-config-provider :locale>，Element Plus 内置文案随语言切换
 * - stackTabsLocale 交给 <VueStackTabs :i18n>，页签右键菜单随语言切换
 * - liteLayerLocale 由 useLayer() 在打开弹层时传给 openLayer
 * - VXE 是命令式切换，在 app.vue 里 watch currentLocale 调 applyVxeLocale
 */
export function useLocale() {
  const { locale, setLocale, t } = useI18n()

  const currentLocale = computed<AppLocale>(() =>
    isAppLocale(locale.value) ? locale.value : DEFAULT_LOCALE
  )

  const currentOption = computed(() => getLocaleOption(currentLocale.value))

  const elLocale = computed(() => getVendorLocale(currentLocale.value).elementPlus)

  const stackTabsLocale = computed(() => getVendorLocale(currentLocale.value).stackTabs)

  const liteLayerLocale = computed(() => getVendorLocale(currentLocale.value).liteLayer)

  async function changeLocale(next: AppLocale) {
    if (next === currentLocale.value) {
      return
    }

    await setLocale(next)

    // <html lang> 影响屏幕阅读器与浏览器翻译，和 useHead 的声明保持同步
    if (import.meta.client) {
      document.documentElement.lang = next
    }
  }

  return {
    currentLocale,
    currentOption,
    localeOptions: LOCALE_OPTIONS,
    elLocale,
    stackTabsLocale,
    liteLayerLocale,
    changeLocale,
    t
  }
}
