<template>
  <svg
    class="app-icon"
    :style="sizeStyle"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <use :href="`#${symbolId}`" />
  </svg>
</template>

<script setup lang="ts">
import { ensureSvgSprite } from '~/utils/svg-sprite'

interface AppIconProps {
  /**
   * 图标名，等于 app/assets/icons 下的相对路径（去掉 .svg）：
   * color/cms-b/SEO.svg -> "color-cms-b-SEO"
   */
  name: string
  /** 尺寸：数字按 px 处理，字符串原样使用（默认 1em，跟随字号） */
  size?: string | number
  /** 无障碍名称；纯装饰图标不要传 */
  label?: string
}

const props = withDefaults(defineProps<AppIconProps>(), {
  size: '1em',
  label: undefined
})

const symbolId = computed(() => `icon-${props.name}`)
const sizeStyle = computed(() => {
  const value = typeof props.size === 'number' ? `${props.size}px` : props.size
  return { width: value, height: value }
})

// sprite 只在真正渲染图标时才注入：页面没有 AppIcon 就不会下载那一整块 sprite。
// 注入是异步的，<use> 在 symbol 到位后自动生效，不需要额外刷新。
onMounted(() => {
  void ensureSvgSprite()
})
</script>

<style scoped>
.app-icon {
  display: inline-block;
  flex: none;
  overflow: hidden;
  fill: currentcolor;
  vertical-align: -0.125em;
}
</style>
