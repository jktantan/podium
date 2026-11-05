<!--
  拖拽式拼图验证码。

  - 底图与拼图块都由父组件以 base64 传入，组件不发起请求、不生成图片；
  - 拼图块初始停在下方面板左侧，用户自由拖拽到上方底图；
  - 松手时拼图块中心不在底图区域内：视为未完成放置，回弹并恢复默认提示；
  - 落在底图区域内：emit `verify`，由父组件（后台）校验并通过 `status` 回传结果；
  - 失败时回弹到初始位置，成功后锁定，刷新按钮触发 `refresh` 并复位。
-->
<template>
  <div
    ref="rootRef"
    class="dropdown-captcha"
    :class="{ 'is-ready': ready }"
    :style="{ width: `${bgWidth}px` }"
  >
    <div ref="stageRef" class="dropdown-captcha__stage" :style="stageStyle">
      <img
        class="dropdown-captcha__bg"
        :src="bgImage"
        alt=""
        draggable="false"
        @dragstart.prevent
      />
      <button
        type="button"
        class="dropdown-captcha__refresh"
        title="刷新"
        aria-label="刷新"
        @click="handleRefresh"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
    </div>

    <div class="dropdown-captcha__panel">
      <div
        ref="homeRef"
        class="dropdown-captcha__home"
        :style="{ width: `${pieceWidth}px`, height: `${pieceHeight}px` }"
      />
      <p
        class="dropdown-captcha__message"
        :class="`dropdown-captcha__message--${displayStatus}`"
        role="status"
        aria-live="polite"
      >
        {{ messageText }}
      </p>
    </div>

    <img
      ref="pieceRef"
      class="dropdown-captcha__piece"
      :class="{
        'dropdown-captcha__piece--dragging': dragging,
        'dropdown-captcha__piece--returning': returning,
        'dropdown-captcha__piece--locked': locked
      }"
      :src="pieceImage"
      alt=""
      draggable="false"
      :style="pieceStyle"
      @dragstart.prevent
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
    />
  </div>
</template>

<script lang="ts" setup>
import type {
  DropDownCaptchaMessages,
  DropDownCaptchaStatus,
  DropDownCaptchaVerifyPayload
} from '~/types/dropdown-captcha'

const props = withDefaults(
  defineProps<{
    /** 带缺口的底图 base64 */
    bgImage: string
    /** 底图显示宽度（px），也是 verify 坐标系的宽度 */
    bgWidth: number
    /** 底图显示高度（px） */
    bgHeight: number
    /** 拼图块 base64 */
    pieceImage: string
    /** 拼图块显示宽度（px） */
    pieceWidth: number
    /** 拼图块显示高度（px） */
    pieceHeight: number
    /** 消息类型：默认 / 成功 / 失败 */
    status?: DropDownCaptchaStatus
    /** 自定义消息文案，未传的项使用内置中文 */
    messages?: Partial<DropDownCaptchaMessages>
  }>(),
  {
    status: 'default',
    messages: () => ({})
  }
)

const emit = defineEmits<{
  /** 拼图块在底图区域内松手，坐标由父组件校验 */
  verify: [payload: DropDownCaptchaVerifyPayload]
  /** 点击刷新按钮，父组件换一组底图与拼图块 */
  refresh: []
  /** 开始拖拽，父组件可借此把 status 复位成 default */
  'drag-start': []
}>()

const DEFAULT_MESSAGES: DropDownCaptchaMessages = {
  default: '拖动拼图块到图中缺口位置',
  success: '验证成功',
  error: '验证失败，请重试'
}

/** 回弹动画时长，需要与样式里的 transition 保持一致 */
const RETURN_DURATION = 280

const rootRef = ref<HTMLDivElement>()
const stageRef = ref<HTMLDivElement>()
const homeRef = ref<HTMLDivElement>()
const pieceRef = ref<HTMLImageElement>()

