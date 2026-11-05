# 给 vue-stack-tabs 的修改提示：内容区自定义滚动容器

> 状态：已在 `vue-stack-tabs@2.6.0` 实现；3.0.0 将 `scrollContainer` / `globalScroll` 合并为 `pageScroll`。本仓库已按 3.0 接入（`../app/components/layout/PageScroll.vue` + `app/layouts/default.vue`）。保留本文档作为设计记录。

> 直接复制下面这段发给维护者或编码助手即可（2.6.0 已实现，以下内容作为实现参考保留）。

---

请给 `vue-stack-tabs` 增加一个可选的 `scrollContainer` 组件属性，让宿主可以用自己的滚动组件（例如 Element Plus 的 `ElScrollbar`）承载每个页签的内容区滚动，而不是只能使用库内建的 `overflow: auto`。

## 背景

当前内容区滚动由库内建在缓存页 wrapper 上，宿主无法替换：

- `src/lib/hooks/tabPanel/pageComponentFactory.tsx` 中，每个缓存页渲染为：

  ```tsx
  <div
    ref={pageRoot}
    class="stack-tab__cache-page-wrapper"
    id={`W-${cacheName}`}
    style={[
      runtimeContext.useGlobalScroll.value ? 'overflow:auto' : 'overflow:hidden',
      'height: 100%'
    ]}
  >
    {pageVNode}
    <PageLoading tabId={tabInfo.id!} />
  </div>
  ```

- 该 wrapper 同时承担三件事：
  1. 页面滚动（`globalScroll` 为 `true` 时 `overflow: auto`）；
  2. 每个页签独立的滚动位置保存 / 恢复（`saveScroller` / `restoreScroller` 读写它的 `scrollTop`）；
  3. 上下滚动阴影的监听目标（`useScrollShadow({ target: pageRoot })`）。
- `src/lib/assets/style/stack-tab.scss` 中 `.stack-tab__cache-page-wrapper` 只有 `width/height: 100%`，滚动完全依赖行内 `overflow`。

宿主要把滚动条换成自己的组件时，**不能**在 `<VueStackTabs>` 外层包一层滚动容器：

- 外层容器是所有页签共享的，切换页签会共享同一个滚动位置，破坏库的「每页独立滚动位置记忆」；
- 库的滚动位置与阴影都绑定在 wrapper 上，外层容器不会参与保存 / 恢复；
- keep-alive 下隐藏页签仍占位置或需要参与高度计算，体验会退化。

所以，自定义滚动容器必须落在**每个缓存页 wrapper 内部**，这是库应该提供的扩展点。

## 目标

1. 新增可选 prop `scrollContainer`，默认 `undefined`，**不传时行为与当前版本完全一致**。
2. 传入组件时，库把页面内容放进该组件的默认插槽，滚动完全由该组件负责。
3. 库的滚动位置记忆、滚动阴影改为作用于适配器暴露的滚动元素（或可选的位置 / 尺寸方法）。
4. 库不依赖任何具体滚动库（不 import Element Plus），契约保持框架中立。
5. 按 minor 版本发布，现有宿主无需修改。

## API 设计

### Prop

```ts
// src/lib/StackTabs.vue
import type { Component } from 'vue'

scrollContainer?: Component
```

### 宿主侧约定

自定义滚动组件需要满足：

1. **渲染默认插槽。** 库把页面 vnode 作为默认插槽内容传入。
2. **根元素填满父容器。** wrapper 固定 `height: 100%`，组件自身高度也必须是 `100%`（`ElScrollbar` 默认就是 `height: 100%`）。
3. **暴露真实滚动元素。** 通过 `expose` 暴露 `scrollElement`：

   ```ts
   defineExpose({ scrollElement }) // HTMLElement | null
   ```

   库只读写它的 `scrollTop` / `scrollLeft`，并读取 `scrollHeight` / `clientHeight` 计算阴影。
   非原生滚动组件可以额外实现可选的适配器方法，见下文「适配不同滚动组件」。

### 宿主示例

