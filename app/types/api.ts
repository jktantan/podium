import type { FetchOptions, FetchRequest } from 'ofetch'

/**
 * 非 2xx 响应体 / `error` 响应头里的错误结构。
 *
 * - `code`：应用错误码，只用于展示/上报，不参与流程分支；
 * - `cause`：错误原因；
 * - `transparent`：为 true 时不弹全局错误框，由调用方处理。
 */
export interface ApiErrorPayload {
  code: number
  cause: string
  transparent?: boolean
}

/** 请求级选项；简写方法会强制 method，调用方不能再覆盖。 */
export interface ApiRequestOptions extends Omit<FetchOptions, 'method'> {
  method?: never
  /** 不弹全局错误框，错误仍然抛给调用方 */
  silent?: boolean
  /** 401 不触发全局会话失效流程（登录、会话探测等） */
  skipAuthRedirect?: boolean
}

/** `api.raw()` 的返回值：同时拿到数据、状态码和响应头。 */
export interface ApiRawResponse<T> {
  data: T
  status: number
  headers: Headers
}

/** 简写方法。所有方法统一为 (url, options)，body 放在 options.body。 */
export interface ApiShortcuts {
  get<T = unknown>(request: FetchRequest, options?: ApiRequestOptions): Promise<T>
  post<T = unknown>(request: FetchRequest, options?: ApiRequestOptions): Promise<T>
  put<T = unknown>(request: FetchRequest, options?: ApiRequestOptions): Promise<T>
  patch<T = unknown>(request: FetchRequest, options?: ApiRequestOptions): Promise<T>
  delete<T = unknown>(request: FetchRequest, options?: ApiRequestOptions): Promise<T>
  raw<T = unknown>(request: FetchRequest, options?: ApiRequestOptions): Promise<ApiRawResponse<T>>
}

/** 统一 API 客户端：可直接调用，也可以使用 get/post/... 简写。 */
export type Api = ApiShortcuts & {
  <T = unknown>(request: FetchRequest, options?: ApiRequestOptions): Promise<T>
}

declare module '#app' {
  interface NuxtApp {
    $api: Api
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $api: Api
  }
}

export {}
