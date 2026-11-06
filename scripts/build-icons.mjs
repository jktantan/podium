/* eslint-disable no-console */
/**
 * 把 app/assets/icons 下的原始 SVG 处理成 sprite 输入，输出到 .icons/。
 *
 * 源目录保持原始形态（设计稿 / 上游图标包原样），所有改写都发生在生成目录。
 * 处理规则集中在 transformFile：规则调整后重跑即可，不需要用 git 回滚源文件。
 *
 * 规则：
 * 1. svgo preset-default 清理元数据、注释、无用节点；
 * 2. 移除 width / height 以及根节点上的 class / style，尺寸交给 AppIcon / CSS；
 * 3. 遍历可见图形（path / rect / circle 等）合并包围盒，defs、不可见节点不参与；
 * 4. 把 viewBox 收缩到图形边界，取长边作为正方形边长、内容居中；
 * 5. color/ 保留颜色，mono/ 的颜色统一转成 currentColor。
 *
 * 用法：
 *   pnpm icons:build            全量生成
 *   pnpm icons:build --dry-run  只统计，不写文件
 *
 * dev 下由 nuxt.config.ts 的 iconsBuildPlugin 在启动时构建，并监听源目录做增量同步。
 */
import { mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { optimize } from 'svgo'
import { svgPathBbox } from 'svg-path-bbox'

/** 源图标目录：原始 SVG，入库 */
export const ICON_SRC_DIR = fileURLToPath(new URL('../app/assets/icons', import.meta.url))

/** 生成目录：只作为 vite-plugin-svg-icons-ng 的输入，已被 gitignore */
export const ICON_OUT_DIR = fileURLToPath(new URL('../.icons', import.meta.url))

/**
 * 根 <svg> 上的 class/style 只服务 iconfont 的原始尺寸，sprite 里由 AppIcon 控制。
 *
 * 不用 svgo 的 removeAttrs：svgo 4 已不支持 `svg:class` 这类元素前缀选择器，
 * 而 `class|style` 会误删图形节点上的同名属性。这里直接按节点名过滤。
 */
const REMOVE_ROOT_STYLE = {
  name: 'removeRootStyle',
  fn: () => ({
    element: {
      enter: (node) => {
        if (node.name === 'svg') {
          delete node.attributes.class
          delete node.attributes.style
        }
      }
    }
  })
}

function pluginsFor(kind) {
  const overrides = {}

  if (kind === 'mono') {
    // 单色图标：所有 fill/stroke/stop-color 统一成 currentColor
    overrides.convertColors = { currentColor: true }
  }

  return [
    {
      name: 'preset-default',
      params: { overrides }
    },
    // 移除 width/height 属性，只留 viewBox
    'removeDimensions',
    // 图标名由 symbolId 提供，<title> 在 sprite 里没有意义
    'removeTitle',
    REMOVE_ROOT_STYLE
  ]
}

async function walk(dir) {
  let entries

  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  }

  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)))
    } else if (entry.isFile() && entry.name.endsWith('.svg')) {
      files.push(fullPath)
    }
  }

  return files
}

function kindOf(relative) {
  // Windows 的 path.relative 返回 `mono\ant\close.svg`，不能只按 `/` 判断目录
  return relative.split(/[\\/]/)[0] === 'mono' ? 'mono' : 'color'
}

/** 不直接绘制的容器：子树里的图形不会出现在最终画布上，不参与包围盒计算 */
const NON_RENDERED = new Set([
  'defs',
  'clipPath',
  'mask',
  'symbol',
  'marker',
  'pattern',
  'linearGradient',
  'radialGradient',
  'filter',
  'title',
  'desc'
])

function toNumber(value, fallback = 0) {
  const number = Number.parseFloat(value)
  return Number.isFinite(number) ? number : fallback
}

/** 属性也可能写在 style 里（如 style="stroke:none"），两种形式都要认 */
function styleValue(node, name) {
  const style = node.attributes?.style

  if (!style) {
    return undefined
  }

  for (const declaration of style.split(';')) {
    const separator = declaration.indexOf(':')

    if (separator !== -1 && declaration.slice(0, separator).trim() === name) {
      return declaration.slice(separator + 1).trim()
    }
  }

  return undefined
}

function inheritedValue(node, name, fallback) {
  return node.attributes?.[name] ?? styleValue(node, name) ?? fallback
}

