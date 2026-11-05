<script setup lang="ts">
/**
 * 401 错误页。
 *
 * 两种使用场景：
 * - fullscreen：未登录访问受保护路由时由 app/error.vue 全屏渲染；
 * - 默认（容器填充）：在页签内演示 / 业务页复用，高度跟随父容器。
 *
 * 原组件依赖 parallax-js（项目未安装），这里移除该依赖，
 * 只保留纯 CSS 动效，避免新增运行时依赖。
 */
import Parallax from 'parallax-js'
import { css as barlowBold } from '~/assets/fonts/Barlow-Bold.ttf?subsets'

const props = withDefaults(
  defineProps<{
    fullscreen?: boolean
    /** 自定义说明文案，默认取 i18n */
    message?: string
  }>(),
  {
    fullscreen: false,
    message: undefined
  }
)

const { t } = useI18n()

/**
 * 页签内的 401 要走完整登出流程（清页签、清会话、退出登录）；
 * 全屏 401 是未登录状态下的错误页，没有页签上下文，
 * 直接 clearError 回登录页即可，不能调用依赖 tabs 的 useLogout。
 */
const logoutToLogin = props.fullscreen ? null : useLogout()

const description = computed(() => props.message || t('error.unauthorizedSubtitle'))

/** parallax-js 的 scene：data-depth 决定各图层的移动幅度 */
const scene = ref<HTMLElement>()
let parallax: Parallax | null = null

onMounted(() => {
  if (!scene.value) {
    return
  }

  parallax = new Parallax(scene.value, { hoverOnly: false })
})

onBeforeUnmount(() => {
  parallax?.destroy()
  parallax = null
})

/**
 * 401 有两处入口：app/error.vue（全屏，payload.error 有值）
 * 和页签内演示页。前者必须走 clearError 清掉错误状态，
 * 后者直接回到登录页即可。
 */
async function returnToLogin() {
  if (props.fullscreen) {
    if (useNuxtApp().payload.error) {
      await clearError({ redirect: '/' })
      return
    }

    await navigateTo('/')
    return
  }

  await logoutToLogin?.()
}
</script>

<template>
  <section
    class="error-401"
    :class="{ 'error-401--fullscreen': fullscreen }"
    :style="{ '--error-401-font': barlowBold.family }"
  >
    <div ref="scene" class="error-401__scene" data-hover-only="false" aria-hidden="true">
      <div class="parallax-layer" data-depth="1.2">
        <div class="circle" />
      </div>

      <div class="parallax-layer" data-depth="0.9">
        <div class="one">
          <div class="content">
            <span class="piece" />
            <span class="piece" />
            <span class="piece" />
          </div>
        </div>
      </div>

      <div class="parallax-layer" data-depth="0.60">
        <div class="two">
          <div class="content">
            <span class="piece" />
            <span class="piece" />
            <span class="piece" />
          </div>
        </div>
      </div>

      <div class="parallax-layer" data-depth="0.40">
        <div class="three">
          <div class="content">
            <span class="piece" />
            <span class="piece" />
            <span class="piece" />
          </div>
        </div>
      </div>

      <div class="parallax-layer" data-depth="0.50">
        <p class="error-401__code">401</p>
        <p class="error-401__code error-401__code--ghost">401</p>
      </div>
    </div>

    <article class="error-401__text">
      <p>{{ description }}</p>
      <button type="button" @click="returnToLogin">
        {{ t('error.backToLogin') }}
      </button>
    </article>
  </section>
</template>

