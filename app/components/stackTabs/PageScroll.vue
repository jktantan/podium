<!--
  PageScroll - 页签内容区滚动容器

  通过 <VueStackTabs :page-scroll="PageScroll"> 交给 vue-stack-tabs：
  - 默认插槽由库传入页面内容；
  - expose 的 scrollElement 是 AppScrollbar（OverlayScrollbars）的 viewport，
    库据此保存 / 恢复每个页签的滚动位置并计算上下阴影。

  OverlayScrollbars 仍由原生 scrollTop 驱动，因此只暴露 scrollElement 即可，
  不需要实现 StackTabsScrollAdapter 的可选方法。
-->
<template>
  <AppScrollbar ref="scrollbar" class="page-scroll h-full">
    <slot />
  </AppScrollbar>
</template>

<script setup lang="ts">
// import AppScrollbar from '~/components/global/AppScrollbar.vue'

interface ScrollbarInstance {
  scrollElement: () => HTMLElement | null
}

const scrollbar = ref<ScrollbarInstance>()

/**
 * 适配 vue-stack-tabs 的滚动策略。
 *
 * - viewport 是 OverlayScrollbars 内部真正承担滚动的元素，原生
 *   scrollTop / scrollLeft / scrollHeight / clientHeight 与 scroll 事件都可用；
 * - 暴露成函数而不是 computed：库会在挂载后的 nextTick 和 onActivated
 *   重新解析适配器，函数能取到届时已初始化的实例；computed 会把首次的
 *   null 缓存下来，导致滚动位置记忆与上下阴影失效。
 */
const scrollElement = () => scrollbar.value?.scrollElement() ?? null

defineExpose({ scrollElement })
</script>
