# STOMP

项目通过 `@stomp/stompjs` 连接原生 WebSocket 上的 STOMP broker，只维护一个连接；
同一个 destination 只创建一个 subscription，多个回调共享这条订阅。
连接跟随登录后的 `default` 布局：进入布局时建立，退出登录时彻底销毁。

## 配置

地址从 `.env.<环境>` 读取，由 `modules/stomp.ts` 写入
`runtimeConfig.public.stomp`：

| 变量                                | 说明                                                           | 默认值          |
| ----------------------------------- | -------------------------------------------------------------- | --------------- |
| `NUXT_PUBLIC_STOMP_URL`             | 原生 WebSocket 地址，必须是 `ws://` / `wss://`；留空表示不连接 | 空              |
| `NUXT_PUBLIC_STOMP_RECONNECT_DELAY` | 断线重连间隔（毫秒），`0` 关闭自动重连                         | `5000`          |
| `NUXT_PUBLIC_STOMP_AUTH_HEADER`     | STOMP CONNECT 帧里放 token 的 header 名                        | `Authorization` |
| `NUXT_PUBLIC_STOMP_DEBUG`           | `1` 输出 stompjs 调试日志，生产必须为 `0`                      | `0`             |

`modules/stomp.ts` 会被 Nuxt 自动加载，不需要在 `nuxt.config.ts` 的
`modules` 数组里登记。配置在构建期写入产物，部署后不能只改服务器环境变量生效，
与 `apiBaseUrl` 的行为一致。

## 订阅

组件内使用 `useStompSubscription`，组件卸载时自动退订。
它只登记回调，不会主动建立连接；连接由登录后的 `default` 布局统一负责：

```vue
<script setup lang="ts">
interface Notice {
  id: string
  title: string
}

useStompSubscription<Notice>('/topic/notice', (body, message) => {
  // body 默认按 JSON 解析；不是合法 JSON 时保持原始字符串
  console.log(body.id, body.title, message.headers)
})
</script>
```

同一个 destination 在多个组件里注册不同回调时：

- 底层只向 broker 发送一次 `SUBSCRIBE`；
- 每个回调都会收到同一条消息；
- 某个组件卸载只移除自己的回调；
- 最后一个回调移除时才发送 `UNSUBSCRIBE`。

`destination` 和 `enabled` 支持 `ref` / getter，变化时自动切换订阅：

```ts
const roomId = ref('room-1')
const enabled = computed(() => isLoggedIn.value)

useStompSubscription(() => `/topic/room/${roomId.value}`, onRoomMessage, { enabled })
```

非组件代码（插件、store、普通 `.ts`）使用 `useStomp().subscribe`。
调用前需要确保 `default` 布局已经执行过 `connect()`；`subscribe` 本身只登记回调：

```ts
const { subscribe } = useStomp()

const unsubscribe = subscribe<Notice>('/topic/notice', (body) => {
  console.log(body)
})

// 不再需要时调用
unsubscribe()
```

## 发布

```ts
const { publish } = useStomp()

publish('/app/chat', { roomId: 'room-1', text: 'hello' })
```

- 对象 / 数组会自动 `JSON.stringify`，并补 `content-type: application/json`；
- 字符串原样发送；
- 未连接时直接抛错，不会静默丢消息。

## 连接状态

```ts
const { status, connected, lastError, connect, disconnect, reconnect } = useStomp()
```

`status` 的取值：

```
idle → connecting → connected
                  ↘ reconnecting → connected
                  ↘ disconnected / error
```

- `connect()` 是幂等的，由登录后的 `default` 布局在 `onMounted` 时调用；
- `disconnect()` 主动断开，但保留 Client 和回调注册表，下次 `connect()` 会恢复订阅；
- `destroy()` 用于退出登录，断开连接、清空全部回调并丢弃 Client；
- `reconnect()` 只在连接已经建立时有效，用于让新的 Authorization 生效；
- 断线重连由 stompjs 负责，重连后自动恢复所有 destination 的订阅。

### 生命周期

```
登录 → default 布局 onMounted → connect() 创建唯一 Client
组件挂载 → useStompSubscription → 只登记回调
组件卸载 → 移除回调；最后一个回调移除时发送 UNSUBSCRIBE
退出登录 → useLogout → destroy() → 断开并丢弃 Client、清空回调
重新登录 → default 布局重新挂载 → connect() 创建全新 Client
```

`destroy()` 和 `disconnect()` 的区别：

- `disconnect()` 只是断开，Client 和回调注册表都保留，适合临时断线；
- `destroy()` 连 Client 和回调注册表一起丢弃，退出登录使用，下一次登录必须重新
  `connect()`，不会恢复上一个账号的订阅。

## Authorization

STOMP 层不关心 token 存在哪里。业务在登录成功后注册 provider：

```ts
setStompAuthorizationProvider(async () => {
  const token = await authStore.getAccessToken()
  return token ? `Bearer ${token}` : null
})

// 如果登录前已经建立过连接，重连让新 token 生效
await useStomp().reconnect()
```

登出时清除：

```ts
// useLogout() 内部会按顺序清除 provider 并 destroy() 连接，
// 项目内退出登录直接调用它即可。
setStompAuthorizationProvider(null)
await useStomp().destroy()
```

上面的两步是 `useLogout()` 内部已经做的事，自己实现登出流程时再按这个顺序调用。

要点：

- provider 返回完整的 header 值，例如 `Bearer eyJ...`；
- 每次连接（包括断线自动重连）前都会重新调用 provider，STOMP 层不缓存结果；
- 没有注册 provider 时返回 `null`，连接不带 Authorization，也不会阻断连接；
- `getStompAuthorization()` 可以在任意位置调用，不依赖组件上下文；
- 未登录阶段不要订阅业务 destination，避免后端反复拒绝连接。

## 后端约定

- 使用原生 WebSocket，不引入 SockJS；
- 浏览器 WebSocket API 不能设置自定义 HTTP header，因此 token 放在 STOMP
  CONNECT 帧的 header 里（默认 `Authorization`），不是 WebSocket 握手 header；
- Spring 侧通常在 `ChannelInterceptor` 里通过
  `StompHeaderAccessor.getFirstNativeHeader("Authorization")` 读取；
- 如果后端在 WebSocket 握手阶段鉴权，需要改走 Cookie 或 query，
  当前客户端实现不覆盖这种情况。

## 注意事项

- 一个应用只有一个连接，不做多连接池，也不做跨标签页共享；
- 订阅固定自动 ACK，不支持手动 ACK；
- 不做离线消息队列和可靠投递；
- `NUXT_PUBLIC_STOMP_DEBUG=1` 会让 stompjs 输出包含 Authorization 的调试日志，
  只允许在本地排查问题时开启。
