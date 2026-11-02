import { computed, readonly, shallowRef } from 'vue'
import { Client, type IMessage, type StompHeaders, type StompSubscription } from '@stomp/stompjs'
import type { StompRuntimeConfig } from '~/types/stomp'
import { getStompAuthorization } from './useStompAuthorization'

/**
 * 全局 STOMP 连接。
 *
 * - 整个应用只有一个 Client，多次订阅不会建立多条连接；
 * - 同一个 destination 只有一个底层 subscription，多个回调共享这条订阅；
 * - 断线由 stompjs 自动重连，重连后由这里的注册表恢复订阅。
 */

export type StompStatus =
  'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnecting' | 'disconnected' | 'error'

export type StompMessageHandler<T = unknown> = (body: T, message: IMessage) => void

type InternalMessageHandler = (body: unknown, message: IMessage) => void

export type StompUnsubscribe = () => void

interface SharedSubscription {
  destination: string
  handlers: Map<symbol, InternalMessageHandler>
  subscription: StompSubscription | null
}

let client: Client | null = null
let config: StompRuntimeConfig | null = null
let missingUrlWarned = false
let destroying: Promise<void> | null = null

const subscriptions = new Map<string, SharedSubscription>()
const status = shallowRef<StompStatus>('idle')
const lastError = shallowRef<string | null>(null)
const connected = computed(() => status.value === 'connected')
const readonlyStatus = readonly(status)
const readonlyLastError = readonly(lastError)

function getConfig(): StompRuntimeConfig {
  if (!config) {
    config = useRuntimeConfig().public.stomp
  }

  return config
}

