<template>
  <section class="page">
    <p class="page__eyebrow">Settings</p>
    <h1>{{ t('settings.title') }}</h1>
    <p class="page__lead">{{ t('settings.lead') }}</p>

    <el-descriptions class="info-list" :column="1" border label-width="140px">
      <el-descriptions-item :label="t('settings.account')">{{ user }}</el-descriptions-item>
      <el-descriptions-item :label="t('settings.layout')">
        {{ t('settings.layoutDefault') }}
      </el-descriptions-item>
      <el-descriptions-item :label="t('settings.loginLayout')">
        {{ t('settings.layoutAuth') }}
      </el-descriptions-item>
    </el-descriptions>

    <div class="page__actions">
      <el-button @click="logoutToLogin">{{ t('settings.logout') }}</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
const { user } = useAuth()
const logoutToLogin = useLogout()
const { t } = useI18n()
</script>

<style scoped lang="scss">
.info-list {
  max-width: 560px;
  margin-top: 28px;
}
</style>
