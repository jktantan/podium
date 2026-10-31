<template>
  <Error404 />
</template>

<script setup lang="ts">
/**
 * Demo 目录的兜底路由：菜单里的「404 示例」指向 /demo/404-demo，
 * 没有对应页面文件，由这里渲染页签内的 404。
 *
 * admin 目录也有自己的 catch-all；生产构建会整体移除 /demo 路由，
 * 所以这段兜底不会影响正式页面。
 */
const { t } = useI18n()

useHead({
  title: computed(() => `${t('error.notFoundTitle')} | Podium`)
})
</script>
