<template>
  <el-popover
    :visible="open"
    trigger="manual"
    placement="bottom-start"
    :width="panelWidth"
    :disabled="disabled"
    :teleported="teleported"
    :popper-style="{ padding: '8px 12px 12px' }"
  >
    <template #reference>
      <el-input
        ref="inputRef"
        v-model="keyword"
        :size="size"
        :disabled="disabled"
        :clearable="clearable"
        :placeholder="resolvedPlaceholder"
        :aria-label="resolvedPlaceholder"
        @click="openPicker"
        @clear="handleClear"
      >
        <template #prefix>
          <el-icon v-if="modelValue"><AppIcon :name="modelValue" /></el-icon>
          <el-icon v-else><ElIconSearch /></el-icon>
        </template>
      </el-input>
    </template>

    <div ref="panelRef" class="app-icon-picker__panel">
      <el-tabs v-model="activeTab" class="app-icon-picker__tabs">
        <el-tab-pane :label="monoTabLabel" name="mono">
          <AppIconPickerGrid
            :icons="monoIcons"
            :model-value="modelValue"
            variant="mono"
            :active="activeTab === 'mono'"
            :height="panelHeight"
            :empty-text="t('iconPicker.empty')"
            @select="handleSelect"
          />
        </el-tab-pane>

        <el-tab-pane :label="colorTabLabel" name="color">
          <AppIconPickerGrid
            :icons="colorIcons"
            :model-value="modelValue"
            variant="color"
            :active="activeTab === 'color'"
            :height="panelHeight"
            :empty-text="t('iconPicker.empty')"
            @select="handleSelect"
          />
        </el-tab-pane>
      </el-tabs>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import type { InputInstance } from 'element-plus'
import ids from 'virtual:svg-icons/ids'

/**
 * 下拉图标选择器。
 *
 * 全部用 Element Plus 组件组装：
 * - el-popover 承载下拉层，el-input 既是触发器也是查询框
 * - el-tabs 区分单色 / 彩色图标
 * - el-scrollbar + 虚拟网格（AppIconPickerGrid）展示一行多列的图标
 *
 * v-model 的值是 AppIcon 的 name（不含 icon- 前缀），
 * 与 <AppIcon name="mono-ant-close"> 的写法保持一致。
 */
interface AppIconPickerProps {
  /** 选中的图标名，如 mono-ant-close / color-cms-b-SEO */
  modelValue?: string
  /** 输入框占位文案；不传时用 i18n 默认值 */
  placeholder?: string
  disabled?: boolean
  clearable?: boolean
  /** 不传时跟随 ElConfigProvider 的全局尺寸（即项目密度） */
  size?: 'large' | 'default' | 'small'
  /** 下拉面板宽度（px） */
  panelWidth?: number
  /** 图标可视区高度（px） */
  panelHeight?: number
  teleported?: boolean
}

