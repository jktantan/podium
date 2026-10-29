<script setup lang="ts">
interface AppRowProps {
  /** 自定义标签，和 el-row 一致 */
  tag?: string
  /** 栅格间隔，和 el-row 一致 */
  gutter?: number
  /** 水平排列方式，和 el-row 一致 */
  justify?: 'start' | 'center' | 'end' | 'space-around' | 'space-between' | 'space-evenly'
  /** 垂直对齐方式，和 el-row 一致 */
  align?: 'top' | 'middle' | 'bottom'
}

withDefaults(defineProps<AppRowProps>(), {
  tag: 'div',
  gutter: 0,
  justify: 'start',
  align: undefined
})
</script>

<template>
  <el-row class="app-row" :tag="tag" :gutter="gutter" :justify="justify" :align="align">
    <slot />
  </el-row>
</template>

<style scoped lang="scss">
/*
 * 容器版栅格：AppCol 的响应式断点查询这个容器的宽度，而不是 viewport。
 * 断点定义见 AppCol.vue（560 / 840 / 1120 / 1680）。
 */
.app-row {
  container-name: app-row;
  container-type: inline-size;
}
</style>
