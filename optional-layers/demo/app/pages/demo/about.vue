<template>
  <CommonFrame :header="false" :footer="false">
    <p class="page__eyebrow">About</p>
    <h1>{{ t('about.title') }}</h1>
    <p class="page__lead">{{ t('about.lead') }}</p>

    <div class="demo-box">
      <label for="note">{{ t('about.inputLabel') }}</label>
      <el-input id="note" v-model="note" :placeholder="t('about.inputPlaceholder')" />
    </div>

    <p class="page__lead" style="margin-top: 24px">
      {{ t('about.stackLead') }}
    </p>

    <div class="page__actions">
      <el-button type="primary" @click="openDetail">{{ t('about.forward') }}</el-button>
      <el-button @click="openSettings">{{ t('about.openSettings') }}</el-button>
    </div>
  </CommonFrame>
</template>

<script setup lang="ts">
import { useTabActions, useTabRouter } from 'vue-stack-tabs'

const note = ref('')
const { forward } = useTabRouter()
const { openTab } = useTabActions()
const { t } = useI18n()

function openDetail() {
  forward({ path: '/demo/detail', query: { from: 'about' } })
}

function openSettings() {
  void openTab({ id: 'settings', title: t('nav.settings'), path: '/demo/settings' })
}
</script>

<style scoped lang="scss">
.demo-box {
  display: grid;
  gap: 10px;
  margin-top: 24px;
  padding: 20px;
  border: 1px dashed var(--brand-primary-border);
  border-radius: var(--el-border-radius-base);
  background: var(--bg-page);
  color: var(--fg-secondary);
  font-size: 14px;
}
</style>
