<!-- 翻页时钟：展示本地时间的时 / 分 / 秒 -->
<script lang="ts" setup>
import Tick from '@pqina/flip'
import { css as clockFont } from '~/assets/fonts/JetBrainsMono-Bold.ttf?subsets'
import '@pqina/flip/dist/flip.min.css'

const props = defineProps<{
  /**
   * 牌面字号：数字按 px 处理，也可以传任意 CSS 长度（如 '4rem'）。
   * 不传时使用组件内置的响应式字号。
   *
   * flip 的牌面尺寸全部以 em 计算，因此这里控制的就是整体大小。
   */
  size?: number | string
  /** 数字字体：传 CSS font-family；不传时使用组件内置的 JetBrains Mono */
  font?: string
}>()

const clockStyle = computed(() => {
  const style: Record<string, string> = {
    // 字体由 vite-plugin-font 按需注入，props.font 可覆盖
    '--flip-clock-font': props.font ?? clockFont.family
  }

  if (props.size !== undefined) {
    style.fontSize = typeof props.size === 'number' ? `${props.size}px` : props.size
  }

  return style
})

/** flip 的 value 是按 data-key 取值的扁平对象，sep 两个冒号共用 */
type FlipClockValue = {
  sep: string
  hours: number
  minutes: number
  seconds: number
}

const root = ref<HTMLDivElement>()

/** 实例与定时器都可能创建失败（元素上已有实例），生命周期里统一判空 */
let instance: ReturnType<typeof Tick.DOM.create> | undefined
let timer: ReturnType<typeof Tick.helper.interval> | undefined
/** 卸载时模板 ref 已被置空，销毁阶段使用这份引用 */
let host: HTMLDivElement | undefined

const timeText = ref('')

function readClock(): FlipClockValue {
  const now = new Date()

  return {
    sep: ':',
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds()
  }
}

function formatClock(value: FlipClockValue): string {
  return [value.hours, value.minutes, value.seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')
}

/** 同步当前时间：值未变化时 flip 内部会跳过重绘，可安全高频调用 */
function sync() {
  if (!instance) {
    return
  }

  const value = readClock()
  instance.value = value
  timeText.value = formatClock(value)
}

onMounted(() => {
  host = root.value

  if (!host) {
    return
  }

  const initial = readClock()
  instance = Tick.DOM.create(host, {
    value: initial,
    credits: null
  })

  if (!instance) {
    return
  }

  timeText.value = formatClock(initial)

  /*
   * flip 默认 1000ms 触发一次，且第一个 tick 不对齐整秒边界，
   * 秒数最多会显示滞后近 1 秒；250ms 轮询保证跳秒及时。
   */
  timer = Tick.helper.interval(sync, 250)
})

// keep-alive 切走时暂停；切回来先补一次，避免短暂显示缓存时的旧时间
onActivated(() => {
  timer?.resume()
  sync()
})

onDeactivated(() => {
  timer?.pause()
})

// 必须在 beforeUnmount 里销毁：onUnmounted 时模板 ref 已经是 null
onBeforeUnmount(() => {
  timer?.stop()
  timer = undefined

  // flip 会注册 window resize 等监听，只停定时器不足以释放，必须 destroy
  if (host) {
    Tick.DOM.destroy(host)
  }

  instance = undefined
  host = undefined
})
</script>

<template>
  <div class="flip-clock" :style="clockStyle" role="timer" :aria-label="timeText">
    <!-- 翻页 DOM 由 flip 动态生成，读屏内容交给外层的 aria-label -->
    <div ref="root" class="tick" aria-hidden="true">
      <span data-key="hours" data-repeat="true" data-transform="pad(00) -> split -> delay">
        <span data-view="flip" />
      </span>
      <span class="tick-text-inline" data-key="sep" data-view="text" />
      <span data-key="minutes" data-repeat="true" data-transform="pad(00) -> split -> delay">
        <span data-view="flip" />
      </span>
      <span class="tick-text-inline" data-key="sep" data-view="text" />
      <span data-key="seconds" data-repeat="true" data-transform="pad(00) -> split -> delay">
        <span data-view="flip" />
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.flip-clock {
  /*
   * 牌面与页面背景反色：浅色页面用深牌白字，深色页面用白牌黑字。
   * 冒号跟随正文色，不再像原来那样写死 #2e2d2d 导致深色下看不见。
   */
  --flip-panel-bg: color-mix(in srgb, var(--bg-inverse) 92%, var(--brand-primary));
  --flip-panel-fg: color-mix(in srgb, white 94%, var(--brand-primary));

  html.dark & {
    --flip-panel-bg: color-mix(in srgb, white 94%, var(--brand-primary));
    --flip-panel-fg: color-mix(in srgb, var(--bg-inverse) 92%, var(--brand-primary));
  }

  display: flex;
  justify-content: center;
  color: var(--fg-strong);
  /* 字体族由组件内联的 --flip-clock-font 提供，后接系统字体兜底 */
  font-family: var(--flip-clock-font), var(--font-family-sans);
  font-weight: 700;
  /* 6 位数字约 7.5em，clamp 保证窄屏下也不溢出卡片 */
  font-size: clamp(1.375rem, 8vw, 2rem);
  /* flip 的 .tick 自带 line-height: 1.4，这里只需禁止冒号换行 */
  white-space: nowrap;

  .tick-text-inline {
    color: var(--fg-strong);
    font-weight: 700;
    transform: translateY(-0.05em);
  }

  // flip 动态创建的面板没有 scoped 属性，必须用 :deep() 覆盖
  :deep(.tick-flip) {
    /*
     * flip 只用 min-width: 1.125em 撑牌面，字体换成等宽的 JetBrains Mono
     * 后各数字宽度一致；这里再固定牌面宽度，避免尺寸随字符变化。
     */
    width: 1.2em;
    font-variant-numeric: tabular-nums;
    border-radius: 0.2em;
  }

  :deep(.tick-flip-panel) {
    color: var(--flip-panel-fg);
    background-color: var(--flip-panel-bg);
  }
}
</style>
