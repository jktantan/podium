# API 客户端设计

> 状态：设计稿，待评审。
>
> 范围：HTTP 请求封装、认证令牌流转、响应契约、错误弹框、认证状态持久化。
> 相关文档：[环境配置](./env.md)、[STOMP](./stomp.md)。

## 1. 结论

整体方案可行，但有三处在落地前必须修正，否则实现出来会“看起来能用、实际拿不到数据”：

1. **浏览器读不到 `Set-Cookie`**。`Set-Cookie` 是 forbidden response header，
   `response.headers.get('set-cookie')` 在浏览器里永远是 `null`。所谓“响应向下传递 cookie”
   只能是：浏览器自动写入，前端需要时用 `document.cookie` 读取**非 HttpOnly** 的部分。
2. **自定义响应头跨域必须显式暴露**。`Authorization` 和 `error` 都不在 CORS
   安全响应头列表里，后端必须返回
   `Access-Control-Expose-Headers: Authorization, error`，否则前端读到的也是 `null`。
3. **sessionStorage 与 Cookie 是两套凭证，可能不一致**。已确认后端是
   **先取 HttpOnly Cookie，取不到再取 header**；Cookie 在同源的所有标签页共享，
   sessionStorage 只在当前标签页有效。因此 sessionStorage/header 在本方案里是
   **兜底通道 + STOMP token 来源**，不是主认证来源；两个标签页登录不同账号时，
   仍会出现“Cookie 属于 A、header 属于 B”的错配，需要靠登出清理和 401 兜底。

“把 Authorization 存 sessionStorage”是一项**有意的取舍**：
它能覆盖 Cookie 不可用的场景，并为 STOMP 提供 token，但 XSS 可以直接读走 token。
由于 Cookie 已经是 `HttpOnly`，XSS 无法直接读 Cookie，sessionStorage 反而成了
攻击面更大的一份副本；生产环境需要配合 CSP、避免 `v-html`、缩短 token 有效期。

## 2. 认证与令牌流转

### 2.1 登录响应

登录成功时，后端同时下发三份信息：

- 登录响应 **body 中的 authorization 字段**：前端首选来源，不受 CORS 限制；
- 响应头 `Authorization`：前端可读（前提是 CORS 已暴露），作为兼容/兜底；
- `Set-Cookie`：浏览器自动保存，前端不读、不回传。

前端按“**body 优先、header 兜底**”取 token：

```ts
// 字段名以后端登录返回为准，示例为 authorization
const token = body.authorization ?? response.headers.get('authorization') ?? ''
```

这样即使 CORS 还没配 `Access-Control-Expose-Headers`，登录后也能拿到 token，
STOMP 不会被阻塞。

已确认：**后端返回值不带 `Bearer ` 前缀**，由前端在发请求时统一添加。
store 里保存不带前缀的原始值，请求侧用下面的函数拼接：

```ts
function toAuthorizationHeader(token: string): string {
  if (!token) return ''
  return /^Bearer\s/i.test(token) ? token : `Bearer ${token}`
}
```

兼容已带前缀的值，避免后端某天改成带前缀时变成 `Bearer Bearer xxx`。
`Headers.get()` 大小写不敏感。

### 2.2 Pinia + sessionStorage

认证状态迁移到 Pinia，持久化 `authorization` 和 `user`：
token 用于请求头和 STOMP，用户信息用于刷新后的 header 与权限判断；
两者都不敏感，真正需要保密的是 HttpOnly Cookie。

```ts
// app/stores/auth.ts
export const useAuthStore = defineStore('auth', {
  state: () => ({
    authorization: '',
    user: null as AuthUser | null
  }),
  persist: {
    key: 'podium-auth',
    storage: sessionStorage,
    pick: ['authorization', 'user']
  }
})
```

依赖：

```bash
pnpm add pinia @pinia/nuxt pinia-plugin-persistedstate
```

