<template>
  <common-frame :header="{ title: '返回', content: '有头有尾' }" @back="goBack">
    <section class="frame-demo">
      <div class="frame-demo__toolbar">
        <el-button @click="goBack">返回查询框架</el-button>
      </div>

      <p class="frame-demo__lead">
        默认页头 + 页脚：页头吸顶、页脚吸底，上下阴影样式与页签一致；滚到顶部时页头阴影消失，
        滚到底部时页脚阴影消失。内容足够长，会一直出现纵向滚动条。
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

/** 在当前页签内返回；没有页内导航栈（直接打开页面）时回到查询框架 */
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
