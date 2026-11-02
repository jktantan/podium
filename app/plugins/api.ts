import type { FetchRequest } from 'ofetch'
import type { Api, ApiRawResponse, ApiRequestOptions } from '~/types/api'
import { useApiError } from '~/composables/useApiError'
import { useAuthStore } from '~/stores/auth'
import { toAuthorizationHeader } from '~/utils/auth'
import { isAbortError, toApiError } from '~/utils/api-error'

/**
 * 统一 API 客户端。
 *
 * - 认证：HttpOnly Cookie 由浏览器自动携带；同时从 Pinia 取 Authorization
 *   拼上 `Bearer ` 放到请求头，服务不支持 Cookie 的客户端 / STOMP 场景；
 * - 成功：2xx body 直接返回；
 * - 失败：非 2xx 统一转成 ApiError 并抛给调用方；是否弹框交给错误总线，
 *   401 由 ApiErrorLayer 以顶级弹框处理；
 * - baseURL 来自 NUXT_PUBLIC_API_BASE_URL，调用方写 `/auth/login` 即可。
 */
export default defineNuxtPlugin(() => {
  const { apiBaseUrl } = useRuntimeConfig().public
  const { report } = useApiError()

  const client = $fetch.create({
    baseURL: apiBaseUrl || undefined,
    credentials: 'include',
    timeout: 15_000,
    retry: 0
  })

  function getToken(): string {
    try {
      return useAuthStore().authorization
    } catch {
      // Pinia 尚未就绪时退化为纯 Cookie 认证
      return ''
    }
  }

  function buildHeaders(init: HeadersInit | undefined): Headers {
    const headers = new Headers(init)
    const authorization = toAuthorizationHeader(getToken())

    if (authorization) {
      headers.set('Authorization', authorization)
    }

    return headers
  }

  function handleError(
    error: unknown,
    options: { silent?: boolean; skipAuthRedirect?: boolean }
  ): never {
    if (isAbortError(error)) {
      throw error
    }

    const apiError = toApiError(error)

    if (apiError.status === 401 && !options.skipAuthRedirect) {
      report(apiError, { authExpired: true })
    } else if (!options.silent && !apiError.transparent) {
      report(apiError)
    }

    throw apiError
  }

  async function execute<T>(
    request: FetchRequest,
    options: ApiRequestOptions = {},
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  ): Promise<T> {
    const { silent, skipAuthRedirect, ...fetchOptions } = options
    const headers = buildHeaders(fetchOptions.headers)

    try {
      return (await client<T>(request, { ...fetchOptions, method, headers })) as T
    } catch (error) {
      handleError(error, { silent, skipAuthRedirect })
    }
  }

  async function executeRaw<T>(
    request: FetchRequest,
    options: ApiRequestOptions = {}
  ): Promise<ApiRawResponse<T>> {
    const { silent, skipAuthRedirect, ...fetchOptions } = options
    const headers = buildHeaders(fetchOptions.headers)

    try {
      const response = await client.raw<T>(request, { ...fetchOptions, headers })

      return {
        data: response._data as T,
        status: response.status,
        headers: response.headers
      }
    } catch (error) {
      handleError(error, { silent, skipAuthRedirect })
    }
  }

  const api = Object.assign(
    <T>(request: FetchRequest, options?: ApiRequestOptions) => execute<T>(request, options),
    {
      get: <T>(request: FetchRequest, options?: ApiRequestOptions) =>
        execute<T>(request, options, 'GET'),
      post: <T>(request: FetchRequest, options?: ApiRequestOptions) =>
        execute<T>(request, options, 'POST'),
      put: <T>(request: FetchRequest, options?: ApiRequestOptions) =>
        execute<T>(request, options, 'PUT'),
      patch: <T>(request: FetchRequest, options?: ApiRequestOptions) =>
        execute<T>(request, options, 'PATCH'),
      delete: <T>(request: FetchRequest, options?: ApiRequestOptions) =>
        execute<T>(request, options, 'DELETE'),
      raw: executeRaw
    }
  ) as Api

  return {
    provide: {
      api
    }
  }
})