const dragging = ref(false)
const returning = ref(false)
const pending = ref(false)
const localStatus = ref<DropDownCaptchaStatus | null>(null)
const hasMoved = ref(false)
const ready = ref(false)
const position = reactive({ x: 0, y: 0 })
const homePosition = reactive({ x: 0, y: 0 })

let pointerId: number | null = null
let pointerOffset = { x: 0, y: 0 }
let rootRect: DOMRect | null = null
let returnTimer: number | undefined
let resizeObserver: ResizeObserver | undefined

const locked = computed(() => props.status === 'success')

/** 本地失败优先；拖拽/等待校验时展示默认提示，其余跟随父组件的 status */
const displayStatus = computed<DropDownCaptchaStatus>(() => {
  if (localStatus.value) {
    return localStatus.value
  }

  if (dragging.value || pending.value) {
    return 'default'
  }

  return props.status
})

const messageText = computed(() => {
  return props.messages?.[displayStatus.value] ?? DEFAULT_MESSAGES[displayStatus.value]
})

const stageStyle = computed(() => ({
  width: `${props.bgWidth}px`,
  height: `${props.bgHeight}px`
}))

const pieceStyle = computed(() => ({
  width: `${props.pieceWidth}px`,
  height: `${props.pieceHeight}px`,
  left: `${position.x}px`,
  top: `${position.y}px`
}))

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

/** 把拼图块原位（下方面板里的占位框）换算成相对组件根节点的坐标 */
function measureHome() {
  const root = rootRef.value
  const home = homeRef.value

  if (!root || !home) {
    return
  }

  const rootBox = root.getBoundingClientRect()
  const homeBox = home.getBoundingClientRect()

  homePosition.x = homeBox.left - rootBox.left
  homePosition.y = homeBox.top - rootBox.top

  if (!hasMoved.value && !dragging.value) {
    position.x = homePosition.x
    position.y = homePosition.y
  }

  ready.value = true
}

function stopReturnAnimation() {
  if (returnTimer !== undefined) {
    window.clearTimeout(returnTimer)
    returnTimer = undefined
  }

  returning.value = false
}

/** 失败或复位时回到下方面板的初始位置 */
function returnHome() {
  stopReturnAnimation()
  hasMoved.value = false
  returning.value = true
  position.x = homePosition.x
  position.y = homePosition.y

  returnTimer = window.setTimeout(() => {
    returning.value = false
    returnTimer = undefined
  }, RETURN_DURATION)
}

function reset() {
  stopReturnAnimation()
  dragging.value = false
  pending.value = false
  localStatus.value = null
  hasMoved.value = false
  pointerId = null
  position.x = homePosition.x
  position.y = homePosition.y
}

function handlePointerDown(event: PointerEvent) {
  if (locked.value || pending.value || dragging.value) {
    return
  }

  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  const root = rootRef.value
  const piece = pieceRef.value

  if (!root || !piece) {
    return
  }

  const pieceBox = piece.getBoundingClientRect()

  rootRect = root.getBoundingClientRect()
  pointerId = event.pointerId
  pointerOffset = {
    x: event.clientX - pieceBox.left,
    y: event.clientY - pieceBox.top
  }
  dragging.value = true
  hasMoved.value = true
  localStatus.value = null
  stopReturnAnimation()
  piece.setPointerCapture(event.pointerId)
  emit('drag-start')
  event.preventDefault()
}

function handlePointerMove(event: PointerEvent) {
  if (!dragging.value || !rootRect || event.pointerId !== pointerId) {
    return
  }

  position.x = clamp(
    event.clientX - rootRect.left - pointerOffset.x,
    0,
    rootRect.width - props.pieceWidth
  )
  position.y = clamp(
    event.clientY - rootRect.top - pointerOffset.y,
    0,
    rootRect.height - props.pieceHeight
  )
  event.preventDefault()
}

