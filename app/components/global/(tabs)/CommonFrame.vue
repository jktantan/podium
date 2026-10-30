<script setup lang="ts">
import type { PageHeaderProps } from 'element-plus'
import { useTabScrollShadow } from 'vue-stack-tabs'

/**
 * 页签页面的通用框架：页头 + 内容 + 页脚。
 *
 * 布局
 *   根节点用纵向 flex 撑满页签内容区，页头 / 页脚用 sticky 吸顶、吸底，
 *   中间内容仍由外层 PageScroll 滚动，页签的滚动位置记忆不受影响。
 *
 * 阴影
 *   页签自身不再渲染上下滚动阴影（默认关闭），改由框架提供：
 *   - 有页头：阴影画在页头下方；
 *   - 有页脚：阴影画在页脚上方；
 *   - 缺少哪一侧，就把那一侧交还给页签的滚动阴影。
 */
interface CommonFrameProps {
  /**
   * 页头配置：
   * - `true` / 不传：渲染默认的 el-page-header；
   * - `false`：不渲染页头（此时开启页签顶部滚动阴影）；
   * - 对象：作为 el-page-header 的 props 透传（title / content / icon）。
   *
   * 需要完全自定义页头时使用 `#header` 插槽。
   */
  header?: boolean | PageHeaderProps
  /** 是否渲染页脚，默认渲染；页脚内容通过 `#footer` 插槽传入。 */
  footer?: boolean
}

const props = withDefaults(defineProps<CommonFrameProps>(), {
  header: true,
  footer: true
})

const emit = defineEmits<{
  /** 点击默认 el-page-header 的返回按钮 */
  back: []
}>()

const slots = useSlots()

const showHeader = computed(() => props.header !== false)
/** 没有页脚插槽时不留空白操作栏，按「未显示」处理 */
const showFooter = computed(() => props.footer !== false && Boolean(slots.footer))

/** 只有传对象才透传给 el-page-header，其余情况使用组件默认值 */
const pageHeaderProps = computed<PageHeaderProps>(() =>
  typeof props.header === 'object' ? props.header : {}
)

/**
 * 与 SearchFrame 相同：useTabScrollShadow 只能在 <VueStackTabs> 缓存的页面内使用，
 * 独立预览等场景拿不到控制器时忽略即可。
 */
let shadow: ReturnType<typeof useTabScrollShadow> | undefined

try {
  shadow = useTabScrollShadow()
} catch {
  shadow = undefined
}

// 页头 / 页脚接管对应一侧阴影后，关闭页签自身的该侧阴影
watch(
  [showHeader, showFooter],
  ([headerVisible, footerVisible]) => {
    shadow?.setEnabled({ top: !headerVisible, bottom: !footerVisible })
  },
  { immediate: true }
)

/**
 * 阴影显隐与页签保持一致：方向来自控制器的 state（到顶不显示顶部、到底不显示底部）。
 * 拿不到控制器时退化为常驻显示，避免独立预览时完全看不到分隔阴影。
 */
const shadowState = computed(() => shadow?.state.value ?? 'both')
const showHeaderShadow = computed(
  () => showHeader.value && (shadowState.value === 'top' || shadowState.value === 'both')
)
const showFooterShadow = computed(
  () => showFooter.value && (shadowState.value === 'bottom' || shadowState.value === 'both')
)

/* ==========================================================================
 * 回到顶部
 *
 * el-backtop 默认监听 document.documentElement 的滚动，而本项目的滚动发生在
 * PageScroll（OverlayScrollbars）的 viewport 上，window 始终不滚动。
 * 这里给当前页签的 viewport 打一个唯一 id，交给 el-backtop 作为 target；
 * 找不到 PageScroll 的 viewport 时不渲染（window 本身不滚动，显示也没有意义）。
 * ========================================================================== */

const root = ref<HTMLElement | null>(null)
const scrollTargetId = useId()
const backtopReady = ref(false)
const backtopTarget = ref<string>()