```vue
<!-- PageScroll.vue -->
<template>
  <el-scrollbar ref="scrollbar" height="100%">
    <slot />
  </el-scrollbar>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScrollbarInstance } from 'element-plus'

const scrollbar = ref<ScrollbarInstance>()

defineExpose({
  // Element Plus 的类型声明把 wrapRef 写成 Ref，但通过组件实例访问时
  // 已经由 Vue 的 expose proxy 解包，运行时拿到的是 HTMLDivElement。
  scrollElement: computed(
    () => (scrollbar.value?.wrapRef as unknown as HTMLElement | undefined) ?? null
  )
})
</script>
```

```vue
<VueStackTabs :scroll-container="PageScroll" :global-scroll="true" ... />
```

### 适配不同滚动组件

`scrollElement` 契约覆盖的是「**滚动仍由原生 `scrollTop` / `scrollLeft` 驱动，只是把系统滚动条换成自绘条**」这一类组件。主流滚动条组件都属于这一类：

| 组件                                              | 暴露滚动元素的方式                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Element Plus `ElScrollbar`                        | `wrapRef`（本文示例）                                                                       |
| 原生滚动容器                                      | 容器自身的 template ref                                                                     |
| OverlayScrollbars / SimpleBar / perfect-scrollbar | 组件实例上的滚动元素（如 `elements().scrollOffsetElement`、`getScrollElement()`、容器本身） |
| 自定义滚动组件                                    | 自己的 wrap / content-wrapper 元素                                                          |

这类组件只需要一个薄适配层（例如上面的 `PageScroll.vue`），适配一次即可在所有页面复用；库本身不需要知道宿主用的是哪个库。

**不覆盖**的是「不产生原生滚动」的实现：例如 BetterScroll 用 `transform` 驱动内容位移，虚拟滚动可能只渲染可视区。此时滚动元素的 `scrollTop` 恒为 0，仅暴露 `scrollElement` 不足以保存 / 恢复位置。把契约扩展为可选的**滚动适配器**即可覆盖这类组件：

```ts
export interface StackTabsScrollAdapter {
  /** 必需：真实滚动元素；没有原生滚动时返回 null */
  scrollElement: HTMLElement | null
  /** 可选：读写滚动位置（非原生滚动组件实现） */
  getPosition?: () => { top: number; left: number }
  setPosition?: (position: { top: number; left: number }) => void
  /** 可选：阴影计算所需的尺寸；缺失时读取 scrollElement 的原生属性 */
  getMetrics?: () => { scrollTop: number; scrollHeight: number; clientHeight: number }
  /** 可选：订阅滚动；缺失时监听 scrollElement 的 scroll 事件 */
  onScroll?: (listener: () => void) => () => void
}
```

库内部统一通过适配器读写：

- `saveScroller` / `restoreScroller` 优先使用 `getPosition` / `setPosition`，缺失时读写 `scrollElement.scrollTop` / `scrollLeft`；
- `useScrollShadow` 优先使用 `getMetrics`，缺失时读取 `scrollElement` 的原生尺寸；
- 滚动监听优先使用 `onScroll`，缺失时监听 `scrollElement` 的 `scroll` 事件。

这样就可以按需选择契约的完整度：

- **只实现 `scrollElement`**：覆盖所有原生滚动型组件，这也是本次 Element Plus 需求的全部范围；
- **实现完整的可选方法**：覆盖 BetterScroll、虚拟滚动等非原生实现；
- **既不提供 `scrollElement` 也未实现可选方法**：按「没有自定义滚动容器」处理，退回默认 wrapper，不要抛错。

补充两点：

- `scrollContainer` 是全局 prop，同一次渲染里所有页签共用同一个滚动组件。如果确实需要「不同页签用不同滚动组件」，应使用作用域插槽方案（见下文备选方案），按 `tabId` / `pageId` 返回不同组件；一般不需要。
- 运行时切换 `scrollContainer` 时，缓存页只重新解析适配器并重新同步阴影，不重建 keep-alive 缓存页；解析不到新元素时退回默认 wrapper（与初始化时的回退一致）。

### 渲染结构

传入 `scrollContainer` 时，缓存页 wrapper 内部改为：

```tsx
<div
  ref={pageRoot}
  class="stack-tab__cache-page-wrapper"
  id={`W-${cacheName}`}
  style="height: 100%; overflow: hidden"
>
  <ScrollContainer ref={scrollContainerRef}>{pageVNode}</ScrollContainer>
  <PageLoading tabId={tabInfo.id!} />
</div>
```