function parsePoints(points) {
  const numbers = points
    .trim()
    .split(/[\s,]+/)
    .map(Number)

  if (numbers.length < 4 || numbers.length % 2 !== 0 || numbers.some((n) => !Number.isFinite(n))) {
    return null
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (let index = 0; index < numbers.length; index += 2) {
    minX = Math.min(minX, numbers[index])
    maxX = Math.max(maxX, numbers[index])
    minY = Math.min(minY, numbers[index + 1])
    maxY = Math.max(maxY, numbers[index + 1])
  }

  return [minX, minY, maxX, maxY]
}

/** 基本图形的几何包围盒；无法确定时返回 null，不参与收缩 */
function geometryBbox(node) {
  const attributes = node.attributes ?? {}

  switch (node.name) {
    case 'path': {
      if (!attributes.d) {
        return null
      }

      try {
        const box = svgPathBbox(attributes.d)
        return box.every(Number.isFinite) ? box : null
      } catch {
        return null
      }
    }
    case 'rect': {
      const width = toNumber(attributes.width)
      const height = toNumber(attributes.height)

      if (width <= 0 || height <= 0) {
        return null
      }

      const x = toNumber(attributes.x)
      const y = toNumber(attributes.y)
      return [x, y, x + width, y + height]
    }
    case 'circle': {
      const radius = toNumber(attributes.r)

      if (radius <= 0) {
        return null
      }

      const cx = toNumber(attributes.cx)
      const cy = toNumber(attributes.cy)
      return [cx - radius, cy - radius, cx + radius, cy + radius]
    }
    case 'ellipse': {
      const rx = toNumber(attributes.rx)
      const ry = toNumber(attributes.ry)

      if (rx <= 0 || ry <= 0) {
        return null
      }

      const cx = toNumber(attributes.cx)
      const cy = toNumber(attributes.cy)
      return [cx - rx, cy - ry, cx + rx, cy + ry]
    }
    case 'line': {
      const x1 = toNumber(attributes.x1)
      const y1 = toNumber(attributes.y1)
      const x2 = toNumber(attributes.x2)
      const y2 = toNumber(attributes.y2)
      return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)]
    }
    case 'polygon':
    case 'polyline':
      return attributes.points ? parsePoints(attributes.points) : null
    default:
      return null
  }
}

/**
 * 遍历可见图形，合并包围盒。
 *
 * 只统计真正会绘制的节点：defs / clipPath / mask 等容器里的图形不算，
 * fill 与 stroke 都为 none 的图形不算，display:none / visibility:hidden 的子树直接跳过。
 * 遇到 transform 时返回 transformed —— 节点坐标已不在画布坐标系，
 * 按未变换的 d 计算会裁掉内容，此时保留原 viewBox 更安全。
 */
function collectContentBox(svg) {
  const box = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    counted: 0,
    stroke: 0,
    transformed: false
  }

  const visit = (node, inherited) => {
    if (node.type !== 'element' || NON_RENDERED.has(node.name)) {
      return
    }

    const attributes = node.attributes ?? {}

    if (attributes.display === 'none' || attributes.visibility === 'hidden') {
      return
    }

    if (attributes.transform) {
      box.transformed = true
    }

    const fill = inheritedValue(node, 'fill', inherited.fill)
    const stroke = inheritedValue(node, 'stroke', inherited.stroke)
    const strokeWidth = toNumber(
      inheritedValue(node, 'stroke-width', inherited.strokeWidth),
      inherited.strokeWidth
    )
    const stroked = stroke !== 'none' && stroke !== 'transparent'
    const filled = fill !== 'none' && fill !== 'transparent'

    if (stroked) {
      box.stroke = Math.max(box.stroke, strokeWidth)
    }

    const geometry = geometryBbox(node)

    if (geometry && (filled || stroked)) {
      box.minX = Math.min(box.minX, geometry[0])
      box.minY = Math.min(box.minY, geometry[1])
      box.maxX = Math.max(box.maxX, geometry[2])
      box.maxY = Math.max(box.maxY, geometry[3])
      box.counted += 1
    }

    for (const child of node.children ?? []) {
      visit(child, { fill, stroke, strokeWidth })
    }
  }

  visit(svg, { fill: 'black', stroke: 'none', strokeWidth: 1 })

  return box
}

/**
 * 合并所有可见图形的包围盒，并按 1:1 画布收缩。
 *
 * 图标设计在正方形画布上，图形本身可能是长方形（文件图标、横线等）。
 * 因此不能直接取内容外接矩形当 viewBox，否则画布比例变了，图标会被拉伸。
 * 这里取内容长边作为正方形边长、内容居中，既去掉四周留白，又保持原纵横比。
 * stroke 沿路径两侧各占半个线宽，计算时向外扩，避免收缩后描边被裁。
 */
function computeViewBox(root) {
  const svg = root.children.find((node) => node.type === 'element' && node.name === 'svg')

  if (!svg) {
    return null
  }

  const box = collectContentBox(svg)

  if (box.transformed || box.counted === 0) {
    return null
  }

  const padding = box.stroke > 0 ? box.stroke / 2 : 0
  const minX = box.minX - padding
  const minY = box.minY - padding
  const maxX = box.maxX + padding
  const maxY = box.maxY + padding

  // 向外取整到 0.01，避免曲线边缘被裁掉
  const side = Math.ceil(Math.max(maxX - minX, maxY - minY) * 100) / 100
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  if (!Number.isFinite(side) || side <= 0) {
    return null
  }

  const x = Math.floor((centerX - side / 2) * 100) / 100
  const y = Math.floor((centerY - side / 2) * 100) / 100

  return `${x} ${y} ${side} ${side}`
}

