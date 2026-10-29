<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import type { Density } from '~/config/appearance'

interface SearchCardProps {
  /** 初始是否展开，默认展开 */
  defaultExpanded?: boolean
  /**
   * 查询条件默认显示的行数，默认 3 行。
   * 实际行数大于该值时，按钮行才显示「展开 / 收起」；
   * 判断算法见脚本区「条件行折叠」注释。
   */
  visibleRows?: number
  /** 查询表单的 model，传入后「重置」「查询」会走表单校验与重置 */
  model?: Record<string, unknown>
  /** 查询表单的校验规则 */
  rules?: FormRules
  /** 表单标签宽度，默认 auto */
  labelWidth?: string | number
  /** 表单标签位置，默认右对齐 */
  labelPosition?: 'left' | 'right' | 'top'
  /** 栅格间隔；不传时跟随当前密度（紧凑 8 / 标准 12 / 宽松 16） */
  gutter?: number
}

const props = withDefaults(defineProps<SearchCardProps>(), {
  defaultExpanded: true,
  visibleRows: 3,
  model: undefined,
  rules: undefined,
  labelWidth: 'auto',
  labelPosition: 'right',
  gutter: undefined
})

const emit = defineEmits<{
  /** 校验通过后点击「查询」或回车 */
  search: []
  /** 点击「重置」（表单已复位） */
  reset: []
}>()

const { t } = useI18n()
const { density } = useAppearance()

/**
 * el-row 的 gutter 只接受数字，无法直接消费 CSS 令牌，
 * 这里按密度档位换算，保证和 --density-gap 一致。
 */
const DENSITY_GUTTER: Record<Density, number> = {
  compact: 8,
  default: 12,
  comfortable: 16
}

const expanded = ref(props.defaultExpanded)
const formRef = ref<FormInstance>()
const bodyId = useId()

const rowGutter = computed(() => props.gutter ?? DENSITY_GUTTER[density.value])
const toggleLabel = computed(() =>
  expanded.value ? t('searchCard.collapse') : t('searchCard.expand')
)

function toggle() {
  expanded.value = !expanded.value
}

function validate() {
  return formRef.value?.validate()
}

function resetFields() {
  formRef.value?.resetFields()
}

function clearValidate() {
  formRef.value?.clearValidate()
}

function handleSearch() {
  if (!props.model || !formRef.value) {
    emit('search')
    return
  }

  formRef.value.validate().then(
    () => emit('search'),
    // 校验未通过时不触发查询，错误信息由 el-form-item 展示
    () => undefined
  )
}

function handleReset() {
  if (props.model && formRef.value) {
    formRef.value.resetFields()
  }

  emit('reset')
}

/* ==========================================================================
 * 条件行折叠（核心算法）
 *
 * 目标
 *   默认只显示 visibleRows 行（默认 3 行），超出的条件隐藏；
 *   只有「实际行数 > visibleRows」时，按钮行才显示「展开 / 收起」。
 *
 * 为什么不能按固定列数推算
 *   条件列用的是 AppCol，列宽由 AppRow 的容器宽度决定（1/2/3/4/6 列），
 *   查询框变宽或变窄时换行位置都会变，所以只能按实际渲染位置测量。
 *
 * 行数测量
 *   1. 先把所有条件列的隐藏标记移除，恢复完整布局。
 *      隐藏列是 display: none，rect 全是 0，没法判断它原本属于第几行。
 *   2. 以 AppRow 的 top 为基准，对每个条件列的 top 取整：
 *      相同 top 的列属于同一行，不同 top 的数量就是实际行数。
 *   3. 行号按 top 首次出现的顺序编号，与 DOM 顺序一致。
 *
 * 是否显示「展开 / 收起」
 *   实际行数 > visibleRows  -> rowsOverflow = true，按钮显示；
 *   实际行数 <= visibleRows -> rowsOverflow = false，按钮隐藏，
 *                              同时把 rowsExpanded 复位（没有可展开的内容了）。
 *
 * 展开 / 收起
 *   rowsExpanded = false（默认）：给行号 >= visibleRows 的列加隐藏标记，
 *     由 CSS 用 display: none 隐藏。隐藏列不占空间、退出 Tab 顺序，
 *     但 DOM 和表单值都保留。
 *   rowsExpanded = true：移除所有隐藏标记，显示全部条件。
 *
 * 展开 / 收起动画
 *   按钮行已经移到 AppRow 外面，所以只对 AppRow 做 height 动画：
 *   - 展开：先显示全部列，高度从当前值过渡到完整高度，用 overflow: hidden 裁剪；
 *   - 收起：先算出收起高度，再临时恢复全部列做裁剪动画，
 *     动画结束后才真正加 display: none，避免列在动画开始时瞬间消失。
 *   动画期间 AppRow 后面的按钮行会被高度变化自然推动，不需要单独动画。
 *
 * 什么时候重新测量
 *   - 挂载后；
 *   - AppRow 宽度变化（ResizeObserver）：容器断点改变，列数和换行会变；
 *   - 条件列被 v-if / v-for 增删（MutationObserver 的 childList）；
 *   - visibleRows 变化；
 *   - 整卡从收起恢复到展开（nextTick 后再测，display: none 时无法测量）。
 *
 * 测量（先全部显示）和隐藏（再加标记）在同一个同步任务内完成，
 * 不会出现「先全部展开、下一帧再收起」的闪烁。
 * ========================================================================== */

