<template>
  <section class="captcha-demo">
    <header>
      <p class="captcha-demo__eyebrow">DropDownCaptcha</p>
      <h1 class="captcha-demo__title">{{ t('dropDownCaptchaDemo.title') }}</h1>
      <p class="captcha-demo__lead">{{ t('dropDownCaptchaDemo.lead') }}</p>
    </header>

    <div class="captcha-demo__card">
      <DropDownCaptcha
        v-if="bgImage && pieceImage"
        :bg-image="bgImage"
        :bg-width="bgWidth"
        :bg-height="bgHeight"
        :piece-image="pieceImage"
        :piece-width="pieceWidth"
        :piece-height="pieceHeight"
        :status="status"
        :messages="messages"
        @verify="handleVerify"
        @refresh="() => generate()"
        @drag-start="status = 'default'"
      />
    </div>

    <el-alert
      class="captcha-demo__tip"
      type="info"
      :closable="false"
      show-icon
      :title="t('dropDownCaptchaDemo.tip')"
    />

    <p class="captcha-demo__answer">
      {{ t('dropDownCaptchaDemo.answer', { x: answer.x, y: answer.y }) }}
    </p>
  </section>
</template>

<script lang="ts" setup>
type CaptchaStatus = 'default' | 'success' | 'error'

interface VerifyPayload {
  x: number
  y: number
}

const { t } = useI18n()

/** 模拟后台出图时的固定尺寸，父组件与组件使用同一套显示坐标 */
const bgWidth = 320
const bgHeight = 200
const pieceWidth = 60
const pieceHeight = 60
/** 父组件比对缺口坐标时的容差 */
const tolerance = 6

const bgImage = ref('')
const pieceImage = ref('')
const status = ref<CaptchaStatus>('default')
const answer = reactive({ x: 0, y: 0 })

const messages = computed(() => ({
  default: t('dropDownCaptchaDemo.messages.default'),
  success: t('dropDownCaptchaDemo.messages.success'),
  error: t('dropDownCaptchaDemo.messages.error')
}))

let verifyToken = 0

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.arcTo(x + width, y, x + width, y + radius, radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
  ctx.lineTo(x + radius, y + height)
  ctx.arcTo(x, y + height, x, y + height - radius, radius)
  ctx.lineTo(x, y + radius)
  ctx.arcTo(x, y, x + radius, y, radius)
  ctx.closePath()
}

/**
 * 模拟后台生成验证码图片：
 * 1. 画一张随机底图；
 * 2. 从完整底图上裁出拼图块；
 * 3. 在底图上挖出同形状的缺口。
 *
 * 缺口坐标只保留在父组件里，不传给验证码组件。
 *
 * @param keepStatus 为 true 时保留当前消息（验证失败后换图重试，红色提示不消失）
 */
function generate(keepStatus = false) {
  if (!import.meta.client) {
    return
  }

  verifyToken += 1

  if (!keepStatus) {
    status.value = 'default'
  }

  const bgCanvas = document.createElement('canvas')
  bgCanvas.width = bgWidth
  bgCanvas.height = bgHeight
  const bgCtx = bgCanvas.getContext('2d')

  if (!bgCtx) {
    return
  }

  const hue = Math.floor(Math.random() * 360)
  const gradient = bgCtx.createLinearGradient(0, 0, bgWidth, bgHeight)
  gradient.addColorStop(0, `hsl(${hue} 72% 58%)`)
  gradient.addColorStop(1, `hsl(${(hue + 70) % 360} 68% 38%)`)
  bgCtx.fillStyle = gradient
  bgCtx.fillRect(0, 0, bgWidth, bgHeight)

  for (let i = 0; i < 24; i += 1) {
    bgCtx.beginPath()
    bgCtx.globalAlpha = 0.08 + Math.random() * 0.18
    bgCtx.fillStyle = `hsl(${(hue + Math.random() * 360) % 360} 80% ${45 + Math.random() * 35}%)`
    bgCtx.arc(
      Math.random() * bgWidth,
      Math.random() * bgHeight,
      8 + Math.random() * 34,
      0,
      Math.PI * 2
    )
    bgCtx.fill()
  }

  bgCtx.globalAlpha = 1

  const gapX = 24 + Math.floor(Math.random() * (bgWidth - pieceWidth - 48))
  const gapY = 24 + Math.floor(Math.random() * (bgHeight - pieceHeight - 48))
  answer.x = gapX
  answer.y = gapY

  const pieceCanvas = document.createElement('canvas')
  pieceCanvas.width = pieceWidth
  pieceCanvas.height = pieceHeight
  const pieceCtx = pieceCanvas.getContext('2d')

  if (!pieceCtx) {
    return
  }

  // 先从完整底图裁出拼图块，避免裁到后面画上去的缺口
  pieceCtx.save()
  drawRoundedRect(pieceCtx, 0, 0, pieceWidth, pieceHeight, 10)
  pieceCtx.clip()
  pieceCtx.drawImage(bgCanvas, gapX, gapY, pieceWidth, pieceHeight, 0, 0, pieceWidth, pieceHeight)
  pieceCtx.restore()

  pieceCtx.save()
  drawRoundedRect(pieceCtx, 1, 1, pieceWidth - 2, pieceHeight - 2, 9)
  pieceCtx.lineWidth = 2
  pieceCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  pieceCtx.stroke()
  pieceCtx.restore()

  // 再在底图上画缺口
  bgCtx.save()
  drawRoundedRect(bgCtx, gapX, gapY, pieceWidth, pieceHeight, 10)
  bgCtx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  bgCtx.fill()
  bgCtx.lineWidth = 2
  bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  bgCtx.stroke()
  bgCtx.restore()

  bgImage.value = bgCanvas.toDataURL('image/png')
  pieceImage.value = pieceCanvas.toDataURL('image/png')
}

function handleVerify(payload: VerifyPayload) {
  const token = verifyToken

  // 模拟后台异步校验；期间组件处于等待状态
  window.setTimeout(() => {
    if (token !== verifyToken) {
      return
    }

    const passed =
      Math.abs(payload.x - answer.x) <= tolerance && Math.abs(payload.y - answer.y) <= tolerance

    if (passed) {
      status.value = 'success'
      return
    }

    // 验证失败：保留红色提示，换一组底图/拼图块让用户直接重试
    status.value = 'error'
    generate(true)
  }, 320)
}

onMounted(generate)

onBeforeUnmount(() => {
  verifyToken += 1
})
</script>

<style lang="scss" scoped>
.captcha-demo {
  max-width: 960px;
  margin: 0 auto;
  padding: 36px 32px 48px;

  &__eyebrow {
    margin: 0 0 10px;
    color: var(--brand-primary-light);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  &__title {
    margin: 0 0 12px;
    color: var(--fg-strong);
    font-size: 26px;
    line-height: 1.25;
  }

  &__lead {
    max-width: 640px;
    margin: 0;
    color: var(--fg-muted);
    font-size: 14px;
    line-height: 1.75;
  }

  &__card {
    display: inline-flex;
    padding: 16px;
    margin-top: 24px;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: 12px;
  }

  &__tip {
    max-width: 420px;
    margin-top: 20px;
  }

  &__answer {
    margin: 12px 0 0;
    color: var(--fg-subtle);
    font-size: 12px;
  }
}
</style>