/**
 * 解析当前页面的滚动容器。
 *
 * 滚动源有两种：
 * - 自定义 PageScroll（OverlayScrollbars）：最近的 [data-overlayscrollbars-viewport]；
 * - 原生滚动（pageScroll="native"）：最近的 overflow-y 可滚动祖先，
 *   即 vue-stack-tabs 的 .stack-tab__cache-page-wrapper；
 * - 都没有时返回 null，交给 el-backtop 默认监听 window。
 */
function findScrollContainer(start: HTMLElement | null): HTMLElement | null {
  let el = start?.parentElement ?? null

  while (el && el !== document.body && el !== document.documentElement) {
    if (el.hasAttribute('data-overlayscrollbars-viewport')) {
      return el
    }

    const { overflowY } = getComputedStyle(el)

    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return el
    }

    el = el.parentElement
  }

  return null
}

/**
 * 给当前页签的滚动容器打上唯一 id 作为 el-backtop 的 target。
 *
 * 祖先 AppScrollbar 在自己的 onMounted 里才创建 OverlayScrollbars 的 viewport，
 * 而子组件先于父组件挂载，所以需要等一个 tick；页签重新激活时再补一次。
 */
function attachScrollTarget() {
  const container = findScrollContainer(root.value)

  if (container) {
    // 已有 id（如 vue-stack-tabs 的 #W-<cacheName>）直接复用，不要覆盖库的定位锚点
    if (!container.id) {
      container.id = scrollTargetId
    }

    backtopTarget.value = `#${CSS.escape(container.id)}`
  }

  backtopReady.value = true
}

onActivated(attachScrollTarget)
</script>

<template>
  <section ref="root" class="common-frame">
    <div
      v-if="showHeader"
      class="common-frame__header"
      :class="{
        'common-frame__header--shadow': showHeaderShadow
      }"
    >
      <slot name="header">
        <el-page-header v-bind="pageHeaderProps" @back="emit('back')" />
      </slot>
    </div>

    <div class="common-frame__body px-2">
      <slot></slot>
    </div>

    <div
      v-if="showFooter"
      class="common-frame__footer"
      :class="{
        'common-frame__footer--shadow': showFooterShadow
      }"
    >
      <slot name="footer"></slot>
    </div>

    <el-backtop
      v-if="backtopReady"
      :key="backtopTarget"
      :target="backtopTarget"
      :right="50"
      :bottom="50"
    />
  </section>
</template>

<style scoped lang="scss">
.common-frame {
  // 撑满页签内容区；内容不足一屏时页脚也能贴底
  display: flex;
  flex-direction: column;
  min-height: 100%;

  &__header {
    // 置顶：内容从页头下方滚过时保持可见
    position: sticky;
    top: 0;
    z-index: 2;
    flex: none;
    //padding: calc(var(--density-gap) / 2) 0;
    padding: calc(var(--density-gap) / 2);
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    // 阴影样式与页签一致：颜色 / 模糊 / 扩散都取自 vue-stack-tabs
    &--shadow {
      box-shadow: 0 5px 5px -5px var(--stack-tab-shadow-color);
    }
  }

  &__body {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__footer {
    // 置底：内容不足一屏时被 margin-top: auto 推到最底部，超出后吸底
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    //gap: var(--density-gap);
    margin-top: auto;
    padding: calc(var(--density-gap) / 2);
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    &--shadow {
      box-shadow: 0 -5px 5px -5px var(--stack-tab-shadow-color);
    }
  }

  // 深色下页签会加宽 inset 阴影的渐变带，这里保持同样的节奏
  html.dark &__header--shadow {
    box-shadow: 0 14px 14px -14px var(--stack-tab-shadow-color);
  }

  html.dark &__footer--shadow {
    box-shadow: 0 -14px 14px -14px var(--stack-tab-shadow-color);
  }
}
</style>
