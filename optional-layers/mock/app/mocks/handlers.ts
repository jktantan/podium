import { HttpResponse, delay, http } from 'msw'

/**
 * mock 层的通用接口。
 *
 * 只有 NUXT_PUBLIC_API_MOCK=1 时才会通过 mock.client.ts 注册。
 * 路径统一用 `*` 前缀：业务项目把 NUXT_PUBLIC_API_BASE_URL 配成绝对地址
 * （http://localhost:8080/api）或同源相对路径（/api）都能命中。
 *
 * 项目自己的接口 mock 写在项目侧的 app/mocks/handlers.ts，
 * 由 mock.client.ts 合并进同一个 worker；不要改本文件，方便框架更新。
 *
 * 新增接口的约定：
 * - 成功响应的 body 与真实后端保持同构，页面代码不用为 mock 写分支；
 * - 失败响应使用 { code, cause }，由 app/utils/api-error.ts 统一转成 ApiError。
 */

interface LoginBody {
  username?: string
  password?: string
}

/** 与登录页文案 login.demoAccounts / login.demoViewer 保持一致 */
const MOCK_ACCOUNTS = {
  admin: { password: 'admin123', name: 'admin', permissions: ['*'] },
  viewer: { password: 'viewer123', name: 'viewer', permissions: [] }
} as const

type MockUsername = keyof typeof MOCK_ACCOUNTS

function isMockUsername(value: string): value is MockUsername {
  return value in MOCK_ACCOUNTS
}

export const handlers = [
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginBody
    const username = body.username?.trim() ?? ''

    await delay(300)

    if (!isMockUsername(username) || MOCK_ACCOUNTS[username].password !== body.password) {
      return HttpResponse.json({ code: 401, cause: 'invalid credentials' }, { status: 401 })
    }

    const account = MOCK_ACCOUNTS[username]

    return HttpResponse.json({
      authorization: `mock-${username}`,
      user: {
        name: account.name,
        permissions: [...account.permissions]
      }
    })
  })
]
