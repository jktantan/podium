/* eslint-disable no-console */
/**
 * 批量优化 app/assets/icons 下的源图标。
 *
 * 规则：
 * 1. 用 svgo preset-default 清理元数据、注释、无用节点；
 * 2. 移除 width / height 以及根节点上的 class / style，尺寸交给 AppIcon / CSS；
 * 3. 用 svg-path-bbox 计算所有 path 的实际边界；
 * 4. 把 viewBox 收缩到图形边界，宽高比由边界本身保证；
 * 5. color/ 保留颜色，mono/ 的颜色统一转成 currentColor。
 *
 * 用法：
 *   pnpm icons:optimize           写回源文件
 *   pnpm icons:optimize --dry-run 只统计，不写文件
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { optimize } from 'svgo'
import { svgPathBbox } from 'svg-path-bbox'

const ICON_DIR = fileURLToPath(new URL('../app/assets/icons', import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')

/** 根 <svg> 上的 class/style 只服务 iconfont 的原始尺寸，sprite 里由 AppIcon 控制 */
const REMOVE_ROOT_STYLE = {
  name: 'removeAttrs',
  params: { attrs: 'svg:class|svg:style' }
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
  const entries = await readdir(dir, { withFileTypes: true })
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

/**
 * 合并所有 path 的包围盒，并按 1:1 画布收缩。
 *
 * 图标设计在正方形画布上，图形本身可能是长方形（文件图标、横线等）。
 * 因此不能直接取内容外接矩形当 viewBox，否则画布比例变了，图标会被拉伸。
 * 这里取内容长边作为正方形边长、内容居中，既去掉四周留白，又保持原纵横比。
 */
function shrinkViewBox(svg) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let counted = 0

  for (const match of svg.matchAll(/\bd="([^"]+)"/g)) {
    let box
    try {
      box = svgPathBbox(match[1])
    } catch {
      continue
    }

    if (!box || box.some((value) => !Number.isFinite(value))) {
      continue
    }

    minX = Math.min(minX, box[0])
    minY = Math.min(minY, box[1])
    maxX = Math.max(maxX, box[2])
    maxY = Math.max(maxY, box[3])
    counted += 1
  }

  if (counted === 0) {
    return null
  }

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

function transformFile(source, kind) {
  const result = optimize(source, {
    multipass: true,
    plugins: pluginsFor(kind)
  })

  const viewBox = shrinkViewBox(result.data)
  if (!viewBox) {
    return { svg: result.data, viewBox: null }
  }

  const withViewBox = result.data.includes('viewBox=')
    ? result.data.replace(/\bviewBox="[^"]*"/, `viewBox="${viewBox}"`)
    : result.data.replace(/<svg\b/, `<svg viewBox="${viewBox}"`)

  return { svg: withViewBox, viewBox }
}

async function main() {
  const files = await walk(ICON_DIR)
  let changed = 0
  let skipped = 0
  const samples = []

  for (const file of files) {
    const relative = path.relative(ICON_DIR, file)
    const kind = relative.startsWith('mono/') ? 'mono' : 'color'
    const source = await readFile(file, 'utf8')
    const { svg, viewBox } = transformFile(source, kind)

    if (!viewBox) {
      skipped += 1
      console.warn(`跳过（无法计算边界）: ${relative}`)
      continue
    }

    const next = `${svg.trim()}\n`
    if (next === source) {
      continue
    }

    if (samples.length < 3) {
      samples.push(`${relative}  viewBox="${viewBox}"`)
    }

    if (!DRY_RUN) {
      await writeFile(file, next, 'utf8')
    }
    changed += 1
  }

  console.log(
    `${DRY_RUN ? '[dry-run] ' : ''}处理 ${files.length} 个图标：${changed} 个有变化，${skipped} 个跳过`
  )
  for (const sample of samples) {
    console.log(`  ${sample}`)
  }
}

await main()