> 示意代码：`ScrollContainer` 是上文的 `computed`，实际渲染时取 `.value`（或用 `resolveDynamicComponent`）。

注意：

- `PageLoading` 保持在滚动组件**外层**。它是覆盖整个内容区的遮罩，放进滚动容器会随内容滚动或被裁剪。
- 页面刷新动画的主体仍然是 wrapper（`runRefreshAnimation` 直接操作 `pageRoot` 的 class），不受影响。
- 不传 `scrollContainer` 时保持现有结构，`globalScroll` 继续控制 `overflow: auto | hidden`。

## 实现要点

### 1. 运行时上下文

`src/lib/hooks/stackTabsContext.ts`：

- `StackTabsRuntimeContext` 增加 `scrollContainer: Ref<Component | null>`。
- `CreateStackTabsRuntimeContextOptions` 增加 `scrollContainer?: Component`。
- `createStackTabsRuntimeContext` 中初始化为 `ref(options.scrollContainer ?? null)`。

`src/lib/StackTabs.vue`：

- props 增加 `scrollContainer?: Component`，默认 `undefined`。
- 创建上下文时传入。
- 参照现有 `max` / `globalScroll` / `sessionPrefix` 的写法，`watch(() => props.scrollContainer)` 同步到上下文。
- 与 `setGlobalScroll` 同模式，在 `useTabPanel` 暴露 `setScrollContainer`，或在 StackTabs 内直接写 `runtimeContext.scrollContainer.value`。

### 2. 解析滚动适配器

在 `pageComponentFactory.tsx` 的缓存页组件中：

```ts
const ScrollContainer = computed(() => runtimeContext.scrollContainer.value)
const scrollContainerRef = ref<StackTabsScrollAdapter | null>(null)

/** 没有自定义组件时，把 wrapper 当作适配器，保持默认路径不变 */
const getScrollAdapter = (): StackTabsScrollAdapter | null => {
  if (!ScrollContainer.value) return pageRoot.value ? { scrollElement: pageRoot.value } : null
  return scrollContainerRef.value
}
```

- 用 `computed` 读取 `runtimeContext.scrollContainer`，不要缓存 setup 时的值；这样运行时切换组件也能生效。
- `watch(ScrollContainer, ...)` 变化时重新解析适配器并 `scrollShadow.sync()`，不重建 keep-alive 缓存页。
- 适配器可能只实现 `scrollElement`，库在读写位置 / 尺寸时按「可选方法 → 原生属性」的顺序回退。
- 在 `onMounted` 的 `nextTick` 之后解析一次，并调用 `scrollShadow.sync()`。
- 在 `onActivated` 时重新解析后再 `scrollShadow.sync()` / `restoreScroller()`。
- 组件若异步加载或首帧尚未 expose，下一 tick 再解析一次；解析不到时按无滚动容器处理，不要抛错。
- SSR 安全：只在 `document` 存在且组件已挂载后访问 DOM。

### 3. 滚动位置记忆

`src/lib/hooks/tabPanel/scroll.ts` 目前用选择器 `#W-${cacheName}` 定位主滚动容器。使用自定义滚动组件后，真实滚动元素在组件内部，无法用选择器表达。建议：

- 为每个 pageCacheId 维护一个滚动适配器引用（或主滚动元素），`saveScroller` / `restoreScroller` 通过适配器的 `getPosition` / `setPosition` 读写，缺失时回退到原生 `scrollTop` / `scrollLeft`；
- `scrollPositionsByPageId` 继续保存数值（`top` / `left`），不需要改成元素引用；
- 现有 `addPageScroller(cacheName, '#W-...')` 在存在 `scrollContainer` 时跳过**主 wrapper 的注册**；`useTabRouter().addScrollTarget()` 注册的页面内其他滚动元素继续生效；
- 自定义滚动组件内部的滚动不会冒泡成 wrapper 的 scroll 事件，位置保存只会在 `onDeactivated` 时由库主动读取，符合现有逻辑。

### 4. 滚动阴影

