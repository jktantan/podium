<template>
  <div class="grid min-h-[60vh] place-items-center px-6 py-10">
    <el-result :icon="resultIcon" :title="resultTitle" :sub-title="resultSubTitle">
      <template #extra>
        <div class="flex flex-wrap justify-center gap-3">
          <el-button type="primary" @click="goHome">{{ t('error.backHome') }}</el-button>
          <el-button v-if="statusCode === 403" @click="logoutToLogin">
            {{ t('error.switchAccount') }}
          </el-button>
        </div>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useTabActions } from 'vue-stack-tabs'

const props = withDefaults(
  defineProps<{
    statusCode?: number
  }>(),
  {
    statusCode: 404
  }
)

const { openTab } = useTabActions()
const logoutToLogin = useLogout()
const { t } = useI18n()

const statusCode = computed(() => props.statusCode)
const resultIcon = computed(() => (statusCode.value === 404 ? 'warning' : 'error'))
const resultTitle = computed(() =>
  statusCode.value === 404 ? t('error.notFoundTitle') : t('error.forbiddenTitle')
)
const resultSubTitle = computed(() =>
  statusCode.value === 404 ? t('error.notFoundSubtitle') : t('error.forbiddenSubtitle')
)

function goHome() {
  void openTab({
    id: 'home',
    title: t('nav.home'),
    path: '/admin',
    closable: false,
    refreshable: true
  })
}
</script>
