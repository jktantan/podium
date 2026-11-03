import { HttpResponse, delay, http } from 'msw'

/**
 * podium 内置的 mock 接口。
 *
 * 只有 NUXT_PUBLIC_API_MOCK=1 时才会通过 app/plugins/mock.client.ts 注册。
 * 路径统一用 `*` 前缀：业务项目把 NUXT_PUBLIC_API_BASE_URL 配成绝对地址
 * （http://localhost:8080/api）或同源相对路径（/api）都能命中。
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

/**
 * 演示列表数据：给表格 / 分页 / 加载态一个可用的数据源。
 * 返回结构与常见后端分页一致，业务页面接真实接口时只改 URL。
 */
function createItems(page: number, pageSize: number) {
  const total = 47
  const start = (page - 1) * pageSize
  const count = Math.max(0, Math.min(pageSize, total - start))

  const list = Array.from({ length: count }, (_, index) => {
    const id = start + index + 1

    return {
      id,
      name: `示例记录 ${id}`,
      status: id % 3 === 0 ? 'disabled' : 'enabled',
      updatedAt: new Date(Date.now() - id * 36e5).toISOString()
    }
  })

  return { list, total, page, pageSize }
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
  }),

  http.get('*/demo/items', async ({ request }) => {
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize')) || 10)

    await delay(200)

    return HttpResponse.json(createItems(page, pageSize))
  })
]
