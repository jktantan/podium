import type { FetchError } from 'ofetch'
import type { ApiErrorPayload } from '~/types/api'

/** 规范化后的 API 错误；业务层 catch 到的都是这个类型。 */
export class ApiError extends Error {
  readonly status?: number
  readonly code: number
  readonly reason: string
  readonly transparent: boolean
  readonly payload?: unknown
  readonly headers?: Headers

  constructor(options: {
    status?: number
    code?: number
    reason?: string
    transparent?: boolean
    payload?: unknown
    headers?: Headers
  }) {
    const reason = options.reason?.trim() ?? ''
    super(reason)

    this.name = 'ApiError'
    this.status = options.status
    this.code = options.code ?? -1
    this.reason = reason
    this.transparent = options.transparent ?? false
    this.payload = options.payload
    this.headers = options.headers
  }
}

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const payload = value as Partial<ApiErrorPayload>
  return typeof payload.code === 'number' && typeof payload.cause === 'string'
}

/**
 * 解码 `error` 响应头。
 *
 * 后端推荐用 URL-safe base64 且去掉 padding；这里同时兼容标准 base64，
 * 并按 UTF-8 解码，避免中文乱码。
 */
export function decodeBase64Json(value: string): unknown {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

export function isAbortError(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'AbortError'
}

/**
 * 把 ofetch 抛出的 FetchError / 网络错误 / 已规范化的 ApiError
 * 统一成 ApiError。
 *
 * 解析顺序：响应 body → `error` 响应头 → 兜底错误。
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  const fetchError = error as FetchError | undefined
  const response = fetchError?.response
  const status = response?.status
  let payload: unknown = fetchError?.data ?? response?._data

  if (!isApiErrorPayload(payload)) {
    const header = response?.headers.get('error')

    if (header) {
      try {
        payload = decodeBase64Json(header)
      } catch {
        // header 损坏时继续走兜底
      }
    }
  }

  const normalized: ApiErrorPayload = isApiErrorPayload(payload)
    ? payload
    : { code: -1, cause: '', transparent: false }

  return new ApiError({
    status,
    code: normalized.code,
    reason: normalized.cause,
    transparent: normalized.transparent ?? false,
    payload: isApiErrorPayload(payload) ? payload : undefined,
    headers: response?.headers
  })
}
