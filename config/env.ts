import { STOMP_DEFAULTS } from '../app/config/stomp'
import type { StompRuntimeConfig } from '../app/types/stomp'

/** 支持的环境名，与根目录的 .env.<环境> 文件一一对应 */
const APP_ENVS = ['dev', 'pages', 'test', 'staging', 'prod'] as const

type AppEnv = (typeof APP_ENVS)[number]

/**
 * 从 nuxt 命令行的 --dotenv 参数推断环境名。
 *
 * package.json 里每条命令都显式写出 `.env.<环境>`，所以不需要启动脚本注入
 * APP_ENV：反推出文件名里的环境名即可。兼容 `--dotenv .env.test` 和
 * `--dotenv=.env.test` 两种写法。
 */
function appEnvFromArgv(argv: readonly string[]): string | undefined {
  const files = argv.flatMap((arg, index) => {
    if (arg === '--dotenv') {
      return [argv[index + 1] ?? '']
    }

    return arg.startsWith('--dotenv=') ? [arg.slice('--dotenv='.length)] : []
  })

  const names = files
    .map((file) => /^\.env\.([^./]+)$/.exec(file)?.[1])
    .filter((name): name is string => name !== undefined && name !== 'local')

  return names.at(-1)
}

function isAppEnv(value: string): value is AppEnv {
  return (APP_ENVS as readonly string[]).includes(value)
}

/**
 * 当前环境。
 *
 * 优先级：显式 APP_ENV（CI 临时覆盖）> 命令行 --dotenv 的文件名 >
 * NODE_ENV（dev / prod）。没有 --dotenv 的场景（nuxt prepare、typecheck）
 * 按 NODE_ENV 推断，与走命令时保持一致。
 */
function resolveAppEnv(): AppEnv {
  const appEnv =
    process.env.APP_ENV?.trim() ||
    appEnvFromArgv(process.argv) ||
    (process.env.NODE_ENV === 'production' ? 'prod' : 'dev')

  if (!isAppEnv(appEnv)) {
    throw new Error(`[env] 未知的环境名 "${appEnv}"，可选值：${APP_ENVS.join(' / ')}`)
  }

  return appEnv
}

/**
 * 应用环境与公开配置（构建期）。
 *
 * 这是 nuxt.config.ts 和 config/ 下其它构建期配置的唯一环境入口：
 * 环境名、打包策略、demo 开关都由这里派生；runtimeConfig.public 的默认值
 * 也在这里生成，nuxt.config.ts 只负责挂载。
 *
 * .env 文件由 Nuxt CLI 的 --dotenv 加载（c12），加载发生在 nuxt.config
 * 解析之前，所以这里直接读 process.env 就是最终值。
 */

/** 当前环境：dev / pages / test / staging / prod */
const appEnv = resolveAppEnv()

/**
 * staging / prod：不产出 sourceMap，并用 terser 移除 console / debugger。
 * 其余环境（dev / test / pages）保留 sourceMap 和调试语句。
 */
export const isReleaseEnv = appEnv === 'staging' || appEnv === 'prod'

/**
 * 是否加载 optional-layers（demo + mock，构建期）。
 *
 * - dev / pages 默认开启：框架本地开发和演示站需要 demo/mock；
 * - test / staging / prod 默认关闭：业务项目的构建产物里不包含 demo/mock；
 * - `PODIUM_DEMO=1` / `0` 可以显式覆盖，便于 CI 或临时验证。
 *
 * 注意：这里只控制“是否 extends 可选层”，不删除源码。
 * 项目确定永远不需要 demo/mock 时，直接删除 optional-layers 目录即可。
 */
export const optionalLayersEnabled = boolEnv('PODIUM_DEMO', appEnv === 'dev' || appEnv === 'pages')

function envValue(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback
}

function boolEnv(key: string, fallback: boolean): boolean {
  const raw = envValue(key, '').toLowerCase()

  if (!raw) {
    return fallback
  }

  return raw === '1' || raw === 'true' || raw === 'on'
}

/**
 * 生成 runtimeConfig.public。
 *
 * 变量名保持 NUXT_PUBLIC_ 前缀，既作为默认值，也允许 Nuxt 在部署时
 * 按同名环境变量覆盖。除了 appName（构建期要写入 index.html 标题）和
 * stomp.url（需要校验协议），其余值都可以交给 Nuxt 覆盖；
 * 数字 / 布尔在运行时由 app/config/stomp.ts 的 normalizeStompConfig() 归一化。
 *
 * demo / mock 不在 runtimeConfig 里：它们是可选层，是否加载由构建期
 * extends 决定，宿主通过 appConfig 读取层提供的扩展信息。
 */
export function createPublicRuntimeConfig(): {
  appEnv: string
  appName: string
  apiBaseUrl: string
  pageLoading: boolean
  stomp: StompRuntimeConfig
} {
  const stompUrl = envValue('NUXT_PUBLIC_STOMP_URL', STOMP_DEFAULTS.url)

  if (stompUrl && !/^wss?:\/\//i.test(stompUrl)) {
    console.warn(`[stomp] NUXT_PUBLIC_STOMP_URL 必须以 ws:// 或 wss:// 开头，当前值：${stompUrl}`)
  }

  return {
    appEnv,
    appName: envValue('NUXT_PUBLIC_APP_NAME', 'Podium'),
    apiBaseUrl: envValue('NUXT_PUBLIC_API_BASE_URL', ''),
    /**
     * 导航期间是否显示页面加载态，默认开启。
     *
     * 内网等页面 chunk 加载很快的场景可以在 .env.<环境> 里设为 0：
     * 关闭后页签仍然立即出现，但内容区不再显示 loading 遮罩。
     */
    pageLoading: boolEnv('NUXT_PUBLIC_PAGE_LOADING', true),
    stomp: {
      url: stompUrl,
      reconnectDelay: STOMP_DEFAULTS.reconnectDelay,
      authHeader: envValue('NUXT_PUBLIC_STOMP_AUTH_HEADER', STOMP_DEFAULTS.authHeader),
      debug: STOMP_DEFAULTS.debug
    }
  }
}
