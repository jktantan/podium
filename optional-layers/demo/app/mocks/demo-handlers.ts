import { HttpResponse, delay, http } from 'msw'
import type { RequestHandler } from 'msw'

/**
 * demo 层专属的接口 mock。
 *
 * 这些接口只服务于 demo 页面，所以跟着 demo 层走：
 * 项目只启用 mock、不启用 demo 时，产物里不会出现 /demo/items。
 *
 * 本文件不直接注册 worker，由 demo-mock.client.ts 在 mock 启动后合并进去；
 * 这样 demo 层不需要知道 worker 的创建细节，mock 层的 public / 开关也不用复制，
 * 两层的依赖方向保持 demo → mock。
 */

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

export const demoHandlers: RequestHandler[] = [
  http.get('*/demo/items', async ({ request }) => {
    const url = new URL(request.url)
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize')) || 10)

    await delay(200)

    return HttpResponse.json(createItems(page, pageSize))
  })
]