- `nuxt.config.ts` 的 `modules` 增加 `@pinia/nuxt`；
- 在 `app/plugins/pinia.client.ts` 手动注册持久化插件
  （`@pinia-plugin-persistedstate/nuxt` 的 peer 仍是 `@pinia/nuxt ^0.5.0`，
  与当前的 `@pinia/nuxt 1.x` 不兼容，不要装）：

```ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.$pinia.use(piniaPluginPersistedstate)
})
```

`storage: sessionStorage` 只在客户端插件中执行；项目是 `ssr: false`，
store 不会在服务端创建。若以后打开 SSR，需要改为
`storage: import.meta.client ? sessionStorage : undefined`。

### 2.3 请求注入

每个请求从 store 读 token，拼接 `Bearer ` 后写入 `Authorization` 请求头：

```ts
function buildHeaders(init: HeadersInit | undefined, token: string): Headers {
  const headers = new Headers(init)
  const value = toAuthorizationHeader(token)

  if (value) {
    headers.set('Authorization', value)
  }

  return headers
}
```

Cookie 由浏览器自动携带，前端不手工处理；`credentials: 'include'` 见 2.4。

注意：不要把这个逻辑放在 `$fetch.create` 的 `onRequest` 里再由调用方传
`onRequest`，ofetch 的请求级钩子会覆盖实例级钩子。统一在 `request()` 里合并，
或者显式组合 hooks。

### 2.4 Cookie 与 header 的关系

| 项目           | Cookie                           | 请求头 `Authorization`      |
| -------------- | -------------------------------- | --------------------------- |
| 谁写入         | 浏览器根据 `Set-Cookie` 自动写   | 前端从 sessionStorage 注入  |
| 谁发送         | 浏览器自动带（需 `credentials`） | 每次请求手动设置            |
| 前端能否读     | **HttpOnly，读不到**             | 可读（需 CORS 暴露）        |
| 作用域         | 同源所有标签页共享               | 当前标签页                  |
| 后端优先级     | **先取 Cookie**                  | Cookie 取不到时才取 header  |
| 本方案中的地位 | **主认证来源**                   | 兜底通道 + STOMP token 来源 |

已确认：Cookie 是 `HttpOnly`，后端**先取 Cookie，取不到再取 header**。
因此：

- `credentials: 'include'` 必须开启；跨域时后端还要
  `Access-Control-Allow-Credentials: true`，且 `Access-Control-Allow-Origin`
  不能是 `*`；
- 前端读不到 Cookie，sessionStorage 中的 token 在正常登录流程中用于：
  - 前端登录态（`isLoggedIn`）与用户信息；
  - STOMP 登录后的 CONNECT 帧；
  - 不支持 Cookie 的客户端（后端在 Cookie 为空时取 header）。
    HttpOnly Cookie 仍是后端认证依据，两者在登录成功时同时写入，正常流程保持一致；
- 已确认：浏览器场景**不做“Cookie 失效后回退 header”的兜底**。
  Cookie 存在就以 Cookie 为准，Cookie 失效直接 401 → 重新登录；
  header 只在 Cookie 为空（例如禁用 Cookie 的客户端）时使用；
- 因此 sessionStorage 里的 token **不能**用来挽救过期 Cookie，
  401 时不要尝试用旧 token 重放请求。

### 2.5 CSRF / XSRF

Cookie 是 `HttpOnly` 只防“读”，不防 CSRF：浏览器仍会自动携带 Cookie。

- 同源部署 + `SameSite=Lax/Strict`：跨站 POST/fetch 不会带 Cookie，基本不需要额外 token；
- 跨域 + `SameSite=None; Secure`：必须由后端下发 CSRF token
  （double-submit cookie 或同步 token），前端在请求头回传；
- 如果后端是 Spring Security 默认的 `XSRF-TOKEN` / `X-XSRF-TOKEN`，
  前端在 `buildHeaders()` 里读非 HttpOnly 的 `XSRF-TOKEN` 并加头即可；
- 不要用 `Authorization` 头代替 CSRF 防护：攻击者不需要读取 token，
  浏览器会自动带 Cookie。