阴影需要可用的尺寸与滚动事件。适配器提供 `scrollElement` 时按现有逻辑接入；没有原生滚动元素时，阴影可以关闭，不影响位置记忆：

```ts
const getShadowTarget = (): HTMLElement | null => getScrollAdapter()?.scrollElement ?? null

useScrollShadow({
  target: getShadowTarget,
  classTarget: () => pageRoot.value?.parentElement ?? null
})
```

- 有原生 `scrollElement`（含只实现 `scrollElement` 的组件）：逻辑与现在完全一致。
- 适配器实现 `getMetrics` / `onScroll` 时，`useScrollShadow` 应优先使用它们，而不是读取元素的 `scrollHeight` / `clientHeight` 或监听 `scroll` 事件。
- 两类可选方法的实现方式：给 `useScrollShadow` 增加可选的 `getMetrics` / `onScroll` 注入（不传时沿用现有的原生尺寸读取与 `scroll` 监听）；如果首版不想扩展该 hook，也可以只支持有 `scrollElement` 的组件，命令式组件暂时不显示阴影。
- `scrollElement` 与 `getMetrics` / `onScroll` 都不可用（例如纯 `transform` 滚动且未实现可选方法）时，`target` 返回 `null`，阴影自动不显示；滚动与位置记忆仍由 `getPosition` / `setPosition` 负责。

### 5. 类型与导出

- `scrollContainer?: Component` 直接作为 `StackTabs` 的 prop 类型，无需额外导出。
- 建议导出契约类型，方便宿主实现：

  ```ts
  export interface StackTabsScrollAdapter {
    scrollElement: HTMLElement | null
    getPosition?: () => { top: number; left: number }
    setPosition?: (position: { top: number; left: number }) => void
    getMetrics?: () => { scrollTop: number; scrollHeight: number; clientHeight: number }
    onScroll?: (listener: () => void) => () => void
  }
  ```

  原生滚动组件只需要实现 `scrollElement`，其余方法都是可选的。也可以额外导出一个 `StackTabsScrollElementInstance` 之类的窄类型，避免宿主被可选方法干扰。

- 如果库内使用 `defineSlots`，保持现有的 `leftButton` / `rightButton` / `iframeLoading` / `iframeError` 插槽不变。

## 关键注意事项

- **不要把滚动容器放到 wrapper 外层。** 那会让所有页签共享滚动位置，并且库无法感知滚动元素。
- **不要用「隐藏原生滚动条 + 自绘滚动条」的方式实现。** 真正的滚动仍然发生在 wrapper 上，滚动位置记忆与阴影仍绑定 wrapper，只是视觉替换，不是本需求。
- **不要让库依赖 Element Plus。** 契约只有「渲染默认插槽 + `scrollElement` / 可选适配器方法」，任何滚动组件都可以接入。
- **契约不能绑定某个库的字段名。** 库只认 `scrollElement` 与可选适配器方法，不得读取 `wrapRef` 等具体实现字段，否则就只能适配 Element Plus。
- **可选能力缺失时必须降级，不能报错。** 缺 `getPosition` 时读原生 `scrollTop`，缺 `getMetrics` 时读原生尺寸，缺 `onScroll` 时监听原生 `scroll`；都没有则关闭阴影。
- **不要改变不传 `scrollContainer` 时的行为。** 默认路径必须与当前版本一致：`overflow:auto|hidden`、`#W-<cacheName>`、`scrollPositionsByPageId`、阴影、刷新动画、iframe 页签全部保持。
- **不要强制要求 `global-scroll` 关闭。** 传入 `scrollContainer` 时 wrapper 恒为 `overflow: hidden`，`globalScroll` 只对默认路径生效；这样可以避免宿主同时维护两个开关。若希望语义更严格，也可以在文档中声明「`scrollContainer` 优先于 `globalScroll`」。
- **PageLoading 放在滚动组件外。** 它依赖 `position` 与 z-index 覆盖整个页面区域。
- **组件必须渲染默认插槽。** 否则页面内容不会显示；这一点写进文档和示例。

## 备选方案：作用域插槽

如果希望宿主按页签定制不同的滚动组件，也可以提供作用域插槽：

