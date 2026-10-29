<template>
  <div class="layer-confirm flex h-full flex-col gap-4">
    <p class="layer-confirm__message m-0">{{ message }}</p>
    <div class="flex justify-end gap-3 mt-auto">
      <el-button @click="handleCancel">{{ cancelText }}</el-button>
      <el-button type="primary" @click="handleOk">{{ okText }}</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

/**
 * 自定义确认弹层内容。
 *
 * 默认 Footer 的按钮只发送事件、不会关闭弹层；内容组件在完成业务动作后
 * 自己调用 resolveOk / resolveCancel 与 close()。这里用 Element Plus 按钮
 * 重写底部操作区，并关闭库的默认 Footer。
 */
defineProps<{
  message: string
  okText: string
  cancelText: string
}>()

const { resolveOk, resolveCancel, close } = useLayerEvent()

function handleOk() {
  resolveOk()
  close()
}

function handleCancel() {
  resolveCancel()
  close()
}
</script>

<style scoped>
/*
 * 文案跟随 Element Plus 的密度字号（--el-font-size-base），
 * Tailwind 没有对应映射，保留在 scoped 样式中。
 */
.layer-confirm__message {
  color: var(--el-text-color-regular);
  font-size: var(--el-font-size-base);
  line-height: 1.6;
}
</style>
