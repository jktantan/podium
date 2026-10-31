<template>
  <div class="error-demo">
    <Error500 :error="{ statusCode: 500 }" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({ title: computed(() => `${t('error.serverTitle')} | Podium`) })
</script>

<style scoped lang="scss">
.error-demo {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
