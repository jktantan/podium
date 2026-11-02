import { getCurrentScope, onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { IMessage } from '@stomp/stompjs'
import { useStomp } from './useStomp'

/**
 * 组件内的声明式 STOMP 订阅。
 *
 * 同一个 destination 的多个调用共享一条底层 subscription，
 * 每个调用只负责自己的回调；组件卸载时自动移除，最后一个回调移除时才真正退订。
 *
 * @example
 * useStompSubscription<Notice>('/topic/notice', (body) => {
 *   console.log(body)
 * })
 */
export interface UseStompSubscriptionOptions {
  /** 为 false 时暂停订阅，默认始终启用；支持 ref / getter */
  enabled?: MaybeRefOrGetter<boolean>
}

export interface UseStompSubscriptionReturn {
  /** 手动停止订阅；幂等，组件卸载时也会自动调用 */
  stop: () => void
}

export function useStompSubscription<T = unknown>(
  destination: MaybeRefOrGetter<string>,
  handler: (body: T, message: IMessage) => void,
  options: UseStompSubscriptionOptions = {}
): UseStompSubscriptionReturn {
  const { subscribe } = useStomp()
  let stopCurrent: (() => void) | null = null

  const isEnabled = () => (options.enabled === undefined ? true : toValue(options.enabled))

  const start = () => {
    stopCurrent?.()
    stopCurrent = null

    const name = toValue(destination).trim()

    if (!name || !isEnabled()) {
      return
    }

    stopCurrent = subscribe<T>(name, (body, message) => {
      handler(body, message)
    })
  }

  watch(() => [toValue(destination), isEnabled()] as const, start, { immediate: true })

  const stop = () => {
    stopCurrent?.()
    stopCurrent = null
  }

  if (getCurrentScope()) {
    onScopeDispose(stop)
  }

  return { stop }
}
