/**
 * 后端返回的 Authorization 不带 `Bearer ` 前缀，由前端统一拼接。
 * 兼容后端以后改成带前缀的情况，避免出现 `Bearer Bearer xxx`。
 */
export function toAuthorizationHeader(token: string): string {
  const value = token.trim()

  if (!value) {
    return ''
  }

  return /^Bearer\s/i.test(value) ? value : `Bearer ${value}`
}