<style scoped lang="scss">
$m-01: #fb8a8a;
$bg-01: #695681;
$bg-02: #36184f;
$bg-03: #32243e;
$g-01: linear-gradient(90deg, #ffedc0 0%, #ff9d87 100%);
$g-02: linear-gradient(90deg, #8077ea 13.7%, #eb73ff 94.65%);
$circle-shadow:
  inset 5px 20px 40px rgba($bg-02, 0.25),
  inset 5px 0 5px rgba($bg-03, 0.3),
  inset 5px 5px 20px rgba($bg-03, 0.25),
  2px 2px 5px rgb(255 255 255 / 0.2);

.error-401 {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 360px;
  overflow: hidden;
  font-family: 'Microsoft YaHei', '微软雅黑', sans-serif;
  background: $bg-01;
  place-items: center;
  user-select: none;

  &--fullscreen {
    height: 100dvh;
  }

  &__scene {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  /*
   * parallax-js 会直接给带 data-depth 的元素写内联
   * position/left/top/display，覆盖掉布局样式。
   * 所以视差只作用在这层空壳上，内部的 .one/.circle/数字
   * 保留自己的绝对定位与居中规则。
   */
  .parallax-layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  // 所有装饰层共用同一套居中定位
  .one,
  .two,
  .three,
  .circle {
    position: absolute;
    inset: 0;
    display: grid;
    pointer-events: none;
    place-items: center;

    .content {
      /* 作为 grid item 由 place-items 居中；同时作为内部 piece 的定位上下文 */
      position: relative;
      width: min(600px, 86%);
      aspect-ratio: 1;
      animation: content 0.8s cubic-bezier(1, 0.06, 0.25, 1) backwards;

      @keyframes content {
        0% {
          width: 0;
        }
      }

      .piece {
        position: absolute;
        z-index: 1;
        display: flex;
        width: 200px;
        height: 80px;
        border-radius: 80px;
        animation: piece-left 8s cubic-bezier(1, 0.06, 0.25, 1) infinite both;

        @keyframes piece-left {
          50% {
            left: 80%;
            width: 10%;
          }
        }

        @keyframes piece-right {
          50% {
            right: 80%;
            width: 10%;
          }
        }
      }
    }
  }

  // 大圆
  .circle::before {
    position: absolute;
    top: 50%;
    left: 50%;
    width: min(800px, 92%);
    aspect-ratio: 1;
    background-color: rgba($bg-02, 0.2);
    border-radius: 100%;
    box-shadow: $circle-shadow;
    transform: translate(-50%, -50%);
    animation: circle 0.8s cubic-bezier(1, 0.06, 0.25, 1) backwards;
    content: '';

    @keyframes circle {
      0% {
        width: 0;
        height: 0;
      }
    }
  }

  // 容器 1
  .one .content {
    &::before {
      position: absolute;
      width: min(600px, 100%);
      aspect-ratio: 1;
      background-color: rgba($bg-02, 0.3);
      border-radius: 100%;
      box-shadow: $circle-shadow;
      animation: circle 0.8s 0.4s cubic-bezier(1, 0.06, 0.25, 1) backwards;
      content: '';
    }

    .piece {
      background: $g-02;

      &:nth-child(1) {
        top: 18%;
        right: 15%;
        width: 120px;
        height: 30px;
        animation-name: piece-right;
        animation-delay: 0.5s;
      }

      &:nth-child(2) {
        top: 45%;
        left: 15%;
        width: 150px;
        height: 50px;
        animation-name: piece-left;
        animation-delay: 1s;
      }

      &:nth-child(3) {
        top: 75%;
        left: 10%;
        width: 70px;
        height: 20px;
        animation-name: piece-left;
        animation-delay: 1.5s;
      }
    }
  }

  // 容器 2
  .two .content {
    .piece {
      background: $g-01;

      &:nth-child(1) {
        top: 25%;
        left: 0%;
        width: 120px;
        height: 40px;
        animation-name: piece-left;
        animation-delay: 2s;
      }

      &:nth-child(2) {
        top: 35%;
        right: 15%;
        width: 180px;
        height: 50px;
        animation-name: piece-right;
        animation-delay: 2.5s;
      }

      &:nth-child(3) {
        top: 80%;
        right: 10%;
        width: 160px;
        height: 20px;
        animation-name: piece-right;
        animation-delay: 3s;
      }
    }
  }

  // 容器 3
  .three .content {
    .piece {
      background: $m-01;

      &:nth-child(1) {
        top: 35%;
        left: 25%;
        width: 80px;
        height: 20px;
        animation-name: piece-left;
        animation-delay: 3.5s;
      }

      &:nth-child(2) {
        top: 55%;
        right: 10%;
        width: 140px;
        height: 40px;
        animation-name: piece-right;
        animation-delay: 4s;
      }

      &:nth-child(3) {
        top: 68%;
        left: 40%;
        width: 80px;
        height: 20px;
        animation-name: piece-left;
        animation-delay: 4.5s;
      }
    }
  }

  // 401 数字
  &__code {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    color: white;
    font-family: var(--error-401-font), 'Microsoft YaHei', sans-serif;
    font-weight: 700;
    font-size: clamp(72px, 20vmin, 200px);
    letter-spacing: 4px;
    animation: anime-401 0.6s cubic-bezier(0.3, 0.8, 1, 1.05) both;
    animation-delay: 1.2s;
    place-items: center;

    @keyframes anime-401 {
      0% {
        transform: scale(10) skew(20deg, 20deg);
        opacity: 0;
      }
    }

    &--ghost {
      z-index: 1;
      color: $bg-02;
      opacity: 0.8;
      filter: blur(10px);
      animation-delay: 1s;
    }
  }

  // 文案与按钮
  &__text {
    position: absolute;
    z-index: 4;
    right: 16px;
    bottom: 7%;
    left: 16px;
    display: grid;
    overflow: visible;
    place-items: center;
    pointer-events: none;

    p {
      max-width: 480px;
      margin: 0 0 24px;
      color: white;
      font-size: 16px;
      line-height: 1.6;
      letter-spacing: 0.6px;
      text-align: center;
      text-shadow: 6px 6px 10px $bg-03;
    }

    button {
      z-index: 3;
      height: 40px;
      padding: 0 30px;
      color: $bg-01;
      font-family: inherit;
      font-weight: 600;
      font-size: 12px;
      line-height: 1;
      text-transform: uppercase;
      appearance: none;
      background-color: white;
      border: 0;
      border-radius: 50px;
      box-shadow:
        0 16px 24px rgba($bg-02, 0.55),
        0 6px 12px rgba($bg-02, 0.4);
      cursor: pointer;
      pointer-events: auto;
      transition: all 0.3s ease;

      &:hover {
        color: white;
        background: $m-01;
        box-shadow:
          0 12px 20px rgba($bg-02, 0.5),
          0 5px 12px rgba($bg-02, 0.35);
        transform: translateY(5px);
      }

      &:focus-visible {
        outline: 2px solid white;
        outline-offset: 3px;
      }
    }
  }

  // 高度不足时收紧留白，避免按钮被裁掉
  @media (height <= 560px) {
    &__text {
      bottom: 4%;

      p {
        margin-bottom: 14px;
        font-size: 14px;
      }
    }
  }
}
</style>