const props = withDefaults(defineProps<AppIconPickerProps>(), {
  modelValue: '',
  placeholder: '',
  disabled: false,
  clearable: true,
  size: undefined,
  panelWidth: 400,
  panelHeight: 300,
  teleported: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const { t } = useLocale()

const ICON_PREFIX = 'icon-'

/** 构建期的图标清单（symbolId），在模块加载时分组一次 */
const ICON_NAMES = (ids as string[]).map((id) => id.slice(ICON_PREFIX.length))
const MONO_ICONS = ICON_NAMES.filter((name) => !name.startsWith('color-'))
const COLOR_ICONS = ICON_NAMES.filter((name) => name.startsWith('color-'))

const open = ref(false)
const keyword = ref(props.modelValue)
const activeTab = ref<'mono' | 'color'>('mono')

const inputRef = ref<InputInstance>()
const panelRef = ref<HTMLElement>()

const triggerEl = computed(() => inputRef.value?.$el as HTMLElement | undefined)

/**
 * 下拉由手动控制，不用 trigger="click"：
 * click 触发器会 toggle，点击输入框时把已经打开的面板关掉。
 * el-popover 用完全受控的 :visible（不提供 update 回调），
 * 这样它内部的「点击触发器即关闭」也不会生效；
 * 关闭只由「选中图标 / 点击外部 / Esc」触发。
 */
function openPicker() {
  if (props.disabled || open.value) {
    return
  }

  handleShow()
  open.value = true
}

/** 关闭下拉，并把输入框恢复成当前选中值（搜索词只在下拉打开期间有效） */
function closePicker() {
  open.value = false
  keyword.value = props.modelValue
}

function handleOutsidePointerDown(event: PointerEvent) {
  const target = event.target as Node | null

  if (!target) {
    return
  }

  if (triggerEl.value?.contains(target) || panelRef.value?.contains(target)) {
    return
  }

  closePicker()
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closePicker()
  }
}

function bindDocumentListeners(active: boolean) {
  if (!import.meta.client) {
    return
  }

  if (active) {
    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    document.addEventListener('keydown', handleDocumentKeydown)
  } else {
    document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
    document.removeEventListener('keydown', handleDocumentKeydown)
  }
}

watch(open, (visible) => bindDocumentListeners(visible))

onBeforeUnmount(() => bindDocumentListeners(false))

const resolvedPlaceholder = computed(() => props.placeholder || t('iconPicker.placeholder'))

const monoTabLabel = computed(() => `${t('iconPicker.mono')} (${monoIcons.value.length})`)

const colorTabLabel = computed(() => `${t('iconPicker.color')} (${colorIcons.value.length})`)

/**
 * 查询词。
 *
 * 输入框在未输入时显示的是选中图标的代码，这段文本不能当成搜索条件，
 * 否则一打开下拉就只剩选中的那一个图标。
 */
const normalizedKeyword = computed(() => {
  const value = keyword.value.trim()

  if (!value || value === props.modelValue) {
    return ''
  }

  const lower = value.toLowerCase()
  return lower.startsWith(ICON_PREFIX) ? lower.slice(ICON_PREFIX.length) : lower
})

function filterIcons(list: string[], query: string) {
  return query ? list.filter((name) => name.toLowerCase().includes(query)) : list
}

const monoIcons = computed(() => filterIcons(MONO_ICONS, normalizedKeyword.value))
const colorIcons = computed(() => filterIcons(COLOR_ICONS, normalizedKeyword.value))

function handleShow() {
  keyword.value = props.modelValue

  if (props.modelValue.startsWith('color-')) {
    activeTab.value = 'color'
  } else if (props.modelValue) {
    activeTab.value = 'mono'
  }
}

function handleSelect(name: string) {
  emit('update:modelValue', name)
  emit('change', name)
  keyword.value = name
  open.value = false
}

function handleClear() {
  emit('update:modelValue', '')
  emit('change', '')
  keyword.value = ''
}

// 当前 tab 没有匹配项、另一个 tab 有时自动切过去，避免用户以为查无结果
watch(normalizedKeyword, (query) => {
  if (!query) {
    return
  }

  const current = activeTab.value === 'mono' ? monoIcons.value : colorIcons.value

  if (current.length) {
    return
  }

  const other = activeTab.value === 'mono' ? colorIcons.value : monoIcons.value

  if (other.length) {
    activeTab.value = activeTab.value === 'mono' ? 'color' : 'mono'
  }
})

// 外部改值（表单重置等）时同步输入框；打开期间不打断用户输入
watch(
  () => props.modelValue,
  (value) => {
    if (!open.value) {
      keyword.value = value
    }
  }
)
</script>

<style scoped lang="scss">
.app-icon-picker__tabs {
  /* popover 里不需要 tabs 的下边距，尽量把高度留给图标区 */
  :deep(.el-tabs__header) {
    margin: 0 0 8px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
  }
}
</style>
