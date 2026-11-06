<template>
  <div class="icon-grid relative overflow-hidden" :style="{ height: `${height}px` }">
    <el-empty
      v-if="!icons.length"
      class="icon-grid__empty"
      :description="emptyText"
      :image-size="64"
    />

    <el-scrollbar v-else ref="scrollbarRef" class="icon-grid__scroll h-full" @scroll="handleScroll">
      <div class="icon-grid__canvas relative" :style="{ height: `${totalHeight}px` }">
        <el-tooltip
          v-for="item in visibleItems"
          :key="item.name"
          :content="item.name"
          placement="top"
          :show-after="400"
          :offset="6"
        >
          <button
            type="button"
            class="icon-grid__item absolute top-0 left-0 inline-flex items-center justify-center"
            :class="{
              'is-active': item.name === modelValue,
              'icon-grid__item--color': variant === 'color'
            }"
            :style="item.style"
            :aria-label="item.name"
            :aria-pressed="item.name === modelValue"
            @click="emit('select', item.name)"
          >
            <AppIcon :name="item.name" :size="22" />
          </button>
        </el-tooltip>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import type { ScrollbarInstance } from 'element-plus'

/**
 * 图标虚拟网格。
 *
 * 一行多列、行高一致：只渲染可视行上下各 overscan 行，
 * 其余用 canvas 的总高度撑出滚动条，避免 1000+ 个图标同时挂载。
 *
 * 列数由容器宽度实时计算，所以 popover 变宽、窗口缩放都会重新排列。
 */
interface AppIconPickerGridProps {
  /** 图标名列表（AppIcon 的 name，不含 icon- 前缀） */
  icons: string[]
  /** 当前选中的图标名 */
  modelValue?: string
  /** 单色图标选中时跟随主色，彩色图标保留原色 */
  variant: 'mono' | 'color'
  /** 下拉是否可见且处于当前激活的 tab；变为可见时重新测量容器尺寸 */
  active?: boolean
  /** 可视区高度（px） */
  height?: number
  /** 空状态文案 */
  emptyText: string
}

const props = withDefaults(defineProps<AppIconPickerGridProps>(), {
  modelValue: '',
  active: true,
  height: 300
})

const emit = defineEmits<{
  select: [name: string]
}>()

const { elSize } = useAppearance()

/** 基础格宽跟随全局密度；实际格宽会把容器宽度均分 */
const BASE_CELL_SIZE = { small: 36, default: 40, large: 44 } as const
const baseCellSize = computed(() => BASE_CELL_SIZE[elSize.value])

const GAP = 6
const OVERSCAN = 2

const scrollbarRef = ref<ScrollbarInstance>()
const viewportWidth = ref(0)
const viewportHeight = ref(props.height)
const scrollTop = ref(0)

const columnCount = computed(() =>
  Math.max(1, Math.floor((viewportWidth.value + GAP) / (baseCellSize.value + GAP)))
)

/**
 * 列数确定后把容器宽度均分给每一列（不小于基础格宽）。
 * 只按固定格宽排布时，最后会剩下一截空白；均分后每次都能铺满一行。
 */
const cellWidth = computed(() => {
  const columns = columnCount.value

  if (!viewportWidth.value) {
    return baseCellSize.value
  }

  return Math.max(baseCellSize.value, (viewportWidth.value - GAP * (columns - 1)) / columns)
})

const rowHeight = computed(() => cellWidth.value + GAP)
const rowCount = computed(() => Math.ceil(props.icons.length / columnCount.value))
const totalHeight = computed(() => Math.max(0, rowCount.value * rowHeight.value - GAP))

/**
 * 可视区起点。
 *
 * popover 关闭 / 内容变矮（切换密度、搜索过滤）后，scrollTop 可能大于内容总高度，
 * 而浏览器不一定派发 scroll 事件来纠正；虚拟列表若继续用旧值，
 * 算出的区间会整个落在列表之外，表现就是图标区一片空白。
 * 这里先把起点夹到有效范围，真实滚动位置仍由 el-scrollbar 维护。
 */
const visibleTop = computed(() => {
  const max = Math.max(0, totalHeight.value - viewportHeight.value)
  const top = Number.isFinite(scrollTop.value) ? scrollTop.value : 0

  return Math.min(Math.max(0, top), max)
})

const startRow = computed(() =>
  Math.max(0, Math.floor(visibleTop.value / rowHeight.value) - OVERSCAN)
)

const endRow = computed(() =>
  Math.min(
    rowCount.value,
    Math.ceil((visibleTop.value + viewportHeight.value) / rowHeight.value) + OVERSCAN
  )
)

