import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { minify } from 'html-minifier-terser'
import { defineNuxtModule, useLogger } from 'nuxt/kit'

/**
 * 构建产物压缩。
 *
 * 分两件事：
 * 1. HTML 压缩（本模块）
 *    Nuxt 只压缩 JS / CSS，SPA 的 index.html 和 spaLoadingTemplate 都是原样
 *    写出的，模板里内联的 <style> 会带着注释和缩进进产物。这里在静态生成
 *    结束后统一处理 .output/public 下的 HTML：折叠标签间空白、压缩内联 CSS、
 *    去掉 HTML / CSS 注释；内联 JS 保持不动（minifyJS: false），它来自
 *    appearanceBootstrap，本身已是紧凑字符串。
 * 2. 预压缩副本（Nitro 的 compressPublicAssets，在 nuxt.config.ts 中开启）
 *    为 >= 1 KiB 的可压缩资源生成 .gz / .br。但 Nitro 在 prerender 结束时就
 *    完成了压缩，而 HTML 是在 Nuxt 的 close 阶段才被 minify 的；不重新生成
 *    HTML 的 .gz / .br，服务器拿到的副本就会和实际 HTML 不一致。因此这里在
 *    写完 HTML 后，用同样的压缩参数覆盖它的 .gz / .br。
 */
const HTML_MINIFY_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeAttributeQuotes: true,
  useShortDoctype: true,
  /*
   * 属性名保持原样：SVG 的 viewBox / preserveAspectRatio 等是大小写敏感的，
   * 默认的小写转换会破坏它们。
   */
  caseSensitive: true,
  // level 1 只做局部压缩，不合并或删除规则
  minifyCSS: { level: 1 },
  minifyJS: false
} as const

/** 与 Nitro compressPublicAssets 一致的阈值：太小的文件压缩后反而更大 */
const MIN_COMPRESS_SIZE = 1024

function formatSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

/**
 * 写入 .gz / .br 副本，覆盖 Nitro 基于 minify 前内容生成的旧副本。
 *
 * 参数与 Nitro 对齐：gzip 最高压缩等级，brotli 最高质量 + 文本模式。
 */
async function writePrecompressedFiles(path: string, contents: Buffer): Promise<void> {
  if (contents.length < MIN_COMPRESS_SIZE) {
    return
  }

  await Promise.all([
    writeFile(`${path}.gz`, gzipSync(contents, { level: constants.Z_BEST_COMPRESSION })),
    writeFile(
      `${path}.br`,
      brotliCompressSync(contents, {
        params: {
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
          [constants.BROTLI_PARAM_SIZE_HINT]: contents.length
        }
      })
    )
  ])
}

export const assetCompress = defineNuxtModule({
  meta: {
    name: 'podium-asset-compress'
  },
  setup(_options, nuxt) {
    /*
     * 只在静态生成（nuxt generate / build --prerender）后处理。
     * dev、nuxt prepare 和普通 build 都不碰：这些场景下 .output/public
     * 要么是旧产物，要么根本不存在，压缩它没有意义。
     */
    if (nuxt.options.dev || nuxt.options.nitro.static !== true) {
      return
    }

    /*
     * 输出目录由 Nitro 解析（默认 .output/public），不在这里手写相对路径，
     * 生成目标变化时才能跟着走。
     */
    let publicDir: string | undefined

    nuxt.hook('nitro:init', (nitro) => {
      publicDir = nitro.options.output.publicDir
    })

    nuxt.hook('close', async () => {
      if (!publicDir) {
        return
      }

      const logger = useLogger('podium:asset-compress')
      const entries = await readdir(publicDir, { recursive: true })
      const htmlFiles = entries.filter((entry) => entry.endsWith('.html'))

      let before = 0
      let after = 0
      let count = 0

      for (const file of htmlFiles) {
        const path = join(publicDir, file)
        const source = await readFile(path, 'utf8')
        const output = await minify(source, HTML_MINIFY_OPTIONS)
        const contents = output.length < source.length ? output : source

        before += Buffer.byteLength(source)
        after += Buffer.byteLength(contents)

        if (contents !== source) {
          await writeFile(path, contents)
          count += 1
        }

        // 始终重写：即使 HTML 没变，也要保证预压缩副本对应最终内容
        await writePrecompressedFiles(path, Buffer.from(contents))
      }

      if (count > 0) {
        logger.info(
          `压缩 ${count} 个 HTML 文件：${formatSize(before)} -> ${formatSize(after)}（.gz / .br 已更新）`
        )
      }
    })
  }
})
