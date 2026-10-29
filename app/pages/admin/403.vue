<template>
  <AppErrorState :status-code="403" />
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: computed(() => `${t('error.forbiddenTitle')} | Podium`)
})
</script>