本期不额外实现 XSRF，除非后端明确要求；正式部署前确认 Cookie 的 `SameSite`。

### 2.6 CORS 与部署

CORS 等正式联调时再配，但需要提前记下必需项：

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Expose-Headers: Authorization, error
```

- `Access-Control-Expose-Headers` 是前端读 `Authorization` / `error` 的前提；
- 登录 token 已从响应 body 取，STOMP 不依赖这个头；但错误 header 兜底仍需要暴露
  `error`，如果希望从响应头同步轮换后的 token，也需要暴露 `Authorization`；
- 开发期前端 `localhost:3000`、后端 `localhost:8080` 属于跨域。在 CORS 配好之前，
  可以先用 Vite 的 `server.proxy` 把 `/api` 代理到后端，并把
  `NUXT_PUBLIC_API_BASE_URL` 改成 `/api`，这样浏览器看到的是同源请求，
  Cookie 和响应头都能正常读；
- 生产更推荐 nginx 同源反代 `/api`，可以同时绕开 CORS 和 `SameSite=None` 的限制。

### 2.7 STOMP

STOMP 的 token 必须与 HTTP 共用同一个来源，并且使用同样的 `Bearer ` 拼接规则：

```ts
setStompAuthorizationProvider(() => {
  const token = useAuthStore().authorization
  return token ? toAuthorizationHeader(token) : null
})
```

登录成功后注册，退出/401 时用 `setStompAuthorizationProvider(null)` 清除。
`app/config/stomp.ts` 里的 `authHeader` 默认就是 `Authorization`，无需改动。

STOMP 只在登录流程完成后建立：

```
登录成功 → token 写入 Pinia/sessionStorage → 跳转首页
        → default 布局 onMounted → connect()
```

因此 `connect()` 执行时 token 一定已经存在，不需要从 Cookie 或响应头兜底。
不要在没有 token 的状态下调用 `connect()`；退出登录时先清 provider，再 `destroy()`。

## 3. 请求客户端

### 3.1 底层配置

```ts
const raw = $fetch.create({
  baseURL: useRuntimeConfig().public.apiBaseUrl,
  credentials: 'include',
  timeout: 15_000,
  retry: 0
})
```

- `baseURL` 来自 `NUXT_PUBLIC_API_BASE_URL`，当前值形如
  `http://localhost:8080/api`；调用方写 `/auth/login`，最终是 `/api/auth/login`，
  不要在调用处再写 `/api`；
- `retry: 0`：避免 POST/PUT/PATCH/DELETE 被重复提交；确需重试时按 method 单独配置；
- `timeout` 可按环境调整，建议后续抽到 `config/env.ts`。

### 3.2 简写 API

统一为 `(url, options)`，body 放在 `options.body` 里，与 ofetch 的签名一致：

```ts
api.get<T>(url, { query })
api.post<T>(url, { body })
api.put<T>(url, { body })
api.patch<T>(url, { body })
api.delete<T>(url, { query })
```

不采用 axios 的 `post(url, data, config)`，因为 `get/delete` 与 `post/put` 的
参数位置天然不一致，做不到“统一风格”。

简写内部强制 method，调用方传入的 `method` 被忽略：

```ts
type ApiOptions = Omit<FetchOptions, 'method'> & {
  method?: never
  silent?: boolean
  skipAuthRedirect?: boolean
  withResponse?: boolean
}
```

### 3.3 返回形态

| 调用                 | 返回                                    |
| -------------------- | --------------------------------------- |
| `api.get<T>(url)`    | `Promise<T>`（2xx body 本身）           |
| `api.raw<T>(url)`    | `Promise<{ data: T; status; headers }>` |
| 2xx 且无 body（204） | `undefined`                             |

“正常响应向下传递 data、header、cookie”的落地方式：

- `data`：默认返回；
- `header`：需要时用 `api.raw()` 拿 `Headers`；
- `cookie`：**前端拿不到响应设置的 Cookie**，只能读 `document.cookie` 中
  非 HttpOnly 的部分；如果业务确实需要把某个 Cookie 值交给调用方，
  应由后端在 body 或自定义响应头中返回。