/**
 * 把 viewBox 收缩实现为 svgo 插件，直接在 AST 上计算并写回。
 *
 * 相比在 optimize 之后用正则扫 `d="..."`：这里只统计可见图形，
 * 能识别 rect / circle 等基本图形和 stroke 宽度，
 * 也不会被 defs / clipPath 里的路径带偏。
 */
function shrinkViewBoxPlugin(onViewBox) {
  return {
    name: 'shrinkViewBox',
    fn: (root) => {
      const viewBox = computeViewBox(root)

      if (viewBox) {
        for (const node of root.children) {
          if (node.type === 'element' && node.name === 'svg') {
            node.attributes.viewBox = viewBox
            break
          }
        }
      }

      onViewBox(viewBox)
    }
  }
}

function transformFile(source, kind) {
  let viewBox = null

  const result = optimize(source, {
    multipass: true,
    plugins: [
      ...pluginsFor(kind),
      shrinkViewBoxPlugin((value) => {
        if (value) {
          viewBox = value
        }
      })
    ]
  })

  return { svg: result.data, viewBox }
}

/**
 * 处理单个图标并写入生成目录。
 *
 * @param {string} relative 相对源目录的路径，如 mono/ant/close.svg
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<{ changed: boolean, viewBox: string | null }>}
 */
export async function syncIcon(relative, options = {}) {
  const { dryRun = false } = options
  const source = await readFile(path.join(ICON_SRC_DIR, relative), 'utf8')
  const { svg, viewBox } = transformFile(source, kindOf(relative))
  const next = `${svg.trim()}\n`
  const target = path.join(ICON_OUT_DIR, relative)

  let current = null
  try {
    current = await readFile(target, 'utf8')
  } catch {
    // 目标文件不存在，按需要写入
  }

  if (current === next) {
    return { changed: false, viewBox }
  }

  if (!dryRun) {
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, next, 'utf8')
  }

  return { changed: true, viewBox }
}

/** 删除单个图标的生成文件；目录空了就一并清掉 */
export async function removeIcon(relative) {
  const target = path.join(ICON_OUT_DIR, relative)

  try {
    await rm(target)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return
    }
    throw error
  }

  let dir = path.dirname(target)

  while (dir.startsWith(ICON_OUT_DIR) && dir !== ICON_OUT_DIR) {
    try {
      await rmdir(dir)
    } catch {
      break
    }
    dir = path.dirname(dir)
  }
}

/**
 * 全量构建：处理所有源图标，并清理生成目录里已经不存在的文件。
 *
 * @param {{ dryRun?: boolean }} [options]
 */
export async function buildIcons(options = {}) {
  const { dryRun = false } = options
  const files = await walk(ICON_SRC_DIR)
  const expected = new Set()
  const stats = {
    total: files.length,
    updated: 0,
    unchanged: 0,
    noViewBox: 0,
    failed: 0,
    removed: 0
  }

  for (const file of files) {
    const relative = path.relative(ICON_SRC_DIR, file)
    expected.add(relative)

    try {
      const { changed, viewBox } = await syncIcon(relative, { dryRun })
      if (changed) {
        stats.updated += 1
      } else {
        stats.unchanged += 1
      }
      if (!viewBox) {
        stats.noViewBox += 1
        console.warn(`保留原 viewBox（无法计算边界）: ${relative}`)
      }
    } catch (error) {
      stats.failed += 1
      console.warn(`处理失败: ${relative} - ${error.message}`)
    }
  }

  if (!dryRun) {
    for (const file of await walk(ICON_OUT_DIR)) {
      const relative = path.relative(ICON_OUT_DIR, file)
      if (expected.has(relative)) {
        continue
      }

      await removeIcon(relative)
      stats.removed += 1
    }
  }

  return stats
}

function printStats(prefix, stats) {
  for (const line of [
    `${prefix}处理 ${stats.total} 个图标：${stats.updated} 个更新，${stats.unchanged} 个未变，` +
      `${stats.removed} 个过期文件已清理`,
    stats.noViewBox ? `  ${stats.noViewBox} 个保留了原 viewBox` : null,
    stats.failed ? `  ${stats.failed} 个处理失败` : null
  ]) {
    if (line) {
      console.log(line)
    }
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const stats = await buildIcons({ dryRun })

  printStats(dryRun ? '[dry-run] ' : '', stats)

  if (stats.failed) {
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
