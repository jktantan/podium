/**
 * 外观配置（主题色 / 明暗 / 密度）
 *
 * 这是外观能力的唯一配置来源：
 * - 主题色预设只在这里维护，UI 色块和实际写入的色值不会两处不一致
 * - 密度档位到组件库尺寸的映射也只在这里维护
 *
 * 新增一个主题色：往 THEME_PRESETS 加一项即可，不需要改 CSS。
 */

export type ColorScheme = 'light' | 'dark'
export type Density = 'compact' | 'default' | 'comfortable'

/** Element Plus 的尺寸档位，与密度一一对应 */
export type ElementSize = 'small' | 'default' | 'large'
/** VXE 原生尺寸：small / medium / default 对应 Element Plus 小 / 默认 / 大 */
export type VxeSize = 'small' | 'medium' | 'default'
/** vue-stack-tabs 的 data-stack-tab-size 预设 */
export type StackTabSize = 'small' | 'normal' | 'large'

export interface ThemePreset {
  id: string
  /** 文案 key，标签在 i18n/locales 的 appearance.themes.* 下 */
  labelKey: string
  /** 浅色模式下的品牌主色；深色模式由 tokens.css 自动提亮 */
  color: string
}

export interface DensityOption {
  value: Density
  /** 文案 key，标签在 i18n/locales 的 appearance.densities.* 下 */
  labelKey: string
  elSize: ElementSize
  vxeSize: VxeSize
  stackTabSize: StackTabSize
}

/** localStorage 键名，nuxt.config.ts 的首屏防闪脚本会读取同一个键 */
export const APPEARANCE_STORAGE_KEY = 'podium:appearance'

export const DEFAULT_THEME_ID = 'element'
export const DEFAULT_DENSITY: Density = 'default'
export const DEFAULT_SCHEME: ColorScheme = 'light'

export const THEME_PRESETS: readonly ThemePreset[] = [
  { id: 'element', labelKey: 'appearance.themes.element', color: '#409eff' },
  { id: 'indigo', labelKey: 'appearance.themes.indigo', color: '#4f46e5' },
  { id: 'ocean', labelKey: 'appearance.themes.ocean', color: '#0284c7' },
  { id: 'teal', labelKey: 'appearance.themes.teal', color: '#0d9488' },
  { id: 'forest', labelKey: 'appearance.themes.forest', color: '#16a34a' },
  { id: 'amber', labelKey: 'appearance.themes.amber', color: '#d97706' },
  { id: 'rose', labelKey: 'appearance.themes.rose', color: '#e11d48' },
  { id: 'violet', labelKey: 'appearance.themes.violet', color: '#7c3aed' },
  { id: 'slate', labelKey: 'appearance.themes.slate', color: '#475569' }
]

export const DENSITY_OPTIONS: readonly DensityOption[] = [
  {
    value: 'compact',
    labelKey: 'appearance.densities.compact',
    elSize: 'small',
    vxeSize: 'small',
    stackTabSize: 'small'
  },
  {
    value: 'default',
    labelKey: 'appearance.densities.default',
    elSize: 'default',
    vxeSize: 'medium',
    stackTabSize: 'normal'
  },
  {
    value: 'comfortable',
    labelKey: 'appearance.densities.comfortable',
    elSize: 'large',
    vxeSize: 'default',
    stackTabSize: 'large'
  }
]

export const SCHEME_OPTIONS: readonly { value: ColorScheme; labelKey: string }[] = [
  { value: 'light', labelKey: 'appearance.schemes.light' },
  { value: 'dark', labelKey: 'appearance.schemes.dark' }
]

export function getThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id)
}

export function getDensityOption(value: Density): DensityOption {
  return DENSITY_OPTIONS.find((option) => option.value === value) ?? DENSITY_OPTIONS[1]!
}
