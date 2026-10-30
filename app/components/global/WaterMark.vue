<script setup lang="ts">
/**
 * 水印组件：在默认插槽内容之上平铺文字或图片水印。
 *
 * 实现方式是往容器里放一个铺满的绝对定位层，用 canvas 生成水印图作为
 * background-image 平铺，因此不依赖 DOM 文本，也不会拦截鼠标事件。
 *
 * 注意：MutationObserver 只能抵抗「删除节点 / 改写 inline style」这类
 * 低级篡改，前端水印本身不是安全边界。
 */
type CssStyleValue = string | number | undefined
type CssStyle = Record<string, CssStyleValue>

interface WaterMarkProps {
  /** 是否显示水印 */
  show?: boolean
  /** 水印水平间距（px） */
  gapX?: number
  /** 水印垂直间距（px） */
  gapY?: number
  /** 水印层层级 */
  zIndex?: number
  /** 单个文字水印宽度（px），不传时按文字实际宽度自适应 */
  width?: number
  /** 单个文字水印高度（px），不传时按行数自适应 */
  height?: number
  /** 水印旋转角度（deg） */
  rotate?: number
  /** 图片水印地址，设置后忽略 content */
  image?: string
  /** 图片水印宽度（px），仅 image 模式生效 */
  imageWidth?: number
  /** 图片水印高度（px），仅 image 模式生效 */
  imageHeight?: number
  /** 文字水印内容，数组表示多行 */
  content?: string | string[]
  /** 文字颜色 */
  fontColor?: string
  /** 文字样式，如 normal / italic */
  fontStyle?: string
  /** 字体 */
  fontFamily?: string
  /** 字重 */
  fontWeight?: string
  /** 字号（px），传字符串时只解析数字部分 */
  fontSize?: string | number
}

const DEFAULT_MARK_WIDTH = 120
const DEFAULT_MARK_HEIGHT = 64
const DEFAULT_FONT_SIZE = 16
/** 多行文字的行间距（CSS px） */
const FONT_GAP = 3
/** 文字描边颜色，让浅色水印在深色背景上仍可辨认 */
const TEXT_STROKE_COLOR = 'rgba(255, 255, 255, 0.2)'

const props = withDefaults(defineProps<WaterMarkProps>(), {
  show: true,
  gapX: 200,
  gapY: 200,
  zIndex: 1,
  // 0 表示按文字内容自适应
  width: 0,
  height: 0,
  rotate: -22,
  image: '',
  imageWidth: DEFAULT_MARK_WIDTH,
  imageHeight: DEFAULT_MARK_HEIGHT,
  content: '',
  fontColor: 'rgba(0, 0, 0, 0.04)',
  fontStyle: 'normal',
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
  fontSize: DEFAULT_FONT_SIZE
})

const markWrap = ref<HTMLDivElement>()
/** 水印层 DOM 由代码维护，用 shallowRef 避免被 Vue 深度代理 */
const watermark = shallowRef<HTMLDivElement | null>(null)

let observer: MutationObserver | null = null
/** 最近一次写入的 inline style，用于区分「自己的写入」和「外部篡改」 */
let lastStyle = ''
/** 渲染批次号，丢弃图片异步加载回来时已经过期的渲染 */
let renderId = 0

const toKebabCase = (key: string) => key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)

