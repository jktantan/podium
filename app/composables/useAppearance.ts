import { computed, reactive, readonly, watch } from 'vue'
import { VxeUI } from '@vxe-ui/core'
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_DENSITY,
  DEFAULT_SCHEME,
  DEFAULT_THEME_ID,
  DENSITY_OPTIONS,
  SCHEME_OPTIONS,
  THEME_PRESETS,
  getDensityOption,
  getThemePreset,
  type ColorScheme,
  type Density
} from '~/config/appearance'

interface AppearanceState {
  themeId: string
  /** 实际写入 --brand-seed 的色值；保留独立字段，为将来自定义取色留位置 */
  color: string
  density: Density
  scheme: ColorScheme
}

function defaultState(): AppearanceState {
  const preset = getThemePreset(DEFAULT_THEME_ID)!

  return {
    themeId: preset.id,
    color: preset.color,
    density: DEFAULT_DENSITY,
    scheme: DEFAULT_SCHEME
  }
}

function normalizeState(input: Partial<AppearanceState> | null | undefined): AppearanceState {
  const base = defaultState()

  if (!input || typeof input !== 'object') {
    return base
  }

  const preset = typeof input.themeId === 'string' ? getThemePreset(input.themeId) : undefined
  const color = typeof input.color === 'string' && input.color ? input.color : preset?.color

  return {
    themeId: preset?.id ?? base.themeId,
    color: color ?? base.color,
    density: DENSITY_OPTIONS.some((option) => option.value === input.density)
      ? (input.density as Density)
      : base.density,
    scheme: SCHEME_OPTIONS.some((option) => option.value === input.scheme)
      ? (input.scheme as ColorScheme)
      : base.scheme
  }
}

function readStored(): Partial<AppearanceState> | null {
  if (!import.meta.client) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<AppearanceState>) : null
  } catch {
    return null
  }
}

const state = reactive<AppearanceState>(normalizeState(readStored()))

let initialized = false

/**
 * 把状态落到 DOM：
 * - .dark / data-density 走属性，CSS 侧直接命中
 * - --brand-seed 走内联变量，优先级高于 :root 默认值
 * - VXE 的主题和尺寸必须走它自己的 API，CSS 变量覆盖不全
 */
function apply() {
  if (!import.meta.client) {
    return
  }

  const root = document.documentElement

  root.classList.toggle('dark', state.scheme === 'dark')
  root.dataset.density = state.density
  root.dataset.theme = state.themeId
  root.dataset.stackTabSize = getDensityOption(state.density).stackTabSize
  root.style.setProperty('--brand-seed', state.color)

  // VXE：主题写属性即可。
  // 尺寸不能走 setConfig：它只在组件创建时被读成 props.size 的默认值，
  // 已挂载的表格不会跟随。尺寸统一由 app.vue provide 的 xeSizeInfo 注入。
  VxeUI.setTheme(state.scheme)

  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 隐私模式 / 存储被禁用时忽略，界面仍然可用
  }
}

function setup() {
  if (initialized || !import.meta.client) {
    return
  }

  initialized = true
  apply()

  watch(state, apply)

  // 多标签页同步：别的标签改了外观，这边跟着变
  window.addEventListener('storage', (event) => {
    if (event.key !== APPEARANCE_STORAGE_KEY || !event.newValue) {
      return
    }

    try {
      Object.assign(state, normalizeState(JSON.parse(event.newValue) as Partial<AppearanceState>))
    } catch {
      // 忽略损坏的存储值
    }
  })
}

/**
 * 外观状态与操作。
 *
 * 在 app.vue 中调用一次即可完成初始化；header 上的 AppearanceSwitcher 直接消费返回值。
 */
export function useAppearance() {
  setup()

  const themeId = computed(() => state.themeId)
  const density = computed(() => state.density)
  const scheme = computed(() => state.scheme)
  const color = computed(() => state.color)

  const elSize = computed(() => getDensityOption(state.density).elSize)
  const vxeSize = computed(() => getDensityOption(state.density).vxeSize)
  const giantTreeSize = computed(() => getDensityOption(state.density).giantTreeSize)

  function setTheme(id: string) {
    const preset = getThemePreset(id)

    if (!preset) {
      return
    }

    state.themeId = preset.id
    state.color = preset.color
  }

  function setDensity(value: Density) {
    if (DENSITY_OPTIONS.some((option) => option.value === value)) {
      state.density = value
    }
  }

  function setScheme(value: ColorScheme) {
    if (SCHEME_OPTIONS.some((option) => option.value === value)) {
      state.scheme = value
    }
  }

  function reset() {
    Object.assign(state, defaultState())
  }

  return {
    themeId: readonly(themeId),
    color: readonly(color),
    density: readonly(density),
    scheme: readonly(scheme),
    elSize,
    vxeSize,
    giantTreeSize,
    presets: THEME_PRESETS,
    densityOptions: DENSITY_OPTIONS,
    schemeOptions: SCHEME_OPTIONS,
    setTheme,
    setDensity,
    setScheme,
    reset
  }
}
