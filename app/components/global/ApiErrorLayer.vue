<template>
  <span class="hidden" aria-hidden="true" />
</template>

<script setup lang="ts">
import type { LayerInstance } from 'vue-lite-layer'
import type { ApiErrorState } from '~/composables/useApiError'
import { useApiError } from '~/composables/useApiError'
import ApiErrorContent from '~/components/global/ApiErrorContent.vue'

/**
 * 全局 API 错误弹层。
 *
 * 请求层不能直接调用 useLayer()（异步回调里没有组件上下文），
 * 所以由这个组件消费错误总线，在组件 setup 中打开 vue-lite-layer：
 * - 401：body 顶级弹框，唯一、不可关闭，确认后登出；
 * - 普通错误：优先弹在当前 tab 内容区，非 tab 页面回退到 body；
 * - 同一时刻只保留一个弹框，401 优先。
 */
const { state } = useApiError()
const { open } = useLayer()
const { t } = useI18n()

let current: LayerInstance | null = null

function resolveTeleport(authExpired: boolean): string | HTMLElement {
  if (authExpired || !import.meta.client) {
    return 'body'
  }

  return document.querySelector<HTMLElement>('.stack-tab__container') ?? 'body'
}

async function closeCurrent() {
  if (!current) {
    return
  }

  const layer = current
  current = null
  layer.close()

  try {
    await layer.closed
  } catch {
    // 弹层已被外部关闭时忽略
  }
}

async function openFor(next: ApiErrorState) {
  // 401 已显示时，普通错误只记录不弹框
  if (current?.uniqueGroup === 'api-auth-expired' && !next.authExpired) {
    return
  }

  await closeCurrent()

  const authExpired = next.authExpired
  const message = authExpired
    ? `${t('error.sessionExpired')}${t('error.relogin')}`
    : next.error.reason || t('error.unknown')

  const layer = open({
    teleport: resolveTeleport(authExpired),
    uniqueGroup: authExpired ? 'api-auth-expired' : 'api-error',
    title: authExpired ? t('error.sessionExpiredTitle') : t('error.title'),
    content: ApiErrorContent,
    props: {
      message,
      confirmText: authExpired ? t('error.backToLogin') : t('error.confirm'),
      authExpired
    },
    size: { width: '420px', height: '220px' },
    footer: false,
    max: false,
    min: false,
    // 401 只能通过内容区的确认按钮（programmatic）关闭
    close: !authExpired,
    shadeClose: !authExpired,
    closeOnEsc: !authExpired,
    beforeClose: authExpired ? ({ reason }) => reason === 'programmatic' : undefined
  })

  current = layer

  layer?.closed.then(
    () => {
      if (current === layer) {
        current = null
      }
    },
    () => {
      if (current === layer) {
        current = null
      }
    }
  )
}

watch(
  state,
  (next) => {
    if (!next) {
      void closeCurrent()
      return
    }

    void openFor(next)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  void closeCurrent()
})
</script>
