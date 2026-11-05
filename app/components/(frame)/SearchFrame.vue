<script setup lang="ts">
import { useTabScrollShadow } from 'vue-stack-tabs'

/**
 * 内容区上下滚动阴影开关，等价于 useTabScrollShadow().setEnabled()：
 * - 默认 false：查询页不需要上下阴影，默认关闭
 * - 对象：单独关闭/开启某一侧，如 { top: false }
 */
const props = withDefaults(
  defineProps<{
    scrollShadow?: boolean | { top?: boolean; bottom?: boolean }
  }>(),
  {
    scrollShadow: false
  }
)

/**
 * useTabScrollShadow 只能在 <VueStackTabs> 缓存的页面内使用；
 * 在页签之外（如独立预览）拿不到控制器，忽略即可。
 */
try {
  const shadow = useTabScrollShadow()
  watch(
    () => props.scrollShadow,
    (value) => {
      shadow.setEnabled(value)
    },
    { immediate: true }
  )
} catch {
  // 不在 <VueStackTabs> 页面作用域内，无需处理
}
</script>

<template>
  <section class="h-full flex flex-col gap-1.5 p-1.5">
    <div>
      <slot name="search"></slot>
    </div>
    <div class="flex-auto overflow-hidden">
      <slot name="table"></slot>
    </div>
    <div class="hidden">
      <slot name="other"></slot>
    </div>
  </section>
</template>
