<template>
  <Error404 />
</template>

<script setup lang="ts">
/**
 * Catch-all：只兜底“没有匹配到任何页面路由”的路径，已有页面路由优先。
 * 401/403/500 等错误由 error.vue 或明确路由处理，不会进入这里。
 */
const { t } = useI18n()

useHead({
  title: computed(() => `${t('error.notFoundTitle')} | Podium`)
})
</script>
