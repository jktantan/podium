import path from 'node:path'
import type { Plugin } from 'vite'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons-ng'
import {
  ICON_OUT_DIR,
  ICON_SRC_DIR,
  buildIcons,
  removeIcon,
  syncIcon
} from '../scripts/build-icons.mjs'

/**
 * SVG 图标：源目录保持原始 SVG，生成目录只放处理后的版本。
 *
 * - app/assets/icons 是源目录，入库，保持设计稿 / 图标包原样；
 * - .icons 是 scripts/build-icons.mjs 的产物，已被 gitignore，只作为 sprite 输入；
 * - 处理规则改动后重跑 `pnpm icons:build` 即可，不需要用 git 回滚源文件。
 *
 * symbolId 规则为 icon-[dir]-[name]，目录层级会保留：
 *   app/assets/icons/color/cms-b/SEO.svg -> #icon-color-cms-b-SEO
 *   app/assets/icons/mono/ant/close.svg   -> #icon-mono-ant-close
 *
 * 必须保留目录层级：mono/ant 与 mono/opt 有大量同名文件（如 close.svg）。
 */

/**
 * 图标构建插件：
 * - buildStart 时全量同步一次，保证 dev / build 用的 .icons 与源目录一致；
 * - dev 下监听源目录，新增 / 修改 / 删除时增量同步，不用手动重跑命令。
 */
export function iconsBuildPlugin(): Plugin {
  const sync = async (file: string) => {
    const relative = path.relative(ICON_SRC_DIR, file)

    if (relative.startsWith('..') || !relative.endsWith('.svg')) {
      return
    }

    try {
      await syncIcon(relative)
    } catch (error) {
      console.warn(
        `[icons] 同步失败 ${relative}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return {
    name: 'podium-icons-build',
    async buildStart() {
      const stats = await buildIcons()

      if (stats.updated || stats.removed || stats.failed) {
        // eslint-disable-next-line no-console
        console.log(
          `[icons] ${stats.total} 个图标：${stats.updated} 更新，${stats.removed} 清理，${stats.failed} 失败`
        )
      }
    },
    configureServer(server) {
      server.watcher.add(ICON_SRC_DIR)
      server.watcher.on('add', (file) => void sync(file))
      server.watcher.on('change', (file) => void sync(file))
      server.watcher.on('unlink', (file) => {
        const relative = path.relative(ICON_SRC_DIR, file)

        if (!relative.startsWith('..') && relative.endsWith('.svg')) {
          void removeIcon(relative)
        }
      })
    }
  }
}

/**
 * SVG sprite：构建期把 .icons 下的所有 .svg 转成 <symbol>，
 * 运行时由 app/plugins/svg-icons.client.ts 注入到 <body> 末尾。
 *
 * - htmlMode: 'none'：Nuxt 的 index.html 由 Nitro 生成，插件的 transformIndexHtml
 *   不可靠，改为在客户端入口显式 import virtual:svg-icons/register。
 * - 输入目录 .icons 由 scripts/build-icons.mjs 生成（移除尺寸、收缩 viewBox、
 *   mono 颜色转 currentColor）；构建期 svg-icon-baker 再用 svgo 4 安全预设压一次，
 *   默认保留 viewBox。需要自定义时用 bakerOptions.svgoOptions，
 *   不要重新打开 cleanupIds / removeUnknownsAndDefaults。
 * - failOnError: 损坏的 SVG 直接让构建失败，避免图标静默缺失。
 */
export const svgIconsPlugin = createSvgIconsPlugin({
  iconDirs: [ICON_OUT_DIR],
  symbolId: 'icon-[dir]-[name]',
  inject: 'body-last',
  htmlMode: 'none',
  failOnError: true
})