## 4. 响应契约

### 4.1 2xx

按约定，2xx 的 body 就是业务数据本身，没有 `{ code, data }` 包装。
`request<T>` 直接返回 body：

```ts
const users = await api.get<User[]>('/users')
```

### 4.2 非 2xx

已确认非 2xx 的 body 一定是 JSON，错误 JSON 同时出现在 body 和响应头 `error`
（base64）：

```ts
interface ApiErrorPayload {
  code: number // 应用错误码
  cause: string // 错误原因
  transparent: boolean // 是否透传给调用方处理
}
```

解析优先级：

1. body（`error.response._data`）是对象且含 `code`、`cause`；
2. body 为空、不是 JSON 或结构不匹配时，读取 `response.headers.get('error')`，
   base64 解码后解析 JSON；
3. 两者都失败时使用兜底，`cause` 统一显示 **“未知后台错误”**
   （新增 i18n key `error.unknown`）：
   `{ code: -1, cause: t('error.unknown'), transparent: false }`。

`transparent` 缺省按 `false` 处理。401 不受 `transparent` 影响：即使 body 解析失败，
只要 HTTP status 是 401，仍按会话失效处理。

登录接口失败是 **HTTP 500 + 应用 `code`**，不是 401；它的错误体也按上面的结构解析，
但登录页应使用 `silent: true` 自行展示，不进入全局错误弹框（见 5.3）。

### 4.3 header error 编码选择

**结论：后端统一用 URL-safe base64（RFC 4648 §5），去掉 padding。**

| 方案                               | header 中的风险                                                          | 长度 |
| ---------------------------------- | ------------------------------------------------------------------------ | ---- |
| 标准 base64（`+` `/` `=`）         | `+` 在部分网关/日志/URL 解码链路会被当成空格；`=` 可能被中间件截断或追加 | 较长 |
| URL-safe base64（`-` `_`，无 `=`） | 字符在 header、URL、JSON、日志里都无需转义，不会被表单/URL 解析误伤      | 更短 |

RFC 7230 的 header `field-value` 允许 `+`、`/`、`=`，所以标准 base64 在规范上也是合法的；
问题出在实际链路：反向代理、WAF、日志脱敏、APM 采样都可能对 `+`/`=` 做额外处理。
URL-safe 不增加任何成本，却能避开这些不确定性，因此更稳。

后端参考实现：

- Java：`Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(UTF_8))`
- Python：`base64.urlsafe_b64encode(json.encode()).rstrip(b'=').decode()`

前端解码仍然**同时兼容两种**，这样后端以后换编码不需要改前端：

```ts
function decodeBase64Json(value: string): unknown {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}
```

必须按 UTF-8 解码，不能直接 `atob` 后当字符串用（中文会乱码）。

header 方案只作为兜底：响应头有大小限制（常见 8KB），base64 还会膨胀约 33%，
错误信息较大时可能被网关截断。**以 body 为准，header 兜底。**
base64 只是编码，不是加密；生产环境不要把 stack、SQL、内部路径放进 `cause`。

### 4.4 错误模型

```ts
class ApiError extends Error {
  status?: number // HTTP status
  code: number // 应用错误码
  reason: string // 后端 cause，避免与 Error.cause 混淆
  transparent: boolean
  payload?: unknown // 完整错误体，便于排查
  headers?: Headers
}
```

- 401 的判定用 **HTTP status === 401**，不要用应用 `code`；
- 登录失败是 **HTTP 500 + 应用 `code`**，不会走 401 分支；登录页统一显示固定文案
  **“登录失败，账号不存在或密码错误”**，不展示后端 `code` / `cause`，
  避免通过错误信息枚举账号；
- 除登录页外，`code` 只用于展示/上报，不参与流程分支；
- 网络错误、超时、DNS 失败没有 response，`status` 为 `undefined`，
  `reason` 使用 `error.unknown`（“未知后台错误”）兜底；
