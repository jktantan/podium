<template>
  <div class="error-demo">
    <Error404 />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({ title: computed(() => `${t('error.notFoundTitle')} | Podium`) })
</script>

<style scoped lang="scss">
.error-demo {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
