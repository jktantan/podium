<template>
  <div class="error-page">
    <div class="error-page__glow error-page__glow--primary" aria-hidden="true" />
    <div class="error-page__glow error-page__glow--info" aria-hidden="true" />

    <main class="error-page__panel">
      <el-result :icon="resultIcon" :title="resultTitle" :sub-title="resultSubTitle">
        <template #extra>
          <p class="error-page__code">
            {{ t('error.code', { code: statusCode }) }}
          </p>

          <div class="error-page__actions">
            <el-button v-if="showHomeAction" type="primary" @click="goHome">
              {{ t('error.backHome') }}
            </el-button>
            <el-button
              v-if="showLoginAction"
              :type="statusCode === 401 ? 'primary' : undefined"
              @click="goLogin"
            >
              {{ loginActionLabel }}
            </el-button>
            <el-button v-if="showReloadAction" @click="reloadPage">
              {{ t('error.refreshPage') }}
            </el-button>
          </div>
        </template>
      </el-result>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useTabActions } from 'vue-stack-tabs'

interface AppErrorLike {
  statusCode?: number
  statusMessage?: string
  message?: string
}

const props = defineProps<{ error: AppErrorLike }>()

const route = useRoute()
const router = useRouter()
const { isLoggedIn, logout } = useAuth()
const { reset } = useTabActions()
const { t } = useI18n()

const statusCode = computed(() => Number(props.error?.statusCode) || 500)

const resultIcon = computed(() =>
  statusCode.value === 401 || statusCode.value === 404 ? 'warning' : 'error'
)

const resultTitle = computed(() => {
  switch (statusCode.value) {
    case 401:
      return t('error.unauthorizedTitle')
    case 403:
      return t('error.forbiddenTitle')
    case 404:
      return t('error.notFoundTitle')
    default:
      return t('error.serverTitle')
  }
})

const resultSubTitle = computed(() => {
  switch (statusCode.value) {
    case 401:
      return t('error.unauthorizedSubtitle')
    case 403:
      return props.error?.message || t('error.forbiddenSubtitle')
    case 404:
      return t('error.notFoundSubtitle')
    default:
      return t('error.serverSubtitle')
  }
})

const showHomeAction = computed(() => statusCode.value !== 401)
const showLoginAction = computed(() => statusCode.value === 401 || statusCode.value === 403)
const showReloadAction = computed(() => statusCode.value >= 500)
const loginActionLabel = computed(() =>
  statusCode.value === 403 ? t('error.switchAccount') : t('error.backToLogin')
)

useHead({
  title: computed(() => `${resultTitle.value} | Podium`)
})

function buildLoginTarget() {
  if (route.path === '/') {
    return '/'
  }

  const query = { ...route.query }
  delete query.__tab

  const fullPath = router.resolve({
    path: route.path,
    query,
    hash: route.hash
  }).fullPath

  return `/?redirect=${encodeURIComponent(fullPath)}`
}

function goHome() {
  void clearError({ redirect: isLoggedIn.value ? '/admin' : '/' })
}

function reloadPage() {
  if (import.meta.client) {
    window.location.reload()
  }
}

async function goLogin() {
  reset()

  if (import.meta.client) {
    sessionStorage.removeItem('stacktab-active-tab')
  }

  await logout()
  await clearError({ redirect: buildLoginTarget() })
}
</script>

<style scoped lang="scss">
.error-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  padding: 2.5rem 1rem;
  overflow: hidden;
  place-items: center;
  background: var(--bg-inverse);

  &__glow {
    position: absolute;
    width: 340px;
    height: 340px;
    border-radius: 9999px;
    filter: blur(90px);
    opacity: 0.45;
    pointer-events: none;

    &--primary {
      top: -120px;
      right: 8%;
      background: var(--brand-primary-light);
    }

    &--info {
      bottom: -140px;
      left: 4%;
      background: var(--info);
    }
  }

  &__panel {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 32rem;
    padding: 2rem;
    border-radius: var(--radius-xl);
    background: var(--bg-surface-translucent);
    box-shadow: var(--elevation-modal);
  }

  &__code {
    display: flex;
    width: fit-content;
    margin: 0 auto 1.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--brand-primary) 10%, transparent);
    color: var(--brand-primary);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }
}
</style>
