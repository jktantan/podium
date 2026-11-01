#!/usr/bin/env node
/**
 * 生产构建辅助脚本（不带 demo）。
 *
 * 用法：
 *   pnpm build:prod              # prod 环境，生成不带 demo 的静态包
 *   pnpm build:staging           # staging 环境（预发布），同样不带 demo
 *   pnpm build:prod staging      # 显式指定环境，效果同上
 *   pnpm build:prod --preset ... # 额外参数原样传给 nuxt generate
 *
 * 原理：加载对应 .env.<环境>，设置 PODIUM_DEMO=0 后交给 nuxt generate，
 * nuxt.config.ts 会：
 *   1. 通过 pages:extend 移除 app/pages/demo 下的全部路由；
 *   2. 把 '#podium-demo' 别名指向 app/demo/stub.ts（空菜单 / 空首页卡片）；
 *   3. i18n 只加载 i18n/locales/*.json，不加载 i18n/locales/demo/*.json。
 *
 * 只设置环境变量而不移动源文件，因此本地开发仍可随时查看 demo 页面。
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadAppEnv, resolveAppEnv } from './env.mjs'

const [first, ...rest] = process.argv.slice(2)
// 第一个参数不以 - 开头时视为环境名，否则全部当作 nuxt generate 的参数
const hasEnvArg = Boolean(first) && !first.startsWith('-')
const appEnv = resolveAppEnv(hasEnvArg ? first : 'prod')
const args = hasEnvArg ? rest : process.argv.slice(2)

loadAppEnv(appEnv)

const nuxtBin = fileURLToPath(new URL('../node_modules/nuxt/bin/nuxt.mjs', import.meta.url))

const EXCLUDED = ['app/pages/demo/', 'app/demo/', 'i18n/locales/demo/']

// eslint-disable-next-line no-console
console.log(`[demo] ${appEnv} 环境构建：排除 ${EXCLUDED.join('、')}`)

const child = spawn(process.execPath, [nuxtBin, 'generate', ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    APP_ENV: appEnv,
    PODIUM_DEMO: '0'
  }
})

child.on('error', (error) => {
  console.error('[demo] 启动 nuxt generate 失败：', error)
  process.exitCode = 1
})

child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