const getStyleStr = (style: CssStyle) =>
  Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${toKebabCase(key)}: ${value};`)
    .join(' ')

/** 设备物理像素与 CSS 像素的比值 */
const getPixelRatio = () => (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)

const getFontSize = () => {
  const size = Number.parseFloat(String(props.fontSize))
  return Number.isFinite(size) && size > 0 ? size : DEFAULT_FONT_SIZE
}

const getContents = (): string[] =>
  (Array.isArray(props.content) ? props.content : [props.content]).map((item) => item ?? '')

/** 测量和绘制必须使用同一套字体参数，否则宽度会算偏 */
const buildFont = (pixelSize: number) =>
  `${props.fontStyle} normal ${props.fontWeight} ${pixelSize}px ${props.fontFamily}`

/** 以水印中心为原点旋转画布 */
const rotateWatermark = (
  ctx: CanvasRenderingContext2D,
  rotateX: number,
  rotateY: number,
  rotate: number
) => {
  ctx.translate(rotateX, rotateY)
  ctx.rotate((Math.PI / 180) * Number(rotate))
  ctx.translate(-rotateX, -rotateY)
}

/** 单个水印在 CSS 像素下的尺寸 */
const getMarkSize = (ctx: CanvasRenderingContext2D): [number, number] => {
  if (props.image) {
    return [
      props.imageWidth > 0 ? props.imageWidth : DEFAULT_MARK_WIDTH,
      props.imageHeight > 0 ? props.imageHeight : DEFAULT_MARK_HEIGHT
    ]
  }

  const contents = getContents()
  const fontSize = getFontSize()
  ctx.font = buildFont(fontSize)

  const widths = contents.map((item) => ctx.measureText(item).width)
  const measuredWidth = widths.length ? Math.ceil(Math.max(...widths)) : 0
  const measuredHeight = contents.length
    ? Math.ceil(contents.length * fontSize + (contents.length - 1) * FONT_GAP)
    : 0

  return [
    props.width || measuredWidth || DEFAULT_MARK_WIDTH,
    props.height || measuredHeight || DEFAULT_MARK_HEIGHT
  ]
}

const watermarkStyle = (): CssStyle => ({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: props.zIndex
})

const destroyedWatermark = () => {
  // 让仍在等待图片加载的渲染失效
  renderId += 1
  watermark.value?.remove()
  watermark.value = null
  lastStyle = ''
}

const appendWatermark = (base64Url: string, markWidth: number, markHeight: number) => {
  const wrap = markWrap.value
  if (!wrap) return

  if (!watermark.value) {
    watermark.value = document.createElement('div')
    watermark.value.setAttribute('aria-hidden', 'true')
    watermark.value.setAttribute('role', 'presentation')
  }

  const style = getStyleStr({
    ...watermarkStyle(),
    backgroundImage: `url("${base64Url}")`,
    backgroundRepeat: 'repeat',
    // 背景图按设备像素生成，这里换算回 CSS 尺寸，保证不同 DPR 下视觉大小一致
    backgroundSize: `${props.gapX + markWidth}px ${props.gapY + markHeight}px`,
    backgroundPosition: `-${props.gapX / 2}px -${props.gapY / 2}px`
  })

  lastStyle = style
  watermark.value.setAttribute('style', style)

  // 被外部移除后挂回去；已在容器内时不重复 append，减少无谓的 DOM 变动
  if (watermark.value.parentNode !== wrap) {
    wrap.append(watermark.value)
  }
}

const fillTexts = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  drawX: number,
  drawY: number,
  drawWidth: number,
  markWidth: number,
  markHeight: number
) => {
  const ratio = getPixelRatio()
  const fontSize = getFontSize() * ratio
  const lineHeight = fontSize + FONT_GAP * ratio

  ctx.font = buildFont(fontSize)
  ctx.fillStyle = props.fontColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.translate(drawWidth / 2, 0)

  getContents().forEach((item, index) => {
    const y = drawY + index * lineHeight
    ctx.fillText(item, drawX, y)
    ctx.strokeStyle = TEXT_STROKE_COLOR
    ctx.lineWidth = ratio
    ctx.strokeText(item, drawX, y)
  })

  appendWatermark(canvas.toDataURL(), markWidth, markHeight)
}

const renderWatermark = () => {
  const hasText = getContents().some((item) => item.trim() !== '')

  if (!props.show || (!props.image && !hasText)) {
    destroyedWatermark()
    return
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const currentId = ++renderId
  const ratio = getPixelRatio()
  const [markWidth, markHeight] = getMarkSize(ctx)

  // canvas 的 width / height 是整数像素，不能带单位
  canvas.width = Math.max(1, Math.ceil((props.gapX + markWidth) * ratio))
  canvas.height = Math.max(1, Math.ceil((props.gapY + markHeight) * ratio))

  const drawX = (props.gapX * ratio) / 2
  const drawY = (props.gapY * ratio) / 2
  const drawWidth = markWidth * ratio
  const drawHeight = markHeight * ratio
  const rotateX = (drawWidth + props.gapX * ratio) / 2
  const rotateY = (drawHeight + props.gapY * ratio) / 2

  // canvas 用完即弃，不需要 save / restore；图片是异步绘制的，
  // 一旦 restore 就会丢掉旋转，所以变换要一直保留到绘制结束。
  rotateWatermark(ctx, rotateX, rotateY, props.rotate)

  if (props.image) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => {
      if (currentId !== renderId) return
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
      appendWatermark(canvas.toDataURL(), markWidth, markHeight)
    }
    img.onerror = () => {
      if (currentId !== renderId) return
      if (!hasText) {
        destroyedWatermark()
        return
      }
      fillTexts(ctx, canvas, drawX, drawY, drawWidth, markWidth, markHeight)
    }
    img.src = props.image
  } else {
    fillTexts(ctx, canvas, drawX, drawY, drawWidth, markWidth, markHeight)
  }
}

/** 水印节点被删除，或 inline style 被外部改写时，需要重建 */
const isWatermarkAltered = (record: MutationRecord) => {
  const el = watermark.value
  if (!el) return false

  if (record.type === 'childList') {
    return Array.from(record.removedNodes).includes(el)
  }

  if (record.type === 'attributes' && record.target === el) {
    return el.getAttribute('style') !== lastStyle
  }

  return false
}

const observeWatermark = (target: HTMLElement) => {
  if (!('MutationObserver' in window)) return

  observer = new MutationObserver((records) => {
    if (records.some(isWatermarkAltered)) {
      destroyedWatermark()
      renderWatermark()
    }
  })

  observer.observe(target, {
    subtree: true,
    childList: true,
    // attributeFilter 只有在 attributes: true 时才生效
    attributes: true,
    attributeFilter: ['style']
  })
}

watch(
  () => [
    props.show,
    props.gapX,
    props.gapY,
    props.width,
    props.height,
    props.rotate,
    props.image,
    props.imageWidth,
    props.imageHeight,
    props.content,
    props.fontColor,
    props.fontStyle,
    props.fontFamily,
    props.fontWeight,
    props.fontSize,
    props.zIndex
  ],
  () => renderWatermark(),
  // content 可能是数组，内部元素变化也要重绘
  { deep: true }
)

onMounted(() => {
  renderWatermark()
  if (markWrap.value) {
    observeWatermark(markWrap.value)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  destroyedWatermark()
})
</script>

<template>
  <div ref="markWrap" class="relative">
    <slot />
  </div>
</template>