- 401 即使 body 为空/非 JSON，仍按会话失效处理；
- `AbortError`（组件卸载、主动取消）不弹框、不上报，原样抛出。

### 4.5 成功/失败判定

- 成功：`response.ok`，即 200–299；
- 失败：其余状态码；
- 本期没有“HTTP 200 + 业务 code 非成功”的情况，因为 2xx body 只放正常数据；
  如果后端以后引入该模式，需要在 `request()` 中增加 envelope 校验。

## 5. 错误弹框

### 5.1 为什么需要错误总线

`useLayer()` 内部依赖 `inject`（见
`node_modules/vue-lite-layer/lib/composables/use-lite-layer.ts`），
在 `$api` 的异步错误回调里没有组件上下文，`openLayer()` 会静默返回 `null`。
因此把 UI 从请求层剥离：

```
$api / request()
   └─ normalizeError() → emitError() / emitAuthExpired()
                              ↓
                    useApiError() 模块级状态
                              ↓
                    <ApiErrorLayer />（挂在 app.vue）
                              ↓
                         useLayer() 打开弹层
```

`$api` 只负责“规范化错误 + 抛给调用方 + 通知总线”，不直接碰 UI。

### 5.2 401

- `teleport: 'body'`，顶级显示；
- 只允许一个实例：模块级 `isShowingAuth` + `uniqueGroup: 'api-auth-expired'`；
- 不可关闭：
  - `close: false`（隐藏标题栏关闭按钮）
  - `shadeClose: false`
  - `closeOnEsc: false`
  - `max: false`、`min: false`
  - 自定义 footer，只保留“返回登录”按钮（默认 footer 带取消按钮，不能用）
  - `beforeClose: ({ reason }) => reason === 'ok'` 兜底
- 点击确认：执行完整登出（清 Pinia、销毁 STOMP、重置页签、跳 `/`），
  复用 `useLogout()`；如果拿不到页签上下文，降级为清 store + `location.assign('/')`；
- 并发 401：只弹第一个，后续直接丢弃；跳转也要有 `isRedirecting` 锁；
- 登录接口不会返回 401（失败是 500 + `code`），登录请求用 `silent: true`，
  由登录表单处理；`skipAuthRedirect` 保留给其他需要自行处理 401 的接口，
  例如静默的会话探测。

### 5.3 普通错误

- `transparent: true`：不弹框，只抛给调用方；
- `transparent: false`（默认）：弹框；
- 请求级 `silent: true` 优先级最高，用于轮询、后台同步、登录；
- 登录接口失败是 500，必须 `silent: true`，由登录表单统一显示固定文案
  **“登录失败，账号不存在或密码错误”**，不展示后端 `code` / `cause`；
  建议新增 `login.failedCredentials` 并三语同步（zh-CN / zh-TW / en），
  不改现有的 `login.invalidCredentials`；以后需要区分原因时再按 `code` 扩展；
- 其他 500 走弹框，文案优先用后端 `cause`；解析失败时显示 `error.unknown`
  （“未知后台错误”）；
- 403 也走统一弹框，不再使用现有的 `ElMessage.error`；
- 弹框内容使用 `textContent` 或 `contentType: 'text'`，不要渲染后端返回的 HTML。

### 5.4 单实例与优先级

状态机：

```
当前：无 / 普通错误 / 401
新错误：
  401       → 已有 401：忽略
              否则：关闭普通错误 → 打开 401
  普通错误   → 已有 401：忽略
              否则：关闭旧普通错误 → 打开新普通错误
```

- `uniqueGroup` 只能“阻止第二个”，不能“替换”，所以替换必须由管理器
  `await instance.closed` 后再 open；
- 相同 `status + code + reason` 在 1–2 秒内只弹一次，避免轮询刷屏；
- 401 一旦出现，普通错误只记录不弹框。

### 5.5 Tab 内 / 非 Tab 内

`vue-lite-layer` 的 `teleport` 支持任意 DOM 容器；非 `body` 容器下弹层根节点是
`position: absolute`，遮罩也只覆盖该容器。项目里的
`.stack-tab__container` 正好是 `position: relative; overflow: hidden`
（`vue-stack-tabs/dist/style.css`），可以作为 tab 内弹框的容器。

