<template>
  <PermissionGuard permission="permission-demo:view">
    <section class="page">
      <p class="page__eyebrow">Permission</p>
      <h1>{{ t('permissionDemo.title') }}</h1>

      <i18n-t keypath="permissionDemo.lead" tag="p" class="page__lead" scope="global">
        <template #permission><code>permission-demo:view</code></template>
        <template #admin><strong>admin</strong></template>
        <template #viewer><strong>viewer</strong></template>
      </i18n-t>

      <el-alert
        class="mt-6"
        type="success"
        :closable="false"
        show-icon
        :title="t('permissionDemo.alertTitle')"
        :description="t('permissionDemo.alertDescription')"
      />
    </section>
  </PermissionGuard>
</template>

<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: computed(() => `${t('permissionDemo.title')} | Podium`)
})
</script>
