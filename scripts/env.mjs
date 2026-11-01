/**
 * 应用环境（.env）加载。
 *
 * 环境四选一：dev / test / staging / prod，分别对应根目录的
 * .env.dev / .env.test / .env.staging / .env.prod。
 *
 * - 入口脚本（run-nuxt.mjs / build-production.mjs）先确定环境再交给 nuxt；
 * - nuxt.config.ts 顶部调用 loadAppEnv()，把文件里的值读进 process.env；
 * - 命令行里已存在的变量优先于文件，CI 可临时覆盖而不改文件。
 *
 * 文件优先级（先加载者优先）：
 *   .env.<环境>.local > .env.<环境> > .env.local > .env
 *
 * 注意：本项目是纯前端静态应用，所有 NUXT_PUBLIC_* 都会打进产物，
 * 这里只放公开配置，不要写密钥、令牌或任何私密信息。
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'

/** 支持的环境名，也是 .env.<环境> 的后缀 */
export const APP_ENVS = ['dev', 'test', 'staging', 'prod']

/** 项目根目录（scripts/ 的上一级） */
export const ROOT_DIR = fileURLToPath(new URL('..', import.meta.url))

/**
 * 未显式指定时的默认环境：
 * - nuxt dev / 普通 Node 进程 -> dev
 * - nuxt build / generate（NODE_ENV=production）-> prod
 */
export const DEFAULT_APP_ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'dev'

/**
 * 校验并归一化环境名。
 *
 * @param {string | undefined} value 原始环境名，允许大小写和首尾空格
 * @returns {string} dev / test / staging / prod 之一
 */
export function resolveAppEnv(value) {
  const appEnv = (value ?? '').trim().toLowerCase() || DEFAULT_APP_ENV

  if (!APP_ENVS.includes(appEnv)) {
    throw new Error(`[env] 未知的 APP_ENV="${value}"，可选值：${APP_ENVS.join(' / ')}`)
  }

  return appEnv
}

/**
 * 加载对应环境的环境变量文件。
 *
 * dotenv 不覆盖已存在的 process.env，因此：
 * - 文件之间按传入顺序先到先得（.local 优先于普通文件）；
 * - 命令行 / CI 注入的变量优先级最高；
 * - 重复调用是幂等的，nuxt dev 重启配置时不会把旧值覆盖回去。
 *
 * @param {string} [appEnv] 已校验的环境名，缺省时从 APP_ENV / NODE_ENV 推断
 * @returns {string} 实际使用的环境名
 */
export function loadAppEnv(appEnv = resolveAppEnv(process.env.APP_ENV)) {
  loadDotenv({
    path: [
      path.join(ROOT_DIR, `.env.${appEnv}.local`),
      path.join(ROOT_DIR, `.env.${appEnv}`),
      path.join(ROOT_DIR, '.env.local'),
      path.join(ROOT_DIR, '.env')
    ],
    quiet: true,
    override: false
  })

  // 统一回写，确保运行时拿到的是归一化后的环境名
  process.env.APP_ENV = appEnv

  return appEnv
}
