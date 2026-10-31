<script setup lang="ts">
/**
 * 500 错误页：仅用于后台页签内（全屏 500 由 app/error.vue 统一处理）。
 *
 * 修正点：
 * - 不再引用不存在的 assets/images/giphy.gif（原项目资源未一起复制）；
 * - error.cause 可能是 undefined，访问前先做安全取值；
 * - 高度跟随容器，不写死 100vh；
 * - 文案改走 i18n，按钮提供刷新与返回首页。
 */
import { useTabActions, useTabRouter } from 'vue-stack-tabs'
import { css as inconsolata } from '~/assets/fonts/Inconsolata.ttf'
import { css as titleFont } from '~/assets/fonts/PangMenZhengDao3.ttf'

interface ErrorLike {
  statusCode?: number | string
  statusMessage?: string
  message?: string
  cause?: unknown
}

const props = withDefaults(
  defineProps<{
    error?: ErrorLike
    fullscreen?: boolean
  }>(),
  {
    error: undefined,
    fullscreen: false
  }
)

const { t } = useI18n()
const { currentLocale } = useLocale()
const { tabs, refreshTab } = useTabActions()
const { backward } = useTabRouter()

/** 当前页签的页面栈只有一页时，没有“上一页”可返回 */
const activeTab = computed(() => tabs.value.find((tab) => tab.active))
const hasPreviousPage = computed(() => (activeTab.value?.pages.size() ?? 0) > 1)

/**
 * PangMenZhengDao 只有简体字形，繁体（務/異 等）会逐字回退到系统字体，
 * 标题会出现半截标题体、半截黑体的混排。繁体下整体换成系统字体。
 */
const titleFontFamily = computed(() =>
  currentLocale.value === 'zh-TW'
    ? "'Microsoft JhengHei', 'PingFang TC', 'Microsoft YaHei', sans-serif"
    : titleFont.family
)

const statusCode = computed(() => Number(props.error?.statusCode) || 500)

const errorMessage = computed(() => {
  const cause = props.error?.cause

  if (cause instanceof Error && cause.message) {
    return cause.message
  }

  if (cause && typeof cause === 'object' && 'message' in cause) {
    const message = (cause as { message?: unknown }).message

    if (typeof message === 'string' && message) {
      return message
    }
  }

  return props.error?.message || props.error?.statusMessage || ''
})

function reloadPage() {
  // 页签内刷新当前 Tab；没有页签上下文时才退回整页刷新
  if (activeTab.value) {
    refreshTab(activeTab.value.id)
    return
  }

  if (import.meta.client) {
    window.location.reload()
  }
}

function goBack() {
  backward(1)
}
</script>

<template>
  <div
    class="error-500"
    :class="{ 'error-500--fullscreen': fullscreen }"
    :style="{
      '--error-500-font': inconsolata.family,
      '--error-500-title-font': titleFontFamily
    }"
  >
    <div class="noise" aria-hidden="true"></div>
    <div class="overlay" aria-hidden="true"></div>

    <div class="terminal">
      <h1>
        {{ t('error.serverTitle') }} <span class="errorcode">{{ statusCode }}</span>
      </h1>
      <p class="output">{{ t('error.serverSubtitle') }}</p>
      <p v-if="errorMessage" class="output">{{ errorMessage }}</p>

      <div class="actions">
        <button type="button" @click="reloadPage">{{ t('error.refreshPage') }}</button>
        <button v-if="hasPreviousPage" type="button" @click="goBack">
          {{ t('error.backPrevious') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
$green: rgb(128 255 128 / 0.8);

.error-500 {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 320px;
  overflow: auto;
  color: $green;
  font-size: 1.5rem;
  font-family: var(--error-500-font), Inconsolata, 'Microsoft YaHei', Helvetica, sans-serif;
  text-shadow:
    0 0 1ex rgb(51 255 51 / 1),
    0 0 2px rgb(255 255 255 / 0.8);
  background-color: #000;
  background-image: radial-gradient(#11581e, #041607);

  &--fullscreen {
    height: 100dvh;
  }
}

.noise {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  background-image: radial-gradient(rgb(0 255 0 / 0.08) 1px, transparent 1px);
  background-size: 3px 3px;
  opacity: 0.35;
  pointer-events: none;
}

.overlay {
  position: absolute;
  z-index: 1;
  inset: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    180deg,
    rgb(0 0 0 / 0) 0,
    rgb(0 0 0 / 0.3) 50%,
    rgb(0 0 0 / 0) 100%
  );
  background-size: auto 4px;
  pointer-events: none;
}

.overlay::before {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  background-image: linear-gradient(
    0deg,
    transparent 0%,
    rgb(32 128 32 / 0.2) 2%,
    rgb(32 128 32 / 0.8) 3%,
    rgb(32 128 32 / 0.2) 3%,
    transparent 100%
  );
  background-repeat: no-repeat;
  animation: scan 7.5s linear 0s infinite;
  content: '';
  pointer-events: none;
}

@keyframes scan {
  0% {
    background-position: 0 -100vh;
  }

  35%,
  100% {
    background-position: 0 100vh;
  }
}

.terminal {
  position: relative;
  z-index: 2;
  box-sizing: border-box;
  max-width: 100%;
  min-height: 100%;
  padding: clamp(24px, 6vw, 4rem);
}

h1 {
  margin: 0;
  padding: 10px 0;
  font-family: var(--error-500-title-font), 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.5rem, 4vw, 3rem);
  text-transform: uppercase;
}

.output {
  padding: 10px 0;
  color: $green;
  font-size: clamp(0.95rem, 1.6vw, 1.5rem);
  text-shadow:
    0 0 1px rgb(51 255 51 / 0.4),
    0 0 2px rgb(255 255 255 / 0.8);
  overflow-wrap: anywhere;
}

.output::before {
  content: '> ';
}

.errorcode {
  color: white;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 24px;

  button {
    padding: 8px 18px;
    color: $green;
    font: inherit;
    font-size: 0.9rem;
    background: transparent;
    border: 1px solid rgb(128 255 128 / 0.6);
    border-radius: 4px;
    cursor: pointer;
    transition:
      color 150ms ease,
      background-color 150ms ease;

    &:hover {
      color: #041607;
      background: rgb(128 255 128 / 0.85);
    }

    &:focus-visible {
      outline: 2px solid white;
      outline-offset: 2px;
    }
  }
}
</style>
