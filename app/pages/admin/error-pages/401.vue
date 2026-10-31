<template>
  <div class="error-demo">
    <Error401 />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({ title: computed(() => `${t('error.unauthorizedTitle')} | Podium`) })
</script>

<style scoped lang="scss">
.error-demo {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>
