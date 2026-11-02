import tailwindcss from '@tailwindcss/vite'
import font from 'vite-plugin-font'
import { isReleaseEnv } from './env'
import { iconsBuildPlugin, svgIconsPlugin } from './icons'

/**
 * 错误页字体子集化的兜底字符表（见下方 font.vite 配置）。
 *
 * scanFiles 之外的字符不会进入子集，浏览器会逐字回退到系统字体，
 * 表现为同一行里字体混排而不是缺字方块。这里保留 ASCII 可打印字符、
 * 常用中英文标点，覆盖错误码、运行时 message、日期等动态文本。
 */
const FONT_SUBSET_WHITELIST = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ' .,:;!?()[]{}<>/\\|@#$%^&*_-+=~`\'"',
  '，。！？、；：“”‘’（）【】《》〈〉…—～·「」『』',
  '×÷±°'
]

/**
 * Vite 构建配置：字体子集、Tailwind、图标与打包压缩策略。
 *
 * 只影响打包产物；dev server 自身的热更新与调试能力不受影响。
 */
export function createViteConfig() {
  return {
    build: {
      /*
       * staging / prod 用 terser 压缩，顺带移除 console / debugger。
       * Vite 8 默认的 oxc 压缩器没有等价的 drop 选项，所以这里显式切到 terser。
       * dev / test 不设置 minify，保持默认压缩并保留调试语句。
       */
      ...(isReleaseEnv
        ? {
            minify: 'terser' as const,
            terserOptions: {
              compress: {
                drop_debugger: true,
                /*
                 * 不用 drop_console：它会连 console.error / warn 一起删掉。
                 * 这里只把纯调试方法声明为无副作用，保留错误和警告作为线上线索。
                 * window.console.* 不匹配普通 console.*，需要单独列出。
                 */
                pure_funcs: [
                  'console.log',
                  'console.info',
                  'console.debug',
                  'console.trace',
                  'window.console.log',
                  'window.console.info',
                  'window.console.debug',
                  'window.console.trace'
                ]
              }
            }
          }
        : {})
    },
    plugins: [
      /*
       * 本地字体交给 vite-plugin-font：
       * import *.ttf 时自动切分、转 woff2 并注入 @font-face，
       * 中文字体按字符范围分包，浏览器只下载实际用到的分片。
       *
       * 错误页字体以 ?subsets 引入，只保留下列 scanFiles 里出现过的字符。
       * 扫描范围必须包含 i18n 的 JSON：错误页文案在语言包里，不在 .vue 中；
       * 漏扫的字符不会缺字，而是逐字回退到系统字体，出现字体混排。
       * 只扫语言包根目录（各语言文件），demo 文案与错误页字体无关，不必计入。
       */
      font.vite({
        scanFiles: [
          'app/**/*.{vue,ts,tsx,js,css,scss}',
          'i18n/locales/*.json',
          'i18n/vendors/**/*.ts'
        ],
        whiteList: FONT_SUBSET_WHITELIST
      }),
      tailwindcss(),
      iconsBuildPlugin(),
      svgIconsPlugin
    ]
  }
}
