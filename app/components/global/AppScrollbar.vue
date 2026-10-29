<template>
  <div ref="host">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { OverlayScrollbars, type PartialOptions } from 'overlayscrollbars'
import { overlayScrollbarOptions } from '~/config/scrollbar'

/**
 * 全局滚动容器，直接使用 OverlayScrollbars 核心 API。
 *
 * 默认使用 config/scrollbar.ts 的全局配置，调用点不需要传 options：
 *
 *   <AppScrollbar class="page-scroll">...</AppScrollbar>
 *
 * 需要局部调整时再传 options，会与全局 scrollbars 字段合并：
 *
 *   <AppScrollbar :options="{ scrollbars: { autoHide: 'never' } }">...</AppScrollbar>
 *
 * 宿主的尺寸由调用点的 class 负责（例如 height: 100%）。
 */
const props = defineProps<{ options?: PartialOptions }>()

const host = ref<HTMLElement>()

const mergedOptions = computed<PartialOptions>(() => ({
  ...overlayScrollbarOptions,
  ...props.options,
  scrollbars: {
    ...(overlayScrollbarOptions.scrollbars ?? {}),
    ...(props.options?.scrollbars ?? {})
  }
}))

let instance: OverlayScrollbars | null = null

onMounted(() => {
  if (!host.value) return

  instance = OverlayScrollbars(host.value, mergedOptions.value)
})

watch(
  () => props.options,
  () => instance?.options(mergedOptions.value),
  { deep: true }
)

onBeforeUnmount(() => {
  instance?.destroy()
  instance = null
})

defineExpose({
  osInstance: () => instance,
  getElement: () => host.value ?? null,
  scrollElement: () => instance?.elements().viewport ?? null,
  update: (force = false) => instance?.update(force)
})
</script>
