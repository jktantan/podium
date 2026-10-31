<template>
  <section class="page">
    <p class="page__eyebrow">Detail</p>
    <h1>{{ t('detail.title') }}</h1>

    <i18n-t keypath="detail.lead" tag="p" class="page__lead" scope="global">
      <template #code><code>useTabRouter().forward()</code></template>
    </i18n-t>

    <div class="page__actions">
      <el-button type="primary" @click="goBack">{{ t('detail.back') }}</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTabRouter } from 'vue-stack-tabs'

const { backward } = useTabRouter()
const { t } = useI18n()

function goBack() {
  backward(1)
}
</script>
