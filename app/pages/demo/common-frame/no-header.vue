<template>
  <common-frame :header="false">
    <section class="frame-demo">
      <div class="frame-demo__toolbar">
        <el-button @click="goBack">返回查询框架</el-button>
      </div>

      <p class="frame-demo__lead">
        无页头 + 有页脚：页脚继续吸底，阴影样式与页签一致并随滚动位置显隐；顶部阴影交还给页签自身。
        内容足够长，会一直出现纵向滚动条。
      </p>
      <p v-for="n in 100" :key="n" class="frame-demo__row">第 {{ n }} 行内容，用于撑出滚动条。</p>
    </section>

    <template #footer>
      <el-button>取消</el-button>
      <el-button type="primary">确定</el-button>
    </template>
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
