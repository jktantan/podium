#!/usr/bin/env node
/**
 * GitHub Pages 演示站构建。
 *
 * 这是 podium 框架自己的展示站，与业务项目的发布流程无关：
 * - 固定 pages 环境（.env.pages），保留 demo 路由 / 菜单 / 文案；
 * - 展示站没有后端，接口由内置 MSW mock 提供；
 * - 自动把 app.baseURL 设成项目页子路径，避免资源与 router 指向站点根；
 * - 构建后写入 .nojekyll，防止 Pages 的 Jekyll 处理忽略 _nuxt 目录。
 *
 * baseURL 优先级：
 *   显式 NUXT_APP_BASE_URL（命令行 / 仓库 Variables）
 *   > GitHub 仓库名（<user>.github.io 仓库为根路径）
 *   > /
 * 绑定自定义域名时把仓库 Variables 里的 NUXT_APP_BASE_URL 设成 /。
 *
 * 用法：
 *   pnpm build:github-pages
 *   NUXT_APP_BASE_URL=/podium/ pnpm build:github-pages
 */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAppEnv } from './env.mjs'

const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url))
const PUBLIC_DIR = path.join(ROOT_DIR, '.output', 'public')
const appEnv = 'pages'

// 命令行 / GitHub Variables 显式传入的值优先于 .env.pages
const explicitBaseURL = process.env.NUXT_APP_BASE_URL?.trim()

/*
 * GitHub Actions 里未配置的 repository Variables 会以空字符串注入。
 * dotenv 不覆盖已存在的键，空值会把 .env.pages 里的真实配置顶掉，
 * 所以先把空的 NUXT_* 删掉，再加载环境文件。
 */
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith('NUXT_') && !value?.trim()) {
    delete process.env[key]
  }
}

loadAppEnv(appEnv)

// GITHUB_REPOSITORY 形如 owner/repo；本地执行时没有这个变量
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const fallbackBaseURL = repository && !repository.endsWith('.github.io') ? `/${repository}/` : '/'
const baseURL = explicitBaseURL || fallbackBaseURL

// eslint-disable-next-line no-console
console.log(`[pages] ${appEnv} 环境，baseURL=${baseURL}，保留 demo`)

const nuxtBin = fileURLToPath(new URL('../node_modules/nuxt/bin/nuxt.mjs', import.meta.url))

const child = spawn(process.execPath, [nuxtBin, 'generate'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    APP_ENV: appEnv,
    NUXT_APP_BASE_URL: baseURL
  }
})

child.on('error', (error) => {
  console.error('[pages] 启动 nuxt generate 失败：', error)
  process.exitCode = 1
})

child.on('exit', (code) => {
  if (code !== 0) {
    process.exitCode = code ?? 1
    return
  }

  /*
   * 产物自检：子路径下曾经出现过 index.html 被写成 “Redirecting...” 占位的情况，
   * 上传到 Pages 会得到一个空白站点，所以在构建脚本里直接拦住。
   */
  const indexPath = path.join(PUBLIC_DIR, 'index.html')
  const indexHtml = readFileSync(indexPath, 'utf8')

  if (indexHtml.includes('Redirecting...') || !indexHtml.includes(`${baseURL}_nuxt/`)) {
    console.error(`[pages] 产物异常：${indexPath} 不是 ${baseURL} 下的 SPA 入口`)
    process.exitCode = 1
    return
  }

  // Pages 默认会跑 Jekyll，下划线开头的 _nuxt 目录需要显式跳过处理
  writeFileSync(path.join(PUBLIC_DIR, '.nojekyll'), '')
  // eslint-disable-next-line no-console
  console.log(`[pages] 构建完成：${PUBLIC_DIR}（baseURL=${baseURL}）`)
})