```vue
<slot
  name="pageScroll"
  :page="pageVNode"
  :tab-id="tabInfo.id"
  :page-id="cacheName"
  :set-scroll-element="setScrollElement"
/>
```

但插槽方案需要把页面 vnode 交给宿主渲染，并额外处理刷新动画、多根节点页面、`PageLoading` 与缓存 key，实现和类型成本都明显更高。除非有「每页签不同滚动组件」的真实需求，**推荐使用 `scrollContainer` prop**。

## 验收标准

1. **默认路径不变**：不传 `scrollContainer` 时，2.5.1 的行为完全一致——`global-scroll` 开关、滚动位置记忆、上下阴影、刷新动画、iframe 页签、session 恢复。
2. **接入 Element Plus 后**：
   - 内容区滚动条由 `ElScrollbar` 渲染，不再出现原生滚动条；
   - 内容不足一屏时不显示滚动条，超出时出现 Element Plus 滚动条；
   - 每个页签独立记忆滚动位置，切走再切回能恢复；
   - 关闭页签再打开（非缓存）从顶部开始；
   - 刷新页签时 wrapper 的离场 / 入场动画正常，页面内容正确重建；
   - 上下滚动阴影仍按 `scrollElement` 的滚动位置正确切换；
   - iframe 页签不受影响。
3. **库不新增运行时依赖**：`package.json` 的 `dependencies` 不变，SSR（`ssr: false` 或 SSR 模式）下不访问未挂载的 DOM。
4. **构建与测试**：`pnpm build`、`pnpm test`、`pnpm type-check` 通过；新增至少一个单元测试覆盖「传入自定义滚动组件时，滚动位置从 `scrollElement` 或 `getPosition` / `setPosition` 读写」和「不传时仍使用 wrapper」。
5. **多组件通用性**：至少用两种不同实现验证——Element Plus `ElScrollbar`（只实现 `scrollElement`）和一个命令式滚动组件（BetterScroll，或在测试中模拟 `getPosition` / `setPosition` / `onScroll`），确认位置保存 / 恢复、阴影降级与默认路径都正确。

## 兼容性说明

- `scrollContainer` 是新增可选 prop，不改变默认行为，按 minor 版本发布。
- 宿主示例中的 `wrapRef` 是 `ElScrollbar` 的公开 expose 字段（`element-plus >= 2.14`），不属于内部实现。
- 若后续要支持「运行时切换滚动组件」，按实现要点 2 的方式只重新解析适配器并重新同步阴影，不重建 keep-alive 缓存页；若实现成本过高，也可以退一步，在文档中声明该 prop 只在初始化时读取。

## 可选：文档补充

如果采纳，建议在组件文档中补一节「自定义滚动容器」，说明：

- prop 与组件契约；
- `PageLoading` 不在滚动容器内的原因；
- 与 `pageScroll` 模式的优先级；
- Element Plus / 其他滚动组件的适配示例。

## 本仓库接入方式（vue-stack-tabs 3.0）

- `../app/components/layout/PageScroll.vue`：`el-scrollbar` 适配组件，`expose({ scrollElement })` 指向 `scrollbar.wrapRef`。
- `app/layouts/default.vue`：`<VueStackTabs :page-scroll="PageScroll" ...>`。3.0 起 `pageScroll`（`'native' | 'none' | Component`，默认 `'none'`）取代 `scrollContainer` 与 `globalScroll`，接入自定义组件后所有页签统一由 `el-scrollbar` 承载滚动。
- 每个缓存页 wrapper 变为 `overflow: hidden`，滚动由 `el-scrollbar` 承载；切页签时库通过适配器保存 / 恢复位置，不再使用 `#W-<cacheName>` 选择器。
- 页面自身不再是滚动容器，页面内无需再包一层 `PageScroll`；需要固定布局的页面可以使用 `SearchFrame`。
- 已知行为：从普通页签切到 iframe 页签再切回时，`vue-stack-tabs` 会在面板隐藏状态下保存位置，读取到 `scrollTop = 0`，因此位置回到顶部。2.5.1 的原生滚动路径同样存在该行为，不是自定义滚动容器引入的；如需修复，应在库侧改为「可见时再保存」或延迟到 `onActivated` 前保存。
