# 样式使用说明

本项目同时使用 **SCSS** 和 **Tailwind CSS v4**。两者不是二选一，而是各管一层：Tailwind 负责一次性的布局与微调，SCSS 负责组件封装与 CSS 变量表达不了的能力（混合宏、断点、父选择器）。

---

## 1. 分层模型

样式按职责分五层，先判断"这段样式属于谁"，再决定写在哪：

```
┌──────────────────────────────────────────────┐
│ utilities（Tailwind 工具类）                  │  一次性布局 / 微调
├──────────────────────────────────────────────┤
│ 未分层（SFC scoped / Element Plus / normalize）│  组件封装与第三方样式
└──────────────────────────────────────────────┘

基础令牌   tokens.css / density.css
组件库适配 adapters/*.css
Tailwind   tailwind.css
基础排版   base.scss
页面共享   pages.scss（.page 及其 BEM）
布局样式   layouts/*.vue
页面样式   pages/**/*.vue
组件样式   components/*.vue
```

### 层顺序

`app/assets/css/tailwind.css` 第一行显式声明了层顺序：

```css
@layer theme, base, components, utilities;
```

**这一行不能删。** 如果不声明，`@layer components` 会按首次出现顺序排到 `utilities` 之后，Tailwind 工具类将永远无法覆盖组件样式。

### 为什么第三方适配和基础排版不在 layer 中

`../app/assets/scss/base.scss` 只做文档级排版；第三方主题映射在 `app/assets/css/adapters/*.css`。

