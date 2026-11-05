<template>
  <div class="workspace-backdrop" aria-hidden="true">
    <AppAmbientBackdrop />
    <div class="workspace-backdrop__mesh"></div>
    <div class="workspace-backdrop__veil"></div>
  </div>
</template>

<script setup lang="ts">
/**
 * 工作区背景层
 *
 * 通过 <VueStackTabs> 的 #background 插槽交给库渲染：铺满页签容器，
 * 位于页签头与内容之下。背景属于布局私有，不放进全局组件。
 *
 * 叠放顺序与旧版主区域一致：
 * 动态氛围背景（WebGL）→ 六边形纹理 → 极薄表面色。
 */
</script>

<style scoped lang="scss">
@use '../../assets/scss/mixins' as *;

.workspace-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--ambient-base);

  // 六边形纹理单独成层：mask 在四周淡出，避免整块工作区变成蜂巢板
  &__mesh {
    position: absolute;
    inset: 0;

    @include ambient-mesh;

    pointer-events: none;
  }

  /*
   * 极薄的表面色，与旧版 .stack-tab 的半透明底一致：
   * 内容区直接透出这层，既有背景柔光又不会让文字失去对比。
   */
  &__veil {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--bg-surface) 10%, transparent);
    pointer-events: none;
  }
}
</style>
