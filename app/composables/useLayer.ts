import { useLiteLayer } from 'vue-lite-layer'
import type { LayerConfig, LayerInstance, LayerTheme } from 'vue-lite-layer'

/**
 * 项目统一的弹层入口。
 *
 * 在 useLiteLayer() 之上补两件事，避免每个调用点重复：
 * - 语言：按当前界面语言传入 i18n.locale（库为每个弹层独立初始化 i18n）
 * - 尺寸：theme.size 跟随外观密度的 Element Plus 三档
 *
 * 不设置 theme.mode：库未显式设置 mode 时不写 data-lite-layer-theme，
 * 由 CSS 规则 html.dark .lite-layer 跟随项目明暗，不受系统偏好影响。
 */
export function useLayer() {
  const { openLayer, closeLayer, closeAllLayer } = useLiteLayer()
  const { liteLayerLocale } = useLocale()
  const { elSize } = useAppearance()

  function resolveTheme(theme: LayerTheme | undefined): LayerTheme {
    // 字符串是命名主题，保持调用方原意
    if (typeof theme === 'string') {
      return theme
    }

    return {
      ...theme,
      size: theme?.size ?? elSize.value
    }
  }

  function open(config: LayerConfig = {}): LayerInstance | null {
    return openLayer({
      ...config,
      i18n: {
        locale: liteLayerLocale.value,
        ...config.i18n
      },
      theme: resolveTheme(config.theme)
    })
  }

  return {
    open,
    close: closeLayer,
    closeAll: closeAllLayer
  }
}