function parseMessageBody(body: string): unknown {
  if (!body) {
    return body
  }

  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

function clearSubscriptions() {
  for (const entry of subscriptions.values()) {
    entry.subscription = null
  }
}

function attachSubscription(entry: SharedSubscription) {
  // 只使用已经存在的 Client：订阅本身不负责创建连接，
  // 连接由 default 布局在登录后显式建立。
  const instance = client

  if (!instance?.connected || entry.subscription) {
    return
  }

  entry.subscription = instance.subscribe(entry.destination, (message) => {
    const body = parseMessageBody(message.body)

    // 先快照，避免回调内部新增订阅时收到同一条消息
    for (const handler of [...entry.handlers.values()]) {
      try {
        handler(body, message)
      } catch (error) {
        console.error(`[stomp] 订阅 ${entry.destination} 的回调执行失败：`, error)
      }
    }
  })
}

function resubscribeAll() {
  for (const entry of subscriptions.values()) {
    entry.subscription = null
    attachSubscription(entry)
  }
}

function detachSubscription(entry: SharedSubscription) {
  const subscription = entry.subscription
  entry.subscription = null

  if (!subscription) {
    return
  }

  try {
    subscription.unsubscribe()
  } catch (error) {
    // 连接已经断开时取消订阅会抛错，忽略即可，重连后会重新订阅
    console.warn(`[stomp] 取消订阅 ${entry.destination} 失败：`, error)
  }
}

function getClient(): Client | null {
  // 当前项目是 SPA，这里只是防御，避免构建阶段创建 WebSocket
  if (!import.meta.client) {
    return null
  }

  if (client) {
    return client
  }

  const runtime = getConfig()

  if (!runtime.url) {
    if (!missingUrlWarned) {
      missingUrlWarned = true
      console.warn('[stomp] 未配置 NUXT_PUBLIC_STOMP_URL，已跳过连接')
    }

    return null
  }

  const instance = new Client({
    brokerURL: runtime.url,
    reconnectDelay: runtime.reconnectDelay,
    // 不要传 debug: undefined：stompjs 用 Object.assign 合并配置，
    // 显式 undefined 会覆盖内部的 noOp 默认值，导致后续调用 this.debug 报错。
    ...(runtime.debug
      ? {
          // eslint-disable-next-line no-console
          debug: (message: string) => console.debug('[stomp]', message)
        }
      : {})
  })

  instance.beforeConnect = async (stompClient) => {
    const authorization = await getStompAuthorization()
    const headers: StompHeaders = {}

    // 重新构建 headers，token 被清除时也要移除上一次的连接头
    for (const [key, value] of Object.entries(stompClient.connectHeaders)) {
      if (key !== runtime.authHeader) {
        headers[key] = value
      }
    }

    if (authorization) {
      headers[runtime.authHeader] = authorization
    }

    stompClient.connectHeaders = headers
  }

  instance.onConnect = () => {
    if (client !== instance) {
      return
    }

    status.value = 'connected'
    lastError.value = null
    resubscribeAll()
  }

  instance.onDisconnect = () => {
    if (client !== instance) {
      return
    }

    clearSubscriptions()
    status.value = 'disconnected'
  }

  instance.onWebSocketClose = () => {
    if (client !== instance) {
      return
    }

    clearSubscriptions()
    status.value = instance.active ? 'reconnecting' : 'disconnected'
  }

  instance.onWebSocketError = () => {
    if (client !== instance) {
      return
    }

    lastError.value = 'WebSocket 连接错误'
    status.value = 'error'
  }

  instance.onStompError = (frame) => {
    if (client !== instance) {
      return
    }

    lastError.value = frame.headers.message || frame.body || 'STOMP 连接错误'
    status.value = 'error'
  }

  client = instance
  return client
}

async function connect(): Promise<void> {
  // 销毁过程中不要创建新连接，避免短时间内出现两个 Client
  while (destroying) {
    await destroying
  }

  const instance = getClient()

  if (!instance || instance.active) {
    return
  }

  status.value = 'connecting'
  instance.activate()
}

async function disconnect(): Promise<void> {
  const instance = client

  if (!instance?.active) {
    status.value = 'disconnected'
    return
  }

  status.value = 'disconnecting'
  clearSubscriptions()
  await instance.deactivate()
  status.value = 'disconnected'
}

/**
 * 彻底销毁连接。
 *
 * 用于退出登录：断开 WebSocket、清空所有已登记的回调、丢弃 Client 实例。
 * 下次登录由 default 布局重新 connect()，创建一个全新的连接。
 *
 * 与 disconnect() 的区别：disconnect() 保留 Client 和回调注册表，
 * 下次 connect() 会恢复订阅；destroy() 不保留任何东西。
 */
async function destroy(): Promise<void> {
  if (destroying) {
    return destroying
  }

  const instance = client
  client = null
  clearSubscriptions()
  subscriptions.clear()
  status.value = 'idle'
  lastError.value = null

  destroying = (async () => {
    if (!instance) {
      return
    }

    try {
      // 退出登录不需要等待 DISCONNECT receipt，直接关闭，避免网络异常时卡住
      await instance.deactivate({ force: true })
    } catch (error) {
      console.warn('[stomp] 销毁连接失败：', error)
    }
  })().finally(() => {
    destroying = null
  })

  return destroying
}

/**
 * 让连接使用最新的 Authorization。
 *
 * 只在连接已经建立时有效；还没有连接时直接返回，不会提前发起连接。
 */
async function reconnect(): Promise<void> {
  const instance = client

  if (!instance?.active) {
    return
  }

  await instance.deactivate()
  status.value = 'reconnecting'
  instance.activate()
}

function publish(destination: string, body: unknown, headers: StompHeaders = {}): void {
  const instance = client

  if (!instance?.connected) {
    throw new Error('[stomp] 尚未连接，无法发送消息')
  }

  const isText = typeof body === 'string'

  instance.publish({
    destination,
    body: isText ? body : JSON.stringify(body),
    headers: isText ? headers : { 'content-type': 'application/json', ...headers }
  })
}

/**
 * 订阅一个 destination。
 *
 * 只登记回调，不负责建立连接：连接由 default 布局在登录后统一 connect()。
 * 已连接时立即订阅，未连接时等 onConnect 统一恢复。
 * 同一个 destination 的多个订阅共享一条底层 subscription；
 * 返回的函数只移除当前回调，最后一个回调移除时才真正退订。
 */
function subscribe<T = unknown>(
  destination: string,
  handler: StompMessageHandler<T>
): StompUnsubscribe {
  const name = destination.trim()

  if (!name) {
    throw new Error('[stomp] destination 不能为空')
  }

  let entry = subscriptions.get(name)

  if (!entry) {
    entry = {
      destination: name,
      handlers: new Map(),
      subscription: null
    }
    subscriptions.set(name, entry)
  }

  const token = Symbol(name)
  const current = entry
  current.handlers.set(token, (body, message) => handler(body as T, message))

  if (current.handlers.size === 1) {
    attachSubscription(current)
  }

  let active = true

  return () => {
    if (!active) {
      return
    }

    active = false
    current.handlers.delete(token)

    if (current.handlers.size > 0) {
      return
    }

    detachSubscription(current)

    // destroy() 之后再重新登录时，旧组件的延迟清理不能误删新注册的同名订阅
    if (subscriptions.get(name) === current) {
      subscriptions.delete(name)
    }
  }
}

export function useStomp() {
  return {
    status: readonlyStatus,
    connected,
    lastError: readonlyLastError,
    connect,
    disconnect,
    destroy,
    reconnect,
    publish,
    subscribe
  }
}
