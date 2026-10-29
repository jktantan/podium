<template>
  <el-config-provider :size="elSize" :locale="elLocale">
    <div>
      <NuxtRouteAnnouncer />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { applyVxeLocale } from '~~/i18n/vendors/vxe-table'

/**
 * 外观状态在这里初始化一次：
 * - ElConfigProvider 消费全局尺寸与语言包
 * - useAppearance 内部同步 <html> 的 .dark / data-density / --brand-seed
 * - useLocale 把当前语言映射成 Element Plus / vue-stack-tabs 的语言
 * - VXE 只有命令式的 setLanguage，在这里 watch 当前语言
 *
 * VXE 的全局 size 配置不是响应式的，已挂载的表格不会跟着变。
 * 它在 useSize 里优先读取 inject('xeSizeInfo')，这里 provide 一个 computed，
 * 所有 VXE 组件就能随密度实时切换，不需要重建表格实例。
 */
const { elSize, vxeSize } = useAppearance()
const { currentLocale, elLocale } = useLocale()

watch(currentLocale, (value) => applyVxeLocale(value), { immediate: true })

// html lang 跟随界面语言，屏幕阅读器与浏览器自动翻译都依赖它
useHead({ htmlAttrs: { lang: currentLocale } })

provide('xeSizeInfo', vxeSize)
</script>
