#!/usr/bin/env node
/**
 * 按环境启动 Nuxt。
 *
 * 用法：
 *   node scripts/run-nuxt.mjs <dev|test|staging|prod> [dev|build|generate] [...参数]
 *
 * package.json 已封装成常用命令：
 *   pnpm dev           -> dev 环境 + nuxt dev
 *   pnpm dev:test      -> test 环境 + nuxt dev
 *   pnpm build:staging -> staging 环境 + nuxt generate
 *
 * 额外参数原样透传，例如：
 *   pnpm dev:test -- --port 3001
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadAppEnv, resolveAppEnv } from './env.mjs'

const [envArg, command = 'dev', ...rawArgs] = process.argv.slice(2)
// 兼容 `pnpm dev:test -- --port 3001`：pnpm 会把 `--` 原样放进 argv
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs
const appEnv = resolveAppEnv(envArg)

loadAppEnv(appEnv)

const nuxtBin = fileURLToPath(new URL('../node_modules/nuxt/bin/nuxt.mjs', import.meta.url))

// eslint-disable-next-line no-console
console.log(`[env] APP_ENV=${appEnv}，执行 nuxt ${command}`)

const child = spawn(process.execPath, [nuxtBin, command, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    APP_ENV: appEnv
  }
})

child.on('error', (error) => {
  console.error(`[env] 启动 nuxt ${command} 失败：`, error)
  process.exitCode = 1
})

child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0)
})
