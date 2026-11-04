import tailwindcss from '@tailwindcss/vite'
import font from 'vite-plugin-font'
import { isReleaseEnv } from './env'
import { iconsBuildPlugin, svgIconsPlugin } from './icons'

/**
 * 字体子集化的拉丁兜底字符表（见下方 font.vite 配置）。
 *
 * 这里是**全局 whiteList**：所有 ?subsets 字体都会包含这些字符，所以只放
 * 每套字体都有的拉丁字符。中文标点不能放这里：Inconsolata 只有拉丁字形，
 * 缺 20 个全角标点，一旦进入它的 unicode-range，错误页里的中文标点会被
 * 浏览器当成「该字体负责的字符」而显示 .notdef 方块，而不是回退系统字体。
 *
 * 中文标点的兜底在 config/font-cjk-punctuation.txt，只由 default key 扫描。
 */
const FONT_SUBSET_WHITELIST = [
  '0123456789',
  'abcdefghijklmnopqrstuvwxyz',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ' .,:;!?()[]{}<>/\\|@#$%^&*_-+=~`\'"',
  '×÷±°'
]

/**
 * 中文标点兜底文件的路径。
 *
 * scanFiles 之外的字符不会进入子集，浏览器会逐字回退到系统字体，
 * 表现为同一行里字体混排而不是缺字方块。app / i18n 里实际用到的标点
 * 会被正常扫描到，这个文件只补「当前文案没用到、但运行时 message 可能
 * 出现」的全角标点。它只挂在 default key 上，Inconsolata 的 latin key
 * 不扫描它。
 */
const FONT_CJK_PUNCTUATION_FILE = 'config/font-cjk-punctuation.txt'

/**
 * ?subsets 字体的单片字符数上限。
 *
 * vite-plugin-font 默认每 500 字切一片，扫描全站文案后错误页标题字体会被
 * 切成十几片（Nano 13 片、PangMen 11 片）。分片按字符顺序切，不按页面，
 * 一个错误页的文本会命中多片，反而要发多次请求；GitHub Pages 的静态资源
 * 只有 10 分钟缓存，过期后每个分片都要再发一次条件请求。
 *
 * 这里放大到超过全站去重字符数，让每套 ?subsets 字体只产出一个 woff2。
 * 字体仍由组件的 CSS chunk 按页面加载，不影响正常首屏。
 *
 * Inconsolata 不走默认扫描范围，而是 `?subsets&key=latin` + 只含拉丁字符的
 * latin key（见下方 scanFiles）。它只有 882 个拉丁字形，用默认的中文扫描
 * 集会生成大量 .notdef 空片，浏览器会报 glyf: zero-length table。
 */
const FONT_SUBSET_CHUNK_SIZE = 100_000

/**
 * cn-font-split 自己的分包阈值（不是 vite-plugin-font 的参数）。
 *
 * subsetChunkSize 只决定「一次交给 cn-font-split 多少个字符」，它仍会按
 * chunkSize（默认 70KB）和 maxAllowSubsetsCount（默认 10）继续拆。要真正
 * 做到每套字体一个文件，这三个值必须一起放大。
 *
 * 注意：vite-plugin-font 的缓存只检查产物是否存在，不比较这些参数。
 * 本地改完这里要删掉 node_modules/.cache/vite/client/.subsets 和对应的
 * *_ttf 目录再构建，否则会继续用旧分片；CI 全新安装不受影响。
 */
const CN_FONT_SINGLE_FILE_OPTIONS = {
  chunkSize: 10 * 1024 * 1024,
  maxAllowSubsetsCount: 1
} as const

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
        /*
         * 字体以 `?subsets&key=xxx` 引入时，按 key 选择扫描范围：
         * - default：全站文案 + 中文标点兜底，所有没写 key 的字体走这里；
         * - latin：空范围，只吃全局 whiteList 的拉丁字符，Inconsolata 用。
         */
        scanFiles: {
          default: [
            'app/**/*.{vue,ts,tsx,js,css,scss}',
            'i18n/locales/*.json',
            'i18n/vendors/**/*.ts',
            FONT_CJK_PUNCTUATION_FILE
          ],
          latin: []
        },
        whiteList: FONT_SUBSET_WHITELIST,
        subsetChunkSize: FONT_SUBSET_CHUNK_SIZE,
        ...CN_FONT_SINGLE_FILE_OPTIONS
      }),
      tailwindcss(),
      iconsBuildPlugin(),
      svgIconsPlugin
    ]
  }
}
