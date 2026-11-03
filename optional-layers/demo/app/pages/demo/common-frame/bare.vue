<template>
  <common-frame :header="false" :footer="false">
    <section class="frame-demo">
      <div class="frame-demo__toolbar">
        <el-button @click="goBack">返回查询框架</el-button>
      </div>

      <p class="frame-demo__lead">
        无页头 + 无页脚：上下阴影都交还给页签自身的滚动阴影，逻辑与页签一致；内容区从页签顶部
        一直滚到底部。内容足够长，会一直出现纵向滚动条。
      </p>
      <p v-for="n in 100" :key="n" class="frame-demo__row">第 {{ n }} 行内容，用于撑出滚动条。</p>
    </section>
  </common-frame>
</template>

<script setup lang="ts">
import { useTabRouter } from 'vue-stack-tabs'

const { backward, forward } = useTabRouter()

/** 无页头时没有 el-page-header 的返回箭头，靠这里回到查询框架 */
function goBack() {
  if (!backward(1)) {
    forward({ path: '/demo/search-demo' })
  }
}
</script>

<style scoped lang="scss">
.frame-demo {
  padding: var(--density-gap) 0;

  &__toolbar {
    margin-bottom: var(--density-gap);
  }

  &__lead {
    margin-bottom: var(--density-gap);
    color: var(--fg-muted);
    line-height: 1.75;
  }

  &__row {
    padding: 4px 0;
    color: var(--fg-default);
  }
}
</style>
