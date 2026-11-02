<template>
  <div
    ref="rootEl"
    class="ambient-backdrop"
    :class="{
      'ambient-backdrop--ready': ready,
      'ambient-backdrop--failed': failed
    }"
    aria-hidden="true"
  >
    <canvas ref="canvasEl" class="ambient-backdrop__canvas"></canvas>
    <!-- 颜色探针：把 CSS 自定义属性交给浏览器解析成 rgb()/color()，WebGL 不认 color-mix() -->
    <span ref="probeEl" class="ambient-backdrop__probe"></span>
  </div>
</template>

<script setup lang="ts">
/**
 * 动态氛围背景
 *
 * 效果参考 DeepSeek 首页：低速流动的域扭曲噪声云团，顶部更实、向下回到页面底色，
 * 叠在布局背景之上、内容之下。用 WebGL 全屏三角形绘制，每帧只做一次片元着色。
 *
 * 颜色不写死在 shader 里，而是读 tokens.css 的 --ambient-*：
 * 浅色是冷调雾蓝，深色是深海微光，切换主题色 / 明暗时自动跟随。
 *
 * 性能与降级：
 * - canvas 分辨率最高 1.5x DPR，帧率上限 30fps（背景流动很慢，30fps 足够）
 * - 页面不可见时暂停；prefers-reduced-motion 只画一帧静态构图
 * - WebGL 不可用时隐藏 canvas，保留组件自带的静态雾面渐变
 */
const props = withDefaults(
  defineProps<{
    /** 流动速度倍率 */
    speed?: number
    /** 云层浓度倍率 */
    intensity?: number
  }>(),
  { speed: 1, intensity: 1 }
)

const VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_base;
uniform vec3 u_color_a;
uniform vec3 u_color_b;
uniform float u_intensity;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.8, 0.6, -0.6, 0.8);

  for (int i = 0; i < 4; i++) {
    value += amplitude * valueNoise(p);
    p = rotation * p * 2.03;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * 1.9;
  float t = u_time * 0.06;

  // 两次域扭曲：先得到大尺度流向，再用它扰动细节，形成缓慢翻涌的雾团
  vec2 q = vec2(
    fbm(p + vec2(0.0, 0.0) + vec2(t * 0.7, t * 0.35)),
    fbm(p + vec2(5.2, 1.3) - vec2(t * 0.45, t * 0.6))
  );
  vec2 r = vec2(
    fbm(p + 2.2 * q + vec2(1.7, 9.2) + vec2(t * 0.4, 0.0)),
    fbm(p + 2.2 * q + vec2(8.3, 2.8) - vec2(0.0, t * 0.32))
  );
  float shape = fbm(p + 2.6 * r);

  float cloud = smoothstep(0.26, 0.88, shape);
  float haze = smoothstep(0.35, 1.0, 0.5 + 0.5 * r.y);

  vec3 color = mix(u_base, u_color_a, cloud * 0.68 * u_intensity);
  color = mix(color, u_color_b, haze * 0.3 * u_intensity);

  // 顶部保留更多云气，越往下越回到页面底色
  float depth = smoothstep(0.0, 1.0, uv.y);
  color = mix(u_base, color, 0.24 + 0.76 * depth);

  // 右上方补一束柔光，和登录卡片 / 工作区的视觉重心呼应
  float glow = smoothstep(1.15, 0.0, length((uv - vec2(0.72, 0.86)) * vec2(aspect, 1.0)));
  color = mix(color, u_color_b, glow * 0.12 * u_intensity);

  gl_FragColor = vec4(color, 1.0);
}
`

type Rgb = [number, number, number]

const LIGHT_FALLBACK: Record<string, Rgb> = {
  '--ambient-base': [0.96, 0.97, 0.99],
  '--ambient-color-a': [0.54, 0.64, 0.84],
  '--ambient-color-b': [0.98, 0.99, 1]
}

const rootEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const probeEl = ref<HTMLSpanElement | null>(null)
const ready = ref(false)
const failed = ref(false)

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let resolutionLocation: WebGLUniformLocation | null = null
let timeLocation: WebGLUniformLocation | null = null
let baseLocation: WebGLUniformLocation | null = null
let colorALocation: WebGLUniformLocation | null = null
let colorBLocation: WebGLUniformLocation | null = null
let intensityLocation: WebGLUniformLocation | null = null

let animationFrame = 0
let startTime = 0
let pausedSeconds = 0
let lastFrameTime = 0
let running = false
let reducedMotion = false
let motionQuery: MediaQueryList | null = null
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null

const palette: Record<'base' | 'a' | 'b', Rgb> = {
  base: LIGHT_FALLBACK['--ambient-base']!,
  a: LIGHT_FALLBACK['--ambient-color-a']!,
  b: LIGHT_FALLBACK['--ambient-color-b']!
}

let colorCanvas: CanvasRenderingContext2D | null = null

/** 把浏览器解析后的颜色转成 0–1 的 RGB；兼容 hex / rgb() / color(srgb ...) */
function parseColor(input: string, fallback: Rgb): Rgb {
  const value = input.trim()

  const shortHex = /^#([0-9a-f]{3})$/i.exec(value)

  if (shortHex) {
    const [r, g, b] = shortHex[1]!.split('').map((part) => Number.parseInt(part + part, 16))
    return [r! / 255, g! / 255, b! / 255]
  }

  const hex = /^#([0-9a-f]{6})$/i.exec(value)

  if (hex) {
    const raw = hex[1]!
    return [
      Number.parseInt(raw.slice(0, 2), 16) / 255,
      Number.parseInt(raw.slice(2, 4), 16) / 255,
      Number.parseInt(raw.slice(4, 6), 16) / 255
    ]
  }

  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(value)

  if (rgb) {
    return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255]
  }

  const srgb = /^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(value)

  if (srgb) {
    return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3])]
  }

  // 其余色彩空间（oklab 等）交给 2D canvas 归一化，它支持 CSS Color 4
  if (!colorCanvas) {
    colorCanvas = document.createElement('canvas').getContext('2d')
  }

  if (!colorCanvas) {
    return fallback
  }

  colorCanvas.fillStyle = '#010203'
  colorCanvas.fillStyle = value
  const normalized = colorCanvas.fillStyle.toString()

  if (normalized === value || normalized === '#010203') {
    return fallback
  }

  return parseColor(normalized, fallback)
}

/** 通过探针元素读取自定义属性：getComputedStyle 只解析 color 属性，不解析 color-mix() 文本 */
function resolveColor(variable: string, fallback: Rgb): Rgb {
  const probe = probeEl.value

  if (!probe) {
    return fallback
  }

  probe.style.color = `var(${variable})`
  const resolved = getComputedStyle(probe).color
  probe.style.removeProperty('color')

  return parseColor(resolved, fallback)
}

function readPalette() {
  palette.base = resolveColor('--ambient-base', LIGHT_FALLBACK['--ambient-base']!)
  palette.a = resolveColor('--ambient-color-a', LIGHT_FALLBACK['--ambient-color-a']!)
  palette.b = resolveColor('--ambient-color-b', LIGHT_FALLBACK['--ambient-color-b']!)
}

function compileShader(type: number, source: string): WebGLShader | null {
  if (!gl) {
    return null
  }

  const shader = gl.createShader(type)

  if (!shader) {
    return null
  }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('AppAmbientBackdrop shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function createProgram(): WebGLProgram | null {
  if (!gl) {
    return null
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

  if (!vertexShader || !fragmentShader) {
    return null
  }

  const nextProgram = gl.createProgram()

  if (!nextProgram) {
    return null
  }

  gl.attachShader(nextProgram, vertexShader)
  gl.attachShader(nextProgram, fragmentShader)
  gl.linkProgram(nextProgram)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
    console.error('AppAmbientBackdrop program link error:', gl.getProgramInfoLog(nextProgram))
    gl.deleteProgram(nextProgram)
    return null
  }

  return nextProgram
}

function draw(seconds: number) {
  if (!gl || !program) {
    return
  }

  gl.useProgram(program)
  gl.uniform2f(resolutionLocation, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.uniform1f(timeLocation, seconds * props.speed)
  gl.uniform3f(baseLocation, palette.base[0], palette.base[1], palette.base[2])
  gl.uniform3f(colorALocation, palette.a[0], palette.a[1], palette.a[2])
  gl.uniform3f(colorBLocation, palette.b[0], palette.b[1], palette.b[2])
  gl.uniform1f(intensityLocation, props.intensity)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

function resize() {
  const canvas = canvasEl.value
  const root = rootEl.value

  if (!canvas || !root || !gl) {
    return
  }

  const rect = root.getBoundingClientRect()
  // 背景本身很柔和，1.5x 已经看不出差别，换来大屏下更稳的帧率
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
  const width = Math.max(1, Math.round(rect.width * ratio))
  const height = Math.max(1, Math.round(rect.height * ratio))

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
    gl.viewport(0, 0, width, height)

    // 缓冲区尺寸变化会清空画布；暂停 / 静态模式下需要补一帧
    if (!running) {
      draw(pausedSeconds || 6)
    }
  }
}

function frame(timestamp: number) {
  if (!running) {
    return
  }

  animationFrame = requestAnimationFrame(frame)

  // 背景流动很慢，30fps 足够，省一半 GPU
  if (timestamp - lastFrameTime < 32) {
    return
  }

  lastFrameTime = timestamp
  draw((timestamp - startTime) / 1000)
}

function start() {
  if (running || reducedMotion || document.hidden || !program) {
    return
  }

  running = true
  startTime = performance.now() - pausedSeconds * 1000
  lastFrameTime = 0
  animationFrame = requestAnimationFrame(frame)
}

function stop() {
  if (!running) {
    return
  }

  running = false
  pausedSeconds = (performance.now() - startTime) / 1000
  cancelAnimationFrame(animationFrame)
}

function setup() {
  const canvas = canvasEl.value

  if (!canvas) {
    return
  }

  gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power'
  })

  if (!gl) {
    failed.value = true
    return
  }

  program = createProgram()

  if (!program) {
    failed.value = true
    return
  }

  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

  const position = gl.getAttribLocation(program, 'a_position')

  if (position >= 0) {
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  }

  resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
  timeLocation = gl.getUniformLocation(program, 'u_time')
  baseLocation = gl.getUniformLocation(program, 'u_base')
  colorALocation = gl.getUniformLocation(program, 'u_color_a')
  colorBLocation = gl.getUniformLocation(program, 'u_color_b')
  intensityLocation = gl.getUniformLocation(program, 'u_intensity')

  failed.value = false
  readPalette()
  resize()
  draw(reducedMotion ? 6 : 0)
  start()
  ready.value = true
}

function handleVisibilityChange() {
  if (document.hidden) {
    stop()
  } else {
    start()
  }
}

function handleMotionPreference() {
  reducedMotion = motionQuery?.matches ?? false

  if (reducedMotion) {
    stop()
    draw(pausedSeconds || 6)
  } else {
    start()
  }
}

function handleContextLost(event: Event) {
  event.preventDefault()
  stop()
  ready.value = false
}

function handleContextRestored() {
  setup()
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion = motionQuery.matches

  setup()

  motionQuery.addEventListener('change', handleMotionPreference)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  resizeObserver = new ResizeObserver(resize)

  if (rootEl.value) {
    resizeObserver.observe(rootEl.value)
  }

  // 主题色 / 明暗切换都会改 <html> 的 class 或内联 --brand-seed
  themeObserver = new MutationObserver(() => {
    readPalette()

    if (!running) {
      draw(pausedSeconds || 6)
    }
  })

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-theme']
  })

  canvasEl.value?.addEventListener('webglcontextlost', handleContextLost)
  canvasEl.value?.addEventListener('webglcontextrestored', handleContextRestored)
})

onBeforeUnmount(() => {
  stop()
  resizeObserver?.disconnect()
  themeObserver?.disconnect()
  motionQuery?.removeEventListener('change', handleMotionPreference)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  canvasEl.value?.removeEventListener('webglcontextlost', handleContextLost)
  canvasEl.value?.removeEventListener('webglcontextrestored', handleContextRestored)

  if (gl && program) {
    gl.deleteProgram(program)
  }

  program = null
  gl = null
})
</script>

<style scoped lang="scss">
.ambient-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  /* WebGL 未就绪 / 不可用时的静态底：保留原来的雾面柔光 */
  background:
    radial-gradient(circle at 18% 20%, var(--ambient-color-a), transparent 46%),
    radial-gradient(circle at 82% 80%, var(--ambient-color-b), transparent 50%), var(--ambient-base);

  &__canvas {
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 600ms ease;
  }

  &--ready &__canvas {
    opacity: 1;
  }

  &--failed &__canvas {
    display: none;
  }

  &__probe {
    position: absolute;
    width: 0;
    height: 0;
    visibility: hidden;
    pointer-events: none;
  }
}
</style>
