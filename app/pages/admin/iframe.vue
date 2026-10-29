<template>
  <IFrame />
</template>

<script setup lang="ts">
/**
 * vue-stack-tabs 的 iframe 占位路由。
 * 组件本身不渲染内容，真实内容由 <VueStackTabs> 内的 <iframe> 呈现。
 * 这个路由必须存在，iframe 页签才能正常匹配。
 */
import { IFrame } from 'vue-stack-tabs'
</script>