/** 收缩后隐藏的条件列标记，具体样式在文件底部 */
const HIDDEN_ATTRIBUTE = 'data-search-card-collapsed'

const rowRef = ref<{ $el?: unknown }>()
/** 实际行数是否超过 visibleRows，控制「展开 / 收起」按钮是否显示 */
const rowsOverflow = ref(false)
/** 条件行是否已全部展开；false 表示只显示前 visibleRows 行 */
const rowsExpanded = ref(false)

let rowResizeObserver: ResizeObserver | undefined
let rowMutationObserver: MutationObserver | undefined
let rowAnimation: Animation | undefined
let lastRowWidth = 0

/** 展开 / 收起的高度动画时长 */
const COLLAPSE_ANIMATION_MS = 240

/** AppRow 组件的根 DOM（实际是 el-row 的根节点） */
function getRowElement(): HTMLElement | null {
  const element = rowRef.value?.$el
  return element instanceof HTMLElement ? element : null
}

/**
 * 取出条件列。
 *
 * AppRow 的直接子节点都是条件列；按钮行已经移到 AppRow 外。
 * 这里仍排除 search-card__actions-col，防止以后结构调整时把按钮行算进来。
 */
function getConditionColumns(row: HTMLElement): HTMLElement[] {
  return Array.from(row.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.classList.contains('el-col') &&
      !child.classList.contains('search-card__actions-col')
  )
}

/** 移除隐藏标记，恢复完整的条件列布局（测量或收起动画前用） */
function showAllColumns(row: HTMLElement, columns = getConditionColumns(row)) {
  columns.forEach((column) => column.removeAttribute(HIDDEN_ATTRIBUTE))
}

interface RowMeasurement {
  /** 实际渲染行数 */
  rowCount: number
  /** 每个条件列对应的行号（0 开始） */
  rowIndexByColumn: Map<HTMLElement, number>
}

/**
 * 测量每个条件列属于第几行。
 *
 * 前提：调用前所有列都已显示，隐藏列的 rect 全是 0，测不出真实位置。
 * 同一行的列 top 相同；按 top 首次出现的顺序给行编号，与 DOM 顺序一致。
 */
function measureRows(row: HTMLElement, columns: HTMLElement[]): RowMeasurement {
  const rowTop = row.getBoundingClientRect().top
  const rowIndexByTop = new Map<number, number>()
  const rowIndexByColumn = new Map<HTMLElement, number>()

  for (const column of columns) {
    const top = Math.round(column.getBoundingClientRect().top - rowTop)

    if (!rowIndexByTop.has(top)) {
      rowIndexByTop.set(top, rowIndexByTop.size)
    }

    rowIndexByColumn.set(column, rowIndexByTop.get(top) ?? 0)
  }

  return {
    rowCount: rowIndexByTop.size,
    rowIndexByColumn
  }
}

/**
 * 重新计算并应用条件行的显示状态。
 *
 * 步骤：
 *   1. 恢复所有列，保证测量到完整布局；
 *   2. 测量总行数和每个列的行号；
 *   3. 更新 rowsOverflow（决定展开/收起按钮是否显示）；
 *   4. 行数未超出：全部显示，结束；
 *   5. 已展开：全部显示，结束；
 *   6. 已收缩：隐藏行号 >= visibleRows 的列。
 */