const visibleItems = computed(() => {
  const columns = columnCount.value
  const stepX = cellWidth.value + GAP
  const stepY = rowHeight.value
  const start = startRow.value * columns
  const end = Math.min(props.icons.length, endRow.value * columns)
  const items: { name: string; style: Record<string, string> }[] = []

  for (let index = start; index < end; index += 1) {
    const row = Math.floor(index / columns)
    const column = index % columns

    items.push({
      name: props.icons[index]!,
      style: {
        width: `${cellWidth.value}px`,
        height: `${cellWidth.value}px`,
        transform: `translate(${column * stepX}px, ${row * stepY}px)`
      }
    })
  }

  return items
})

function handleScroll({ scrollTop: nextScrollTop }: { scrollTop: number }) {
  scrollTop.value = nextScrollTop
}

function scrollToSelected() {
  const index = props.icons.indexOf(props.modelValue)

  if (index < 0) {
    return
  }

  const row = Math.floor(index / columnCount.value)
  const centeredRow = Math.max(0, row - Math.floor(viewportHeight.value / rowHeight.value / 2))
  const target = centeredRow * rowHeight.value

  scrollbarRef.value?.setScrollTop(target)
  scrollTop.value = target
}

let resizeObserver: ResizeObserver | undefined

/**
 * 测量滚动容器。
 *
 * 隐藏的 tab / 关闭的 popover 里 clientWidth、clientHeight 都是 0，
 * 这时保留上一次的有效尺寸，否则列数会被算成 1，切回 tab 后图标全部错位。
 */
function measure() {
  const wrap = scrollbarRef.value?.wrapRef

  if (!wrap) {
    return
  }

  if (wrap.clientWidth > 0) {
    viewportWidth.value = wrap.clientWidth
  }

  if (wrap.clientHeight > 0) {
    viewportHeight.value = wrap.clientHeight
  }

  // 关闭期间浏览器可能已经把真实滚动位置夹掉，虚拟列表不能继续拿着旧值
  if (wrap.clientWidth > 0 && wrap.scrollTop !== scrollTop.value) {
    scrollTop.value = wrap.scrollTop
  }
}

onMounted(() => {
  const wrap = scrollbarRef.value?.wrapRef

  if (!wrap) {
    return
  }

  measure()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(wrap)
  }

  scrollToSelected()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// 隐藏期间无法测量；tab 激活后补测一次，保证列数和格宽正确
watch(
  () => props.active,
  async (active) => {
    if (!active) {
      return
    }

    await nextTick()
    measure()
    scrollToSelected()
  }
)

/*
 * 列表内容变化（切 tab、搜索）时：
 * 选中项还在列表里就滚到它，否则回到顶部。
 */
watch(
  () => props.icons,
  async () => {
    await nextTick()

    if (props.icons.includes(props.modelValue)) {
      scrollToSelected()
    } else {
      scrollbarRef.value?.setScrollTop(0)
      scrollTop.value = 0
    }
  }
)

watch(
  () => props.modelValue,
  async () => {
    await nextTick()
    scrollToSelected()
  }
)

// 初次挂载时可能还没拿到容器宽度，列数 / 格宽变化后重新定位选中项
watch(rowHeight, async () => {
  await nextTick()
  scrollToSelected()
})
</script>

<style scoped lang="scss">
.icon-grid {
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0;
  }

  /*
   * el-scrollbar 的滚动条浮在内容之上（right: 2px、宽 6px），
   * 这里给滚动条让出槽位，避免最右一列图标被压住。
   * 14px = 2px 内缩 + 6px 条宽 + 6px 与图标的间距（与 GAP 一致）。
   */
  &__scroll {
    padding-right: 14px;
  }

  &__item {
    padding: 0;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--fg-default);
    cursor: pointer;
    transition:
      color var(--transition-fast),
      background-color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      /* hover 面用 Element Plus 的中性填充色，深浅色下自动适配 */
      background: var(--el-fill-color-light);
      color: var(--brand-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--brand-primary);
      outline-offset: -2px;
    }

    /* 选中：单色和彩色使用同一套边框与底色，单色图标再跟随主色 */
    &.is-active {
      border-color: var(--brand-primary);
      background: var(--brand-primary-surface);
      color: var(--brand-primary);
    }

    /* 彩色图标保留自身颜色，选中 / hover 都不跟随主色 */
    &--color {
      &.is-active,
      &:hover {
        color: var(--fg-default);
      }
    }
  }
}
</style>