判定顺序：

1. 401 → 始终 `'body'`；
2. 当前存在 `.stack-tab__container` 且不是 iframe 页面 → 该元素；
3. 其他情况（登录页、错误页、iframe tab）→ `'body'`。

注意：

- 不能用 `route` 判断，`vue-stack-tabs` 内部维护页面栈，布局层拿到的 route
  不跟随 tab 切换（见 `app/layouts/default.vue` 的注释）；
- tab 内弹框切走后不可见但仍在缓存容器里，切回仍显示；这是“tab 内”的自然语义；
- tab 关闭/刷新时容器会被销毁，需要监听页签变化并关闭对应的错误弹框，避免实例泄漏；
- iframe tab 不能把 Vue 弹层 teleport 进 iframe 文档，必须降级到 `body`。

### 5.6 清理

- `ApiErrorLayer` 卸载时关闭全部弹框；
- 401 确认后先关闭弹框再跳转，避免跳转过程中残留遮罩；
- 登出时清空错误总线状态，防止下一个账号看到上一个账号的错误。

## 6. 登录 / 登出生命周期

```
登录页 submit
  → api.post('/auth/login', { body, silent: true })
  → 失败（500 + code）：表单统一显示“登录失败，账号不存在或密码错误”，
    不展示后端 cause / code，不弹全局框
  → 成功：token 优先取 body.authorization，缺失时取响应头 Authorization（不含 Bearer）
  → authStore.authorization = token
  → authStore.user = body.user
  → Cookie 由浏览器根据 Set-Cookie 自动保存
  → setStompAuthorizationProvider(() => toAuthorizationHeader(authStore.authorization))
  → 跳转 /admin

任意请求 401
  → ApiErrorLayer 弹 401（唯一、不可关闭）
  → 确认 → useLogout()
      → reset() 页签
      → 清 stacktab-active-tab
      → setStompAuthorizationProvider(null)
      → destroy() STOMP
      → authStore.$reset()（持久化同步清 sessionStorage）
      → navigateTo('/')

主动退出
  → useLogout()（同上）
```

`useAuth()` 建议保留为门面，内部改为读写 `useAuthStore()`，
页面里的 `isLoggedIn` / `can` / `login` / `logout` 调用方式不变。

登录始终走 `/auth/login`：dev / pages 由 mock 层接管，业务项目走真实接口。
演示账号是 mock 层的能力，宿主不再保留本地账号兜底。

`isLoggedIn` 在正常流程中判断 store 中是否有用户信息/authorization 即可：
登录成功先写 store，再跳转，页面看到的一定是已登录状态。

sessionStorage 在同标签页刷新时保留，所以刷新不会丢登录态。
新标签页或关闭后重开时 sessionStorage 为空，默认按未登录处理、重新登录；
本期不要求新标签页免登录，因此不需要额外的会话恢复接口。

## 7. 文件结构

```
app/types/api.ts                 ApiErrorPayload / ApiOptions / NuxtApp.$api
app/utils/auth.ts                Bearer 前缀拼接
app/utils/api-error.ts           ApiError / 错误解析 / base64 解码
app/stores/auth.ts               Pinia 认证状态（持久化 authorization + user）
app/plugins/pinia.client.ts      注册 pinia-plugin-persistedstate
app/plugins/api.ts               底层 $fetch + request() + 简写方法
app/composables/useApiError.ts   错误总线：单实例、401 优先、去重
app/components/global/ApiErrorLayer.vue
                                 挂在 app.vue；解析 teleport、打开/替换弹框
app/composables/useAuth.ts       改为 useAuthStore 的门面
app/composables/useLogout.ts     完整清理（页签、STOMP、store）
```

## 8. 已确认决策