function applyRows() {
  // 整卡收起时所有列都不可测量，等重新展开后再算
  if (!expanded.value) {
    return
  }

  const row = getRowElement()

  if (!row) {
    return
  }

  const columns = getConditionColumns(row)

  // 1. 先全部显示；display:none 的列 rect 为 0，无法参与行号测量
  showAllColumns(row, columns)

  // 2. 按实际 top 分组，得到真实行数
  const { rowCount, rowIndexByColumn } = measureRows(row, columns)
  const limit = Math.max(1, Math.floor(props.visibleRows))

  // 3. 只有行数大于 visibleRows 时才需要展开/收起按钮
  rowsOverflow.value = rowCount > limit

  if (!rowsOverflow.value) {
    // 4. 没有超出的行，展开状态没有意义，回到默认行数
    rowsExpanded.value = false
    return
  }

  if (rowsExpanded.value) {
    // 5. 已展开：所有列保持显示
    return
  }

  // 6. 收缩：只保留前 limit 行，其余列加隐藏标记
  for (const column of columns) {
    const rowIndex = rowIndexByColumn.get(column) ?? 0

    if (rowIndex >= limit) {
      column.setAttribute(HIDDEN_ATTRIBUTE, '')
    }
  }
}

/**
 * 给 AppRow 做一次高度过渡。
 *
 * 用固定 height + overflow: hidden 实现裁剪动画，结束后清除内联样式，
 * 恢复由内容决定的 auto 高度。
 */
function animateRowHeight(row: HTMLElement, from: number, to: number, onFinish?: () => void) {
  rowAnimation?.cancel()

  row.style.height = `${from}px`
  row.style.overflow = 'hidden'

  const animation = row.animate([{ height: `${from}px` }, { height: `${to}px` }], {
    duration: COLLAPSE_ANIMATION_MS,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  })

  rowAnimation = animation

  const cleanup = () => {
    row.style.removeProperty('height')
    row.style.removeProperty('overflow')
  }

  animation.onfinish = () => {
    cleanup()

    if (rowAnimation === animation) {
      rowAnimation = undefined
    }

    onFinish?.()
  }

  animation.oncancel = () => {
    cleanup()

    if (rowAnimation === animation) {
      rowAnimation = undefined
    }
  }
}

/**
 * 按钮行的展开 / 收起。
 *
 * 展开：显示全部列，AppRow 高度从当前值过渡到完整高度。
 * 收起：先算出收起后的高度，再临时恢复全部列做裁剪动画，
 *       动画完成后才真正加 display: none。
 */
function toggleRows() {
  const row = getRowElement()

  if (!row) {
    rowsExpanded.value = !rowsExpanded.value
    applyRows()
    return
  }

  // 尊重系统「减少动态效果」设置，直接切换
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    rowsExpanded.value = !rowsExpanded.value
    applyRows()
    return
  }

  const before = row.getBoundingClientRect().height
  const expanding = !rowsExpanded.value

  rowsExpanded.value = expanding
  applyRows()

  const after = row.getBoundingClientRect().height

  if (expanding) {
    // 展开：内容已经全部显示，高度从收起值过渡到完整值
    animateRowHeight(row, before, after)
    return
  }

  // 收起动画期间保留全部列，超出的行由 height + overflow 裁掉
  showAllColumns(row)
  animateRowHeight(row, before, after, () => applyRows())
}

/** visibleRows 配置变化时重新判定行数 */
watch(
  () => props.visibleRows,
  () => applyRows()
)

/** 整卡从收起恢复到展开后重新测量；display: none 期间列无法测量 */
watch(expanded, (value) => {
  if (value) {
    void nextTick(applyRows)
  }
})

onMounted(() => {
  const row = getRowElement()

  if (!row) {
    return
  }

  lastRowWidth = row.getBoundingClientRect().width
  applyRows()

  // 查询框宽度变化会改变 AppCol 的列数和换行位置，需要重新测量
  rowResizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width ?? 0

    // 展开/收起只改变高度；只有宽度变化才可能改变换行位置
    if (width <= 0 || width === lastRowWidth) {
      return
    }

    lastRowWidth = width
    applyRows()
  })
  rowResizeObserver.observe(row)

  // 条件列被 v-if / v-for 动态增删时重新判断行数
  rowMutationObserver = new MutationObserver(() => applyRows())
  rowMutationObserver.observe(row, { childList: true })
})

onBeforeUnmount(() => {
  rowResizeObserver?.disconnect()
  rowMutationObserver?.disconnect()
  rowAnimation?.cancel()
})