function releasePointer() {
  const piece = pieceRef.value

  if (piece && pointerId !== null && piece.hasPointerCapture(pointerId)) {
    piece.releasePointerCapture(pointerId)
  }

  pointerId = null
}

function handlePointerUp(event: PointerEvent) {
  if (!dragging.value || event.pointerId !== pointerId) {
    return
  }

  dragging.value = false
  releasePointer()

  const root = rootRef.value
  const stage = stageRef.value

  if (!root || !stage) {
    returnHome()
    return
  }

  const rootBox = root.getBoundingClientRect()
  const stageBox = stage.getBoundingClientRect()
  const centerX = position.x + props.pieceWidth / 2 + rootBox.left
  const centerY = position.y + props.pieceHeight / 2 + rootBox.top
  const inStage =
    centerX >= stageBox.left &&
    centerX <= stageBox.right &&
    centerY >= stageBox.top &&
    centerY <= stageBox.bottom

  if (!inStage) {
    // 没放进底图区域只算操作未完成：回弹并恢复默认提示，不显示“验证失败”
    localStatus.value = 'default'
    returnHome()
    return
  }

  pending.value = true
  emit('verify', {
    x: Math.round(position.x - (stageBox.left - rootBox.left)),
    y: Math.round(position.y - (stageBox.top - rootBox.top))
  })
}

function handlePointerCancel(event: PointerEvent) {
  if (event.pointerId !== pointerId) {
    return
  }

  dragging.value = false
  releasePointer()
  returnHome()
}

function handleRefresh() {
  reset()
  emit('refresh')
}

watch(
  () => [
    props.bgImage,
    props.pieceImage,
    props.bgWidth,
    props.bgHeight,
    props.pieceWidth,
    props.pieceHeight
  ],
  () => {
    reset()
    void nextTick(measureHome)
  }
)

watch(
  () => props.status,
  (status) => {
    pending.value = false
    localStatus.value = null

    if (status === 'error') {
      returnHome()
    }
  }
)

onMounted(() => {
  measureHome()

  if (typeof ResizeObserver === 'undefined') {
    return
  }

  resizeObserver = new ResizeObserver(measureHome)

  if (rootRef.value) {
    resizeObserver.observe(rootRef.value)
  }

  if (homeRef.value) {
    resizeObserver.observe(homeRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = undefined
  stopReturnAnimation()
})

defineExpose({
  /** 复位拼图块与内部状态；props.status 仍由父组件维护 */
  reset
})
</script>

<style lang="scss" scoped>
.dropdown-captcha {
  position: relative;
  display: inline-block;
  user-select: none;

  &__stage {
    position: relative;
    overflow: hidden;
    background: var(--bg-page);
    border-radius: 8px;
  }

  &__bg {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: fill;
  }

  &__refresh {
    position: absolute;
    top: 8px;
    right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    color: #fff;
    cursor: pointer;
    background: rgb(0 0 0 / 0.35);
    border: 0;
    border-radius: 50%;
    transition: background-color 0.2s;

    &:hover {
      background: rgb(0 0 0 / 0.55);
    }
  }

  &__panel {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-top: 12px;
  }

  &__home {
    flex: none;
    background: var(--bg-page);
    border: 1px dashed var(--border-default);
    border-radius: 8px;
  }

  &__message {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--fg-muted);
    transition: color 0.2s;

    &--success {
      color: var(--el-color-success);
    }

    &--error {
      color: var(--el-color-danger);
    }
  }

  &__piece {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 2;
    display: block;
    cursor: grab;
    touch-action: none;
    filter: drop-shadow(0 4px 8px rgb(0 0 0 / 0.3));

    .dropdown-captcha:not(.is-ready) & {
      visibility: hidden;
    }

    &--dragging {
      cursor: grabbing;
      transition: none;
    }

    &--returning {
      transition:
        left 0.28s ease,
        top 0.28s ease;
    }

    &--locked {
      cursor: default;
    }
  }
}
</style>