1. 后端返回的 `Authorization` **不带 `Bearer ` 前缀**，由前端拼接；前端兼容已带前缀的值。
2. Cookie 是 **HttpOnly**；后端认证顺序是**先取 Cookie，Cookie 为空才取 header**。
   header 只用于不支持 Cookie 的客户端，**不做“Cookie 失效后回退 header”的兜底**。
3. CORS 等正式联调再配；开发期优先用 Vite 代理或同源反代。
4. 非 2xx 的 body 一定是 JSON；为空或不是 JSON 时显示“未知后台错误”；
   `error` 头推荐 **URL-safe base64 无 padding**，前端同时兼容标准 base64。
5. 登录失败是 **HTTP 500 + 应用 `code`**，不是 401；登录接口用 `silent: true`
   由表单处理，不进入全局错误框。表单统一显示固定文案
   **“登录失败，账号不存在或密码错误”**，不展示后端 `code` / `cause`，
   避免账号枚举；以后需要区分原因时再按 `code` 扩展。
6. **暂不做 refresh token**；token 失效统一走 401 → 重新登录。
7. 登录成功时 token 同时出现在 **响应 body 的 authorization 字段**和响应头
   `Authorization`；前端 **body 优先、header 兜底**。STOMP 只在登录后建立，
   不依赖 CORS 暴露的响应头。
8. STOMP 的建立顺序固定为：登录成功 → token 写入 Pinia/sessionStorage → 跳转首页
   → `default` 布局 `onMounted` → `connect()`。`connect()` 时 token 一定存在，
   不存在“STOMP 拿不到 token”的问题。新标签页默认按未登录处理、重新登录，
   本期不做免登录恢复。

## 9. 仍需确认

### 后端

1. 登录响应 body 中 authorization 的**字段名**是什么？本文示例使用 `authorization`。
2. 普通响应是否会轮换 `Authorization`？如果会，是否所有响应都要同步更新 store？
3. 2xx 是否可能返回空 body（204）？调用方如何区分 `T` 与 `undefined`？
4. `error` 头最终是否采用 URL-safe 无 padding？
5. Cookie 的 `SameSite` / `Path` / `Domain` 是什么？跨域部署时是否要 `SameSite=None; Secure`？

### 前端

6. 简写签名采用本文的“全 options”方案，还是 axios 风格？
7. 普通错误已有弹框时，新错误是“替换”还是“忽略”？本文按“替换 + 1 秒去重”设计。
8. 401 确认后复用 `useLogout()`，还是直接 `location.assign('/')`？
9. Pinia 持久化用 `pinia-plugin-persistedstate`，还是手写 10 行 `watch + sessionStorage`？
10. 错误弹框是否需要显示应用 `code` / traceId？
11. 401 跳转是否需要保留当前地址作为 `redirect` 参数？

## 10. 测试清单

- 登录成功：token 以不带 `Bearer ` 的形式写入 sessionStorage，请求头发送
  `Bearer <token>`；刷新页面后仍在；
- 登录失败 500 + `code`：表单只显示固定文案
  **“登录失败，账号不存在或密码错误”**，不显示后端 `cause` / `code`，
  不弹全局会话失效/服务异常框；
- 普通 401：只弹一个，不可关闭，确认后清空认证状态并跳 `/`；
- 并发 401：只弹一个，只跳一次；
- 非 2xx body 错误：`transparent: false` 弹框，`true` 不弹且业务能 catch；
- body 为空或不是 JSON：显示“未知后台错误”，不是空白框；
- body 解析失败时从 `error` 头解码：标准 base64 和 URL-safe 无 padding 都能解出（含中文）；
- 2xx 空 body（204）：不报错，返回 `undefined`；
- 网络错误 / 超时：弹框文案正确，业务能 catch；
- 主动取消（AbortError）：不弹框；
- 403：走统一弹框，不再出现 `ElMessage`；
- tab 内错误：弹层只覆盖 tab 内容区，切 tab 后不可见，切回仍显示；
- 登录页错误：弹层 teleport 到 body；
- 401 弹框与普通错误同时到达：只显示 401；
- 登出：sessionStorage 清空、STOMP 销毁、页签重置、跳转登录页。