defineExpose({ expanded, toggle, validate, resetFields, clearValidate })
</script>

<template>
  <section class="search-card" :class="{ 'is-expanded': expanded }">
    <div class="search-card__header">
      <span class="search-card__title">{{ t('searchCard.title') }}</span>

      <span
        class="search-card__toggle"
        :class="{ 'is-expanded': expanded }"
        role="button"
        tabindex="0"
        :aria-label="toggleLabel"
        :title="toggleLabel"
        :aria-expanded="expanded"
        :aria-controls="bodyId"
        @click="toggle"
        @keydown.enter.prevent="toggle"
        @keydown.space.prevent="toggle"
      >
        <el-icon class="search-card__chevron"><ElIconArrowDownBold /></el-icon>
      </span>
    </div>

    <el-collapse-transition>
      <div v-show="expanded" :id="bodyId" class="search-card__body">
        <el-form
          ref="formRef"
          :model="model"
          :rules="rules"
          :label-width="labelWidth"
          :label-position="labelPosition"
          label-suffix=":"
          @submit.prevent="handleSearch"
        >
          <!-- 条件列（默认 slot）；行数折叠的测量对象就是这个 AppRow -->
          <app-row ref="rowRef" class="search-card__row" :gutter="rowGutter">
            <slot />
          </app-row>

          <!--
            按钮行放在 AppRow 外：
            - 不参与条件行数计算；
            - 收起/展开时由 AppRow 的高度动画推动，不会被 overflow 裁掉。
          -->
          <div class="search-card__actions" :style="{ paddingInline: `${rowGutter / 2}px` }">
            <!-- 实际行数 > visibleRows 才显示；rowsExpanded 控制展开/收起 -->
            <el-button v-if="rowsOverflow" link type="warning" @click="toggleRows">
              <template #icon>
                <el-icon>
                  <ElIconArrowUp v-if="rowsExpanded" />
                  <ElIconArrowDown v-else />
                </el-icon>
              </template>
              {{ rowsExpanded ? t('searchCard.collapseRows') : t('searchCard.expandRows') }}
            </el-button>
            <el-button @click="handleReset">
              <template #icon>
                <el-icon><ElIconRefreshLeft /></el-icon>
              </template>
              {{ t('searchCard.reset') }}
            </el-button>
            <slot name="command" />
            <el-button type="primary" native-type="submit">
              <template #icon>
                <el-icon><ElIconSearch /></el-icon>
              </template>
              {{ t('searchCard.search') }}
            </el-button>
          </div>
        </el-form>
      </div>
    </el-collapse-transition>
  </section>
</template>

<style scoped lang="scss">
.search-card {
  --search-card-padding: calc(var(--density-gap) + 4px);
  --search-card-header-height: 32px;
  //--search-card-title-size: 14px;

  // 紧凑档用小标题，标准和宽松档统一 16px
  html[data-density='compact'] & {
    --search-card-header-height: 32px;
    //--search-card-title-size: 12px;
  }

  html[data-density='comfortable'] & {
    --search-card-header-height: 40px;
  }

  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: var(--fg-default);
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--density-gap);
    min-height: var(--search-card-header-height);
    padding: 0 var(--search-card-padding);
    background: var(--brand-primary);
    color: var(--el-color-white);
    transition: background-color var(--transition-fast);
  }

  &__title {
    color: inherit;
    font-size: var(--ui-font-size);
    font-weight: 600;
    line-height: 1.4;
  }

  &__toggle {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    color: color-mix(in srgb, var(--el-color-white) 88%, transparent);
    cursor: pointer;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);

    &:hover {
      background: color-mix(in srgb, var(--el-color-white) 16%, transparent);
      color: var(--el-color-white);
    }

    &:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--el-color-white) 72%, transparent);
      outline-offset: 1px;
    }
  }

  &__chevron {
    font-size: var(--ui-font-size);
    transition: transform var(--transition-fast);
  }

  &__toggle.is-expanded &__chevron {
    transform: rotate(180deg);
  }

  &__body {
    padding: var(--search-card-padding);
  }

  // 按钮行右对齐；按钮间距交给 Element Plus 的相邻按钮 margin-left
  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  /*
   * 收缩后隐藏的条件列。
   * display:none：不占空间、退出 Tab 顺序，但 DOM 与表单值保留。
   * 用 !important 压过 el-col / app-col 自己的 display。
   */
  &__row :deep([data-search-card-collapsed]) {
    display: none !important;
  }
}
</style>