| 区块                                                                                     | 是否分层   | 原因                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adapters/*.css` 的 `:root:root { --el-* }`、`:root:root { --vxe-ui-* }`、`body`、`html` | **未分层** | Element Plus、VXE、vue-stack-tabs、vue-lite-layer、modern-normalize 的样式都是未分层的。按 CSS Cascade Layers 规范，**未分层声明优先于任何 `@layer`**。这些覆盖如果放进 layer，会被组件库反向覆盖。 |

页面共享的 `.page` 排版在 `../app/assets/scss/pages.scss`，位于 `@layer components`，因此可以被工具类覆盖（如 `<section class="page mt-6">` 中的 `mt-6`）。

### 为什么 SFC 的 `<style scoped>` 没有包进 layer

SFC 里的 `scoped` 样式默认是未分层的，优先级最高。这是有意保留的：

- `:deep(.el-input__wrapper)` 这类规则需要覆盖 Element Plus 的未分层样式。**一旦包进 `@layer components`，就会输给 Element Plus**。
- 组件内部样式是封装的最终形态，通常不希望被外部工具类意外改动。

如果确实需要用 Tailwind 工具类覆盖组件内部样式，有三种做法（按推荐顺序）：

1. 把该工具类加在模板中，并用 `!` 后缀提升优先级：`class="mt-6!"`（Tailwind v4 的 important 修饰符是后缀）。
2. 把这条规则从 SFC 移入 `pages.scss` 的 `@layer components`。
3. 在组件内用 `@include media-up()` 等 SCSS 能力重写，而不是叠加工具类。

---

## 2. 文件职责

| 文件                                           | 层级     | 职责             | 允许写什么                                        |
| ---------------------------------------------- | -------- | ---------------- | ------------------------------------------------- |
| `app/assets/css/tokens.css`                    | 基础     | 设计令牌唯一来源 | 跨布局 / 页面 / 组件复用的 CSS 变量、深浅色语义层 |
| `app/assets/css/density.css`                   | 基础     | 密度令牌         | `data-density` 三档下的控件高度、字号、间距       |
| `app/assets/css/adapters/*.css`                | 基础     | 组件库适配       | 只做"项目令牌 -> 库变量/类"的映射，不写业务外观   |
| `app/assets/css/tailwind.css`                  | 基础     | Tailwind 入口    | 层顺序声明、`@theme inline` 映射                  |
| `../app/assets/scss/base.scss`                 | 基础     | 文档级排版       | `html` / `body` / `#__nuxt` 排版                  |
| `../app/assets/scss/pages.scss`                | 页面共享 | 页面公共排版     | `.page` 及其 BEM 修饰                             |
| `app/layouts/*.vue`                            | 布局     | 外壳样式         | 布局专用类；颜色优先用全局语义令牌                |
| `app/pages/**/*.vue`                           | 页面     | 页面私有样式     | BEM 块、页面专用 `--login-*` 等局部令牌           |
| `app/components/*.vue`                         | 组件     | 组件私有样式     | 组件外观、`:deep()` 覆盖                          |
| `app/config/appearance.ts`                     | 配置     | 外观配置唯一来源 | 主题色预设、密度档位与组件库尺寸映射              |
| `app/composables/useAppearance.ts`             | 状态     | 外观状态         | 应用、持久化、多标签同步、VXE 主题                |
| `app/components/global/AppearanceSwitcher.vue` | 组件     | 外观面板 UI      | 只消费 `useAppearance()`，不直接改 DOM            |
| `app/assets/scss/_mixins.scss`                 | 工具     | SCSS 能力        | 断点、mixin、函数；**不放颜色**                   |

**边界规则**：

- 基础文件（`tokens.css` / `base.scss` / `pages.scss`）里不写布局或页面的私有视觉。
- 只被一个布局使用的值 → 定义在该布局根元素上（如布局根元素上的局部变量）；颜色类值优先用全局语义令牌，保证深浅色模式自动跟随。
- 只被一个页面使用的值 → 定义在该页面根元素上（如 `pages/index.vue` 的 `--login-*`）。
- 不要为了"集中"把页面专用值塞进 `tokens.css`；`tokens.css` 只放跨层复用的设计系统令牌。
- 页面/布局私有值允许在组件内写成 CSS 变量，但不能提升到全局 `:root`。

---

## 3. 设计令牌

### 命名分组

| 前缀                                       | 用途                                    | 示例                                                              |
| ------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------- |
| `--brand-seed`                             | 用户选中的主题色种子（内联在 `<html>`） | `#409eff`                                                         |
| `--brand-tint` / `--brand-shade`           | 色阶派生基底（浅色混白、深色混表面色）  | `white` / `var(--bg-surface)`                                     |
| `--brand-*`                                | 品牌色及色阶                            | `--brand-primary`、`--brand-primary-surface`、`--brand-primary-3` |
| `--fg-*`                                   | 文本颜色                                | `--fg-strong`、`--fg-default`、`--fg-muted`                       |
| `--bg-*`                                   | 背景色                                  | `--bg-page`、`--bg-surface`、`--bg-elevated`、`--bg-inverse`      |
| `--border-*`                               | 边框色                                  | `--border-default`                                                |
| `--control-*`                              | 密度：控件高度                          | `--control-height`、`--control-height-sm`                         |
| `--ui-font-size*`                          | 密度：控件字号                          | `--ui-font-size`、`--ui-font-size-sm`                             |
| `--density-gap` / `--table-cell-padding-y` | 密度：间距                              | `12px`                                                            |
| `--radius-*`                               | 圆角                                    | `--radius-xs` ~ `--radius-xl`                                     |
| `--scrollbar-*`                            | 滚动条尺寸                              | `--scrollbar-size`、`--scrollbar-offset`                          |
| `--elevation-*`                            | 阴影                                    | `--elevation-panel`、`--elevation-modal`、`--elevation-focus`     |
| `--transition-*`                           | 动效                                    | `--transition-fast`                                               |
| `--info`                                   | 状态色                                  | `--info`                                                          |
| `--ambient-*`                              | 动态氛围背景（auth / 工作区共用）       | `--ambient-base`、`--ambient-color-*`、`--ambient-grid-*`         |

### 色阶是派生的，不要写死

`tokens.css` 只维护 `--brand-seed` 一个原始色值，`--brand-primary-dark/light/soft/muted/border/surface` 和 Element Plus 的 `-3 ~ -9` 梯度都由 `color-mix()` 派生：

```css
--brand-primary-3: color-mix(in srgb, var(--brand-primary), var(--brand-tint) 30%);
```

- 浅色模式 `--brand-tint: white`，梯度向白混。
- 深色模式 `html.dark` 把 `--brand-tint` 改成 `var(--bg-surface)`、`--brand-shade` 改成 `white`，同一套派生规则自动变深。
  - 这里必须混**深色表面**而不是纯黑：Element Plus 深色官方算法就是 `light-N = 主色混入 N*10% 的深色背景`（见 `theme-chalk/src/dark/var.scss`）。混纯黑会把 `light-9` 压得比菜单背景还暗，菜单 hover 直接看不见。细节对照见 `docs/theme-color-analysis.md`。
- 切换主题色时只需要在 `<html>` 上写内联的 `--brand-seed`，所有派生值自动更新，**不需要 JS 算色阶**。

### 深色模式的语义层

`html.dark` 只覆盖语义令牌（`--fg-*`、`--bg-*`、`--border-*`、`--elevation-*`），并切换色阶派生基底。业务样式只要用语义令牌，深浅色就自动成立：

```scss
.card {
  background: var(--bg-surface);
  color: var(--fg-default);
  border: 1px solid var(--border-default);
}
```

不要在业务样式里写 `#fff`、`rgba(...)`、`slate-*` 之类的固定颜色，否则深色模式下会失效。

### 局部队令（不属于 tokens.css）

只被单个布局/页面使用的值，定义在对应根元素上，不进入全局 `:root`：

| 前缀        | 归属                               | 示例                                 |
| ----------- | ---------------------------------- | ------------------------------------ |
| `--login-*` | `pages/index.vue` 的 `.login-card` | `--login-shadow`、`--login-input-bg` |

```scss
.login-card {
  // 只在本页面生效，不会污染全局 :root
  --login-shadow: 0 30px 80px rgb(2 6 23 / 0.45);
  box-shadow: var(--login-shadow);
}
```

### 在 SCSS / CSS 中使用

```scss
<template>
  <div class="card">...</div>
</template>

<style scoped lang="scss">
.card {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--elevation-modal);
  color: var(--fg-default);
}
</style>
```

### 需要透明度时

不要在 SCSS 里拼 `rgba()`，用 `color-mix()`：

```scss
// 旧写法（已废弃）
background: rgba($color-primary, 0.12);

// 新写法
background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
```

### 新增一个值：先选层级

1. 跨布局 / 页面 / 组件复用，或属于设计系统 → 加到 `tokens.css`。
2. 只被一个布局使用 → 定义在该布局根元素上；能引用全局令牌就不要新建色值。
3. 只被一个页面使用 → 定义在该页面根元素上，如 `--login-*`。
4. 需要 Tailwind 工具类 → 在 `tailwind.css` 的 `@theme inline` 中加映射（只映射基础令牌）：
   ```css
   --color-accent: var(--brand-accent);
   ```
5. 在本文档的令牌表里补一行。

---

## 4. 外观切换（主题色 / 明暗 / 密度）

header 右侧的 `AppearanceSwitcher` 提供三组切换：主题色（10 套预设）、明暗、密度（紧凑 / 标准 / 宽松）。状态在 `app/composables/useAppearance.ts`，配置在 `app/config/appearance.ts`。

### 数据流

```
AppearanceSwitcher.vue（只调 useAppearance）
        ↓
useAppearance（模块级单例 + localStorage）
        ↓
<html class="dark" data-density="compact" style="--brand-seed: #7c3aed">
        ↓
tokens.css → density.css → adapters/*.css → 组件库与业务样式
```

`useAppearance` 只往 DOM 写三样东西：

1. `classList.toggle('dark')` —— Element Plus 的 `dark/css-vars.css` 和我们的 `html.dark` 语义层都靠它。
2. `dataset.density` —— 命中 `density.css` 的三档令牌。
3. 内联 `--brand-seed` —— 驱动全部紫色阶。

### 新增主题色

只改 `app/config/appearance.ts` 的 `THEME_PRESETS`，不要改 CSS：

```ts
export const THEME_PRESETS = [
  // ...
  { id: 'cyan', label: '青蓝', color: '#0891b2' }
]
```

主题色只能使用**非状态语义色相**（蓝 / 青 / 紫 / 品红）。绿、橙、红、灰分别被 `success` / `warning` / `danger` / `info` 占用，品牌色落在这些色相上会和状态反馈混淆。

安全色域内的色相位置已经不多，新增预设优先用**明度差**（深色档）与现有预设拉开距离；挑选时核对两点：浅色模式下种子色与白字对比度不低于 4.5:1，深色模式下提亮后的主色与 `#141414` 对比度不低于 3:1。

深色模式下的提亮由 `tokens.css` 的 `html.dark` 规则统一处理。

### 新增密度档位

改三处：

1. `density.css`：新增档位的 CSS 令牌。
2. `config/appearance.ts` 的 `DENSITY_OPTIONS`：补 `elSize`、`vxeSize`、`stackTabSize`。
3. `nuxt.config.ts` 首屏脚本里的密度映射表：避免刷新时先闪一下默认尺寸。

### 各库的接入方式

| 库             | 颜色                                                                                               | 尺寸                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Element Plus   | `adapters/element-plus.css` 映射 `--el-*`                                                          | `ElConfigProvider :size` + `--el-component-size*`                                         |
| VXE Table      | `adapters/vxe-table.css` 映射 `--vxe-ui-*`                                                         | `app.vue` 里 `provide('xeSizeInfo', vxeSize)`                                             |
| vue-stack-tabs | `adapters/vue-stack-tabs.css` 将主色、表面、文字、边框和阴影映射到 Element Plus 变量               | `data-stack-tab-size`（compact→small / default→normal / comfortable→large）               |
| vue-lite-layer | `adapters/vue-lite-layer.css` 将语义色、文本、边框、填充、背景、遮罩和阴影映射到 Element Plus 变量 | `theme.size`（compact→small / default→default / comfortable→large），由 `useLayer()` 注入 |

状态色以 Element Plus 的 `primary / success / warning / danger / info / error` 为基准。自定义主题在 `adapters/element-plus.css` 中调整各状态的基础色及明暗色阶；VXE 适配层须同时映射基础色、浅底、提亮、按下和禁用态。新增状态组件时，检查它实际消费的变量及浅色、深色效果，不能只核对基础色。

**VXE 尺寸为什么不用 `VxeUI.setConfig({ size })`**：它的全局 size 只在组件创建时被读成 `props.size` 的默认值，之后切换不会作用到已挂载的表格。`useSize` 优先读 `props.size`，再读 `inject('xeSizeInfo')`，所以根组件 provide 一个 `computed` 是唯一能实时生效的方式。不要再往 `setConfig` 里写 size。

VXE 原生有六档：`mini / small / medium / default / large / xlarge`，表格行高依次为 36 / 40 / 44 / 48 / 52 / 54px。项目的紧凑 / 标准 / 宽松对应 `mini / small / medium`（行高 36 / 40 / 44px）。标准档落在 VXE 的 small 档上，适配层因此把 `--vxe-ui-font-size-small` 提到 14px，与 Element Plus 的默认字号一致；紧凑档保持 mini 的 12px。分页、输入和按钮跟随同一 VXE 档位，保留原生尺寸关系。

### 新增一个组件库

接入前先做一次"深色方案审查"，不要直接把项目语义令牌整套映射过去。

1. **确认库是否自带深色方案**

   读库的 `dist` 产物或源码，搜索 `.dark`、`[data-theme]`、`prefers-color-scheme`、`--<前缀>-*` 变量。

   - 有深色方案 → 进入第 2 步。
   - 没有深色方案 → 才考虑用项目语义令牌整套映射，或按类名覆盖。

2. **分析它的深色语义**

   - `surface` 是否有层级？例如 `surface` 与 `surface-muted` 在深色下谁更亮。
   - `text` 分几档？深色下是纯白、浅灰白还是更暗的灰？
   - `border`、`shadow` 在深色下是加深、提亮，还是改用描边？
   - 哪些值是"组件专属的层次"，换成项目通用令牌会破坏视觉关系？

3. **按组件实际使用的变量映射颜色和尺寸**

   - 主色和五种状态色分别核对基础、悬停、按下、浅底、禁用变量；状态色应保留成功、警告、危险等语义。
   - 表面、文字、边框和阴影映射到 Element Plus 对应层级；核对库自身的激活、非激活和浮层关系。
   - 尺寸按 Element Plus 三档映射，库中没有对应档位的行高等值需明确记录并单独检查。

4. **新建适配文件并登记**

   - 新建 `app/assets/css/adapters/<库名>.css`。
   - 用普通 `:root`。只有当库的暗色块特异性更高（如 `:root.dark`）时才需要提高特异性；优先推动库改用 `:where()`，而不是长期用 `:root:root`。
   - 在 `nuxt.config.ts` 的 `css` 数组里登记（放在 `density.css` 之后）。

5. **如果库有 JS 尺寸配置**，在 `useAppearance` 或 `app.vue` 里接一次。

6. **验证**

   - 浅色、深色两组截图，重点看表面层次、文字对比度、阴影可见度。
   - 切换主题色时，检查品牌色、各状态色及其交互色阶；同时确认库自己的层次没有被破坏。

vue-stack-tabs 的 small / normal / large 原生页签高度为 32 / 40 / 48px，菜单项高度为 26 / 30 / 36px，优先保留原生尺寸。原生字号为 12 / 14 / 16px；Element Plus 大档控件仍使用 14px，因此适配层仅将 large 字号调整为 14px。右键菜单保留原生间距，外框使用 Element Plus 圆角，菜单项使用方形悬停面。非激活页签和阴影层次仍需结合实际界面核对。

vue-lite-layer 的尺寸使用 small / default / large 三档，通过 `data-lite-layer-size` 切换；标题栏高度与间距保留库原生值（small 标题高度提到 40px，default / large 为 40 / 48px），标题字号 small 14px、default / large 16px，按钮字号与圆角仍对齐 Element Plus（14 / 14 / 14px 与 2 / 4 / 4px）。颜色令牌全部映射到 `--el-*`，遮罩使用 `--el-overlay-color-lighter`，窗口阴影使用 `--el-box-shadow`。弹层**不设置 `theme.mode`**：库在未显式设置时不写 `data-lite-layer-theme`，由 `html.dark .lite-layer` 跟随项目明暗，避免系统深色偏好与项目明暗不一致。弹层内容区的 Element Plus 组件通过调用点继承 `ElConfigProvider`，无需为弹层单独配置语言。

Nuxt 模块默认会把库样式追加到 CSS 列表末尾，会排在适配层之后；因此 `nuxt.config.ts` 中给 `vueLiteLayer` 设置 `css: false`，由 `css` 数组手动登记 `vue-lite-layer/style.css`，保持“库样式 -> 适配层”的顺序。

### 首屏防闪

`nuxt.config.ts` 的 `app.head.script` 会在渲染前读 localStorage 并写 `<html>`。脚本里的键名 `podium:appearance` 必须与 `APPEARANCE_STORAGE_KEY` 保持一致。

---

## 5. Tailwind 用法

### 已映射的令牌

`@theme inline` 中映射后，可直接生成工具类：

| 令牌                                                     | 可用工具类                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `--color-primary`                                        | `text-primary`、`bg-primary`、`border-primary`、`ring-primary`、`hover:bg-primary-dark` … |
| `--color-primary-{dark,light,soft,muted,border,surface}` | `text-primary-light`、`bg-primary-surface` …                                              |
| `--color-page` / `--color-surface`                       | `bg-page`、`bg-surface`                                                                   |
| `--color-secondary` / `--color-muted` / `--color-strong` | `text-secondary`、`text-muted`、`text-strong`                                             |
| `--color-line`                                           | `border-line`                                                                             |
| `--color-info`                                           | `text-info`、`bg-info`                                                                    |
| `--radius-base` / `--radius-panel` / `--radius-card`     | `rounded-base`、`rounded-panel`、`rounded-card`                                           |
| `--shadow-panel` / `--shadow-modal`                      | `shadow-panel`、`shadow-modal`                                                            |

透明度修饰符同样可用：`border-primary/40`、`shadow-primary/10`。

### 什么时候用 Tailwind

适合：

- 布局：`flex`、`grid`、`items-center`、`justify-between`、`gap-3`
- 间距：`p-5`、`mt-6`、`space-y-2`
- 一次性排版：`text-sm`、`truncate`、`max-w-[180px]`
- 状态样式：`hover:-translate-y-0.5`、`transition duration-150`

不适合：

- 需要复用的组件块 → 用 SCSS 写 BEM 类
- 覆盖 Element Plus 内部结构 → 用 SCSS + `:deep()`
- 多值背景、复杂渐变、动画关键帧 → 用 SCSS

```vue
<!-- 推荐：原子类做布局，语义类做封装 -->
<div class="flex items-center justify-between gap-3">
  <span class="text-[15px] font-bold uppercase tracking-[0.12em] text-primary">Podium</span>
  <el-button>退出登录</el-button>
</div>
```

### 重复出现的块不要复制工具类

同一个块在页面上出现多次时，复制长串工具类会很快失控，也容易漏改颜色：

```vue
<!-- 反例：三张卡片复制同一串默认色板类 -->
<button
  class="group flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-5
               text-left transition duration-150 hover:-translate-y-0.5
               hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
>
  <span class="text-2xl">🧩</span>
  <span class="text-base font-semibold text-slate-800">关于页签</span>
  <span class="text-[13px] leading-relaxed text-slate-500">...</span>
</button>

<!-- 正例：抽成 BEM + 令牌，模板只留语义类 -->
<button class="page-card" @click="openPage('/admin/about', '关于页签')">
  <span class="page-card__icon">🧩</span>
  <span class="page-card__title">关于页签</span>
  <span class="page-card__desc">...</span>
</button>
```

对应样式（组件私有，放在页面 scoped 中）：

```scss
.page-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: inherit;
  font: inherit;
  text-align: left;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--brand-primary) 40%, transparent);
    box-shadow: 0 20px 25px -5px color-mix(in srgb, var(--brand-primary) 10%, transparent);
  }

  &__title {
    color: var(--fg-strong);
    font-size: 16px;
    font-weight: 600;
  }

  &__desc {
    color: var(--fg-muted);
    font-size: 13px;
    line-height: 1.625;
  }
}
```

注意 `<button>` 在没有 Preflight 的情况下不会自动继承字体，抽成 SCSS 时记得写 `font: inherit`。

### 没有引入 Preflight

为了不重置 Element Plus，`tailwind.css` 只导入了 `theme` 和 `utilities`，**没有 Preflight**。代价是：

- `h1`、`p`、`ul` 等标签仍带浏览器默认 `margin`。正文区域请用 `.page` 类或自行显式设置 `m-0`。
- 不要在依赖 Preflight 的地方假设 `box-sizing: border-box` 之外的默认值（`modern-normalize` 已处理 `box-sizing`）。
- v4 的 `border-*` 依靠 `--tw-border-style` 的初始值工作，无需 Preflight，可以放心使用。

### 在 SCSS 中复用工具类（`@apply`）

Tailwind v4 的 `@apply` 需要知道主题上下文。SFC 的 `<style>` 是独立编译的，必须先 `@reference`：

```scss
<style scoped lang="scss">
@reference '~/assets/css/tailwind.css';

.toolbar {
  @apply flex items-center gap-2 px-4 py-2;
}
</style>
```

注意：

- `@reference` 只用于编译期解析，不会重复输出样式。
- 如果只是普通布局，优先直接在模板写 class，不要为了"看起来统一"而滥用 `@apply`。
- `@apply` 不能跨 `@layer` 使用；需要覆盖第三方时仍用普通 CSS 属性。

---

## 6. SCSS 用法

### 断点

`_mixins.scss` 提供移动优先的断点：

```scss
@use '~/assets/scss/mixins' as *;

.panel {
  padding: 16px;

  @include media-up(md) {
    padding: 24px;
  }

  @include media-down(sm) {
    display: none;
  }
}
```

可用断点：`sm` 640px、`md` 768px、`lg` 1024px、`xl` 1280px。

### 覆盖 Element Plus

```scss
.info-list {
  :deep(.el-descriptions__label) {
    color: var(--fg-muted);
  }
}
```

这类规则必须留在 SFC 的 scoped 样式中（未分层），不要移入 `@layer components`。

### 命名

沿用 BEM：

```scss
.app-layout {
  &__aside { ... }
  &__main { ... }
}
```

Tailwind 工具类与 BEM 类可以同时出现在一个元素上：

```vue
<el-header class="flex items-center justify-between border-b border-line bg-surface" height="56px">
```

---

## 7. 常见场景对照

| 需求                           | 写法                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| 给 `.page` 内的区块加间距      | 模板写 `class="mt-6"`                                                                         |
| 新增一个可复用的卡片           | SFC scoped 中写 `.my-card { ... }`                                                            |
| 切换品牌主色                   | header 的外观面板；默认值改 `tokens.css` 的 `--brand-seed`，预设列表改 `config/appearance.ts` |
| 让 Element Plus 主色跟随品牌色 | 无需改动，`adapters/element-plus.css` 已映射到 `--el-color-primary`                           |
| 让新样式支持深色模式           | 只用语义令牌（`--bg-surface`、`--fg-default`、`--border-default`），不写裸色值                |
| 控件高度 / 字号跟随密度        | 用 `--control-height`、`--ui-font-size`、`--density-gap`                                      |
| 半透明品牌色背景               | `color-mix(in srgb, var(--brand-primary) 12%, transparent)`                                   |
| 临时覆盖组件内边距             | 模板写 `class="p-0!"`，或把规则移入 `@layer components`                                       |
| 响应式隐藏                     | `hidden md:block`，或 `@include media-up(md)`                                                 |

---

## 8. 检查清单

提交样式改动前自查：

- [ ] 基础文件（`tokens.css`、`density.css`、`base.scss`、`pages.scss`）里没有布局/页面私有视觉。
- [ ] 页面中没有残留 Tailwind 默认调色板类（`slate-*`、`gray-*`、`indigo-*` 等），正式样式用语义令牌类（`text-secondary`、`border-line`、`bg-surface`）。
- [ ] 同一个块出现多次时，已抽成 BEM 类，而不是复制工具类。
- [ ] 新值已按层级放置：跨层 → `tokens.css`；密度 → `density.css`；单页面 → `--login-*` 等局部令牌。
- [ ] 新增颜色先找语义令牌，没有才加；不在页面里写裸色值。
- [ ] 深浅两种模式都检查过：切换 header 的明暗后，背景、文字、边框、阴影都正常。
- [ ] 切换主题色后没有"漏网"的固定色（尤其是焦点环、渐变、hover 阴影）。
- [ ] 新增组件库时已确认它是否自带深色方案；有的话先分析其深色语义，再决定映射范围。
- [ ] 没有用项目通用语义令牌整套覆盖库的组件专属层次（`surface-muted`、`border`、`shadow`）。
- [ ] 新增组件库时已建 `adapters/<库名>.css`，并在 `nuxt.config.ts` 登记。
- [ ] VXE 的尺寸没有写进 `VxeUI.setConfig`，而是走 `app.vue` 的 `xeSizeInfo`。
- [ ] 页面共享排版放在 `pages.scss` 的 `@layer components` 内。
- [ ] 第三方（Element Plus / VXE / vue-stack-tabs / vue-lite-layer / normalize）覆盖保持未分层。
- [ ] 没有删除 `tailwind.css` 顶部的 `@layer theme, base, components, utilities;`。
- [ ] 用 `@apply` 的 SFC 已加 `@reference '~/assets/css/tailwind.css';`。
- [ ] 构建产物中 Tailwind 工具类仍然生效（`pnpm build` 后检查 `.output/public/_nuxt/entry.*.css`）。

---

## 9. 排查优先级问题

当某条样式"没生效"时，按以下顺序排查：

1. **元素上同时有 scoped 类和工具类** → scoped 未分层，会赢。用 `!` 后缀或把规则移入 `@layer components`。
2. **覆盖 Element Plus 失败** → 检查规则是否被误放进 layer；必须未分层，必要时提高特异性（如 `:root:root`）。
3. **切换主题色后某处没变** → 该处大概率写了固定色值或别处硬编码的 `rgb(...)`，改成 `var(--brand-*)` 或 `color-mix()`。
4. **深色模式下某块仍是浅色** → 检查是不是用了 `#fff` / `bg-white` / 写死的 `--bg-*`，改成语义令牌。
5. **切换密度后某个库的尺寸没变** → 确认该库的尺寸入口已接：EP 走 `ElConfigProvider`，VXE 走 `xeSizeInfo`，纯 CSS 控件用 `--control-height`。
6. **刷新后外观状态丢失或闪一下** → 检查 `nuxt.config.ts` 首屏脚本的 localStorage 键名是否与 `APPEARANCE_STORAGE_KEY` 一致。
7. **工具类被 `.page` 覆盖** → 确认 `pages.scss` 的 `.page` 在 `@layer components` 内，且 `tailwind.css` 的层顺序声明存在。
8. **Tailwind 类完全没生成** → 检查该类是否来自已映射的令牌命名空间；未映射的自定义变量不会生成工具类。
9. **构建后样式顺序异常** → 检查 `nuxt.config.ts` 的 `css` 数组顺序是否为 `tokens.css` → `tailwind.css` → `base.scss` → `pages.scss`。
