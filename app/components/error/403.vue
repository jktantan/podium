<script setup lang="ts">
/**
 * 403 错误页：仅用于后台页签内（全屏错误由 app/error.vue 统一处理）。
 * 原样式按 384px 数字写死，页签高度较小时会溢出，这里改为跟随容器缩放。
 */
import { useTabActions, useTabRouter } from 'vue-stack-tabs'
import { css as poppins } from '~/assets/fonts/Poppins.ttf?subsets'
import { css as titleFont } from '~/assets/fonts/PangMenZhengDao3.ttf?subsets'
import { css as titleFontTW } from '~/assets/fonts/NanoByongGyeHei-Regular.ttf?subsets'

const props = withDefaults(
  defineProps<{
    /** 自定义说明文案，默认取 i18n */
    message?: string
  }>(),
  {
    message: undefined
  }
)

const { t } = useI18n()
const { currentLocale } = useLocale()
const { tabs } = useTabActions()
const { backward } = useTabRouter()

const description = computed(() => props.message || t('error.forbiddenSubtitle'))

/** 当前页签的页面栈只有一页时，没有“上一页”可返回 */
const activeTab = computed(() => tabs.value.find((tab) => tab.active))
const hasPreviousPage = computed(() => (activeTab.value?.pages.size() ?? 0) > 1)

/**
 * PangMenZhengDao 只有简体字形，繁体（務/異/權 等）会逐字回退到系统字体，
 * 标题会出现半截标题体、半截黑体的混排。繁体统一换成同样风格的
 * NanoByongGyeHei，简体与英文仍用 PangMenZhengDao。
 */
const titleFontFamily = computed(() =>
  currentLocale.value === 'zh-TW' ? titleFontTW.family : titleFont.family
)

function goBack() {
  backward(1)
}
</script>

<template>
  <div
    class="error-403"
    :style="{
      '--error-403-font': poppins.family,
      '--error-403-title-font': titleFontFamily
    }"
  >
    <h1 class="error-403__code" :data-label="t('error.forbiddenBadge')">
      <span>403</span>
    </h1>

    <p class="error-403__description">{{ description }}</p>

    <el-button v-if="hasPreviousPage" type="primary" plain @click="goBack">
      {{ t('error.backPrevious') }}
    </el-button>
  </div>
</template>

<style scoped lang="scss">
$bg: #181617;
$accent: #f6d200;

.error-403 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  width: 100%;
  height: 100%;
  min-height: 320px;
  padding: 24px;
  overflow: hidden;
  font-family: var(--error-403-font), 'Microsoft YaHei', sans-serif;
  background-image: linear-gradient(
    45deg,
    $accent 25%,
    $bg 25%,
    $bg 50%,
    $accent 50%,
    $accent 75%,
    $bg 75%,
    $bg 100%
  );
  user-select: none;

  &__code {
    position: relative;
    margin: 0;
    font-size: clamp(88px, 32vmin, 320px);
    line-height: 0.7;
    text-transform: uppercase;
    background: repeating-linear-gradient(45deg, $accent, $accent 10px, $bg 10px, $bg 20px);
    background-clip: text;
    -webkit-text-fill-color: transparent;

    // 黄色斜纹卡片
    &::before {
      position: absolute;
      top: 50%;
      left: 50%;
      padding: 0.18em 0.34em;
      background: repeating-linear-gradient(45deg, $accent, $accent 10px, $bg 10px, $bg 20px);
      box-shadow: 0 0 10px $bg;
      transform: translate(-50%, -50%) rotate(20deg);
      content: '';
    }

    // 徽标文字
    &::after {
      position: absolute;
      top: 50%;
      left: 50%;
      padding: 0.9em 1.6em;
      color: $bg;
      font-weight: bold;
      font-size: clamp(14px, 1.6vmin, 24px);
      text-transform: none;
      background-color: $accent;
      border-radius: 10px;
      transform: translate(-50%, -50%) rotate(20deg);
      content: attr(data-label);
      font-family: var(--error-403-title-font), 'Microsoft YaHei', sans-serif;
      -webkit-text-fill-color: $bg;
    }

    // 数字上的两个小圆点
    span::before,
    span::after {
      position: absolute;
      z-index: 3;
      width: 8px;
      height: 8px;
      color: #757575;
      background: #757575;
      border-radius: 50%;
      box-shadow: 0 0 0 0;
      content: '';
    }

    span::before {
      top: 6%;
      left: 37%;
      box-shadow: 0 8px 0 0 #757575;
    }

    span::after {
      top: 40%;
      right: 34%;
      box-shadow: 0 8px 0 0 #757575;
    }
  }

  &__description {
    max-width: 460px;
    margin: 0;
    color: #fff;
    font-size: 14px;
    line-height: 1.6;
    text-align: center;
    text-shadow: 0 1px 6px rgba($bg, 0.8);
  }
}
</style>
