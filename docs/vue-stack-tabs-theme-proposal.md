# vue-stack-tabs 主题化改造建议

> 状态：本建议已在 `vue-stack-tabs@2.5.0` 实现（主题变量、深色模式、阴影分层均已落地）。本文档保留作为设计记录，实际接入方式见 `app/assets/css/adapters/vue-stack-tabs.css`。

> 适用版本：`vue-stack-tabs@2.3.0`（建议撰写时的版本）
> 结论：颜色全部硬编码，缺少颜色类 CSS 变量，也没有深色主题支持。建议抽出变量并内置一套深色默认值。
> 本次建议为纯 CSS 改动，不涉及组件逻辑与 API。

---

## 1. 问题报告（可直接作为 issue 正文）

### 标题

建议将硬编码颜色抽为 CSS 变量，并支持深色主题

### 现象

`dist/style.css` 中所有界面颜色都是写死的十六进制值，宿主无法通过变量统一换肤：

- 全文只有 5 个 CSS 变量，且都与颜色无关：

  ```
  --stack-tab-font-size
  --stack-tab-iframe-loading-bg
  --stack-tab-iframe-loading-color
  --stack-tab-iframe-error-bg
  --stack-tab-iframe-error-color
  ```

- 页签头、关闭按钮、右键菜单、滚动条、badge、loading 的颜色没有一个是变量。
- 没有任何 `.dark`、`[data-theme]`、`prefers-color-scheme` 规则。
- 色值本身也不统一：
  - 主色蓝出现三种：`#409eff`（7 次）、`#337ecc`（2 次）、`#007bff97`（2 次）
  - 灰色出现五种：`#4d4d4d`、`#666`、`#999`、`#aaa`、`#a9a9a9`
  - 白色/表面色：`#fff`（11 次）、`#ffffffeb`、`#fafafa`、`#f5f5f5`

### 影响

宿主接暗色主题时，只能按内部类名逐个覆盖：

- 页签头白底、下边框 `#f0f0f0`
- 右键菜单白底
- 左右滚动遮罩按钮、滚动条、badge 仍是库的固定色
- iframe 加载/错误页、全局 loading 遮罩白底

这类覆盖依赖内部类名，属于侵入式补丁，库升级后容易失效。

### 期望

1. 把界面颜色抽成一组语义化 CSS 变量，默认值与现有值保持一致（浅色模式视觉零变化）。
2. 内置一套深色变量，通过 `:root.dark` 或 `[data-theme="dark"]` 激活。
3. 宿主只需覆盖变量即可完成换肤，不需要碰内部类名。

---

## 2. 设计目标

| 目标       | 说明                                                            |
| ---------- | --------------------------------------------------------------- |
| 视觉零变化 | 所有变量的 `light` 默认值等于当前硬编码值，升级后浅色外观不变   |
| 语义化     | 按 accent / surface / border / text / shadow 分类，不按组件命名 |
| 可覆盖     | 变量定义在 `:root`，宿主在任何作用域覆盖都能生效                |
| 深色内置   | 提供 `:root.dark` 与 `:root[data-theme="dark"]` 两套触发方式    |
| 向后兼容   | 只新增变量、不删除类名，按 minor 版本发布（建议 2.4.0）         |

---

## 3. 变量设计

命名前缀沿用现有的 `--stack-tab-*`（单数 `tab`），避免出现两套前缀。

| 变量                           | 浅色默认值                                    | 替换的硬编码                 | 用途                                             |
| ------------------------------ | --------------------------------------------- | ---------------------------- | ------------------------------------------------ |
| `--stack-tab-accent`           | `#409eff`                                     | `#409eff`                    | 主色：hover、拖拽指示、滚动条拖拽                |
| `--stack-tab-accent-active`    | `#337ecc`                                     | `#337ecc`                    | 主色按下态                                       |
| `--stack-tab-accent-contrast`  | `#ffffff`                                     | `#fff`                       | 主色上的文字/图标、badge 文字与描边              |
| `--stack-tab-accent-shadow`    | `#409effcc`                                   | `#409effcc`                  | 拖拽指示条的光晕                                 |
| `--stack-tab-surface`          | `#fff`                                        | `#fff`                       | 内容区、页签头按钮、激活页签、右键菜单、重试按钮 |
| `--stack-tab-surface-muted`    | `#fafafa`                                     | `#fafafa`                    | 非激活页签、禁用按钮                             |
| `--stack-tab-border`           | `#f0f0f0`                                     | `#f0f0f0`                    | 页签头下边框、页签边框、菜单边框、按钮边框       |
| `--stack-tab-divider`          | `#a9a9a9`                                     | `#a9a9a9`                    | 透明分隔渐变                                     |
| `--stack-tab-text`             | `#4d4d4d`                                     | `#4d4d4d`                    | 页签文字、菜单项文字、重试按钮文字               |
| `--stack-tab-text-strong`      | `#000`                                        | `#000`                       | 右键菜单激活态文字                               |
| `--stack-tab-text-disabled`    | `#aaa`                                        | `#aaa`                       | 禁用态文字/图标                                  |
| `--stack-tab-mask`             | `#4d4d4d`                                     | `#4d4d4d`                    | 关闭图标、滚动遮罩按钮、菜单图标                 |
| `--stack-tab-scrollbar`        | `#0000001a`                                   | `#0000001a`                  | 横向滚动条                                       |
| `--stack-tab-shadow-color`     | `#0009`                                       | `#0009`                      | 阴影颜色层（inset 工具类用）                     |
| `--stack-tab-shadow-soft`      | `#0000001a`                                   | `#0000001a`                  | 软阴影颜色层（菜单用）                           |
| `--stack-tab-shadow-tab`       | `-5px 0 5px -5px #0009, 5px 0 5px -5px #0009` | 页签激活态 `box-shadow`      | 整体阴影，推荐宿主优先覆盖                       |
| `--stack-tab-shadow-tab-left`  | `-5px 0 5px -5px #0009`                       | `.stack-tab__shadow-left`    | 左边缘整体阴影                                   |
| `--stack-tab-shadow-tab-right` | `5px 0 5px -5px #0009`                        | `.stack-tab__shadow-right`   | 右边缘整体阴影                                   |
| `--stack-tab-shadow-menu`      | `5px 5px 5px #0000001a`                       | 右键菜单 `box-shadow`        | 菜单整体阴影                                     |
| `--stack-tab-shadow-drop`      | `0 0 6px #409effcc`                           | 拖拽指示条 `box-shadow`      | 拖拽光晕整体阴影                                 |
| `--stack-tab-shadow-inset-*`   | 见 5.6                                        | `.stack-tab__shadow-inset-*` | 可选：6 个方向的 inset 整体阴影                  |
| `--stack-tab-badge-default`    | `#ef4f4f`                                     | `#ef4f4f`                    | badge 默认色                                     |
| `--stack-tab-badge-primary`    | `#409eff`                                     | `#409eff`                    | badge 主色                                       |
| `--stack-tab-overlay`          | `#fff`                                        | `#fff`                       | 全局 loading 遮罩                                |
| `--stack-tab-loading-accent`   | `#007bff97`                                   | `#007bff97`                  | loading spinner                                  |

已有的 `--stack-tab-iframe-loading-bg`、`--stack-tab-iframe-loading-color`、`--stack-tab-iframe-error-bg`、`--stack-tab-iframe-error-color` 保留，只在深色块里补充新的默认值。

---

## 4. 变量定义（可直接粘贴）

放在样式入口的最前面。默认值必须与现有值完全一致。

```css
:root {
  /* accent */
  --stack-tab-accent: #409eff;
  --stack-tab-accent-active: #337ecc;
  --stack-tab-accent-contrast: #ffffff;
  --stack-tab-accent-shadow: #409effcc;

  /* surface */
  --stack-tab-surface: #fff;
  --stack-tab-surface-muted: #fafafa;
  --stack-tab-overlay: #fff;

  /* border */
  --stack-tab-border: #f0f0f0;
  --stack-tab-divider: #a9a9a9;

  /* text / icon */
  --stack-tab-text: #4d4d4d;
  --stack-tab-text-strong: #000;
  --stack-tab-text-disabled: #aaa;
  --stack-tab-mask: #4d4d4d;

  /* feedback */
  --stack-tab-scrollbar: #0000001a;

  /* shadow：颜色层 */
  --stack-tab-shadow-color: #0009;
  --stack-tab-shadow-soft: #0000001a;

  /* shadow：整体层（引用颜色层，深色只需覆盖颜色） */
  --stack-tab-shadow-tab:
    -5px 0 5px -5px var(--stack-tab-shadow-color), 5px 0 5px -5px var(--stack-tab-shadow-color);
  --stack-tab-shadow-tab-left: -5px 0 5px -5px var(--stack-tab-shadow-color);
  --stack-tab-shadow-tab-right: 5px 0 5px -5px var(--stack-tab-shadow-color);
  --stack-tab-shadow-menu: 5px 5px 5px var(--stack-tab-shadow-soft);
  --stack-tab-shadow-drop: 0 0 6px var(--stack-tab-accent-shadow);

  /* shadow：inset 工具类（可选，不定义则保留原几何） */
  --stack-tab-shadow-inset-left: inset 5px 0 5px -5px var(--stack-tab-shadow-color);
  --stack-tab-shadow-inset-right: inset -5px 0 5px -5px var(--stack-tab-shadow-color);
  --stack-tab-shadow-inset-top: inset 0 5px 5px -5px var(--stack-tab-shadow-color);
  --stack-tab-shadow-inset-bottom: inset 0 -5px 5px -5px var(--stack-tab-shadow-color);
  --stack-tab-shadow-inset-vertical:
    inset 0 5px 5px -5px var(--stack-tab-shadow-color),
    inset 0 -5px 5px -5px var(--stack-tab-shadow-color);
  --stack-tab-shadow-inset-all:
    inset 5px 0 5px -5px var(--stack-tab-shadow-color),
    inset -5px 0 5px -5px var(--stack-tab-shadow-color);

  --stack-tab-badge-default: #ef4f4f;
  --stack-tab-badge-primary: #409eff;

  /* loading */
  --stack-tab-loading-accent: #007bff97;

  /* iframe（沿用已有变量，给出显式默认值） */
  --stack-tab-iframe-loading-bg: #f5f5f5;
  --stack-tab-iframe-loading-color: #999;
  --stack-tab-iframe-error-bg: #ffffffeb;
  --stack-tab-iframe-error-color: #666;
}

/**
 * 深色主题
 *
 * 同时支持两种触发方式：
 * - <html class="dark">（Element Plus / VueUse 生态的常见约定）
 * - <html data-theme="dark"> 或任意容器 [data-theme="dark"]
 *
 * 以下是一套中性深色默认值，宿主可整体覆盖。
 */
:root.dark,
:root[data-theme='dark'],
[data-theme='dark'] {
  color-scheme: dark;

  --stack-tab-accent: #6ea8fe;
  --stack-tab-accent-active: #4d8fe0;
  --stack-tab-accent-contrast: #0b1120;
  --stack-tab-accent-shadow: rgb(110 168 254 / 0.8);

  --stack-tab-surface: #111827;
  --stack-tab-surface-muted: #1f2937;
  --stack-tab-overlay: rgb(17 24 39 / 0.8);

  --stack-tab-border: #243044;
  --stack-tab-divider: #334155;

  --stack-tab-text: #e2e8f0;
  --stack-tab-text-strong: #f8fafc;
  --stack-tab-text-disabled: #475569;
  --stack-tab-mask: #94a3b8;

  --stack-tab-scrollbar: rgb(255 255 255 / 0.18);

  /* 整体阴影引用颜色层，这里只覆盖颜色即可 */
  --stack-tab-shadow-color: rgb(0 0 0 / 0.5);
  --stack-tab-shadow-soft: rgb(0 0 0 / 0.35);

  --stack-tab-badge-default: #f87171;
  --stack-tab-badge-primary: #6ea8fe;

  --stack-tab-loading-accent: #60a5fa;

  --stack-tab-iframe-loading-bg: #0f172a;
  --stack-tab-iframe-loading-color: #94a3b8;
  --stack-tab-iframe-error-bg: rgb(17 24 39 / 0.95);
  --stack-tab-iframe-error-color: #cbd5e1;
}
```

---

## 5. 逐条替换清单

以下按当前 `dist/style.css` 的规则顺序排列。左列是原值，右列是替换后的值。

### 5.1 内容区与头部

| 选择器 / 属性                                                                    | 原值                | 新值                                |
| -------------------------------------------------------------------------------- | ------------------- | ----------------------------------- |
| `.stack-tab` `background-color`                                                  | `#fff`              | `var(--stack-tab-surface)`          |
| `.stack-tab__header` `border-bottom`                                             | `1px solid #f0f0f0` | `1px solid var(--stack-tab-border)` |
| `.stack-tab__header-button` `background-color`                                   | `#fff`              | `var(--stack-tab-surface)`          |
| `.stack-tab__header-button[disabled]` `background-color`                         | `#fafafa`           | `var(--stack-tab-surface-muted)`    |
| `.stack-tab__mask-button` `background-color`                                     | `#4d4d4d`           | `var(--stack-tab-mask)`             |
| `.stack-tab__mask-button:hover` `background-color`                               | `#409eff`           | `var(--stack-tab-accent)`           |
| `.stack-tab__mask-button:active` `background-color`                              | `#337ecc`           | `var(--stack-tab-accent-active)`    |
| `.stack-tab__header-button[disabled] .stack-tab__mask-button` `background-color` | `#aaa`              | `var(--stack-tab-text-disabled)`    |

### 5.2 页签项

| 选择器 / 属性                                                                             | 原值                | 新值                                     |
| ----------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------- |
| `.stack-tab__item` `color`                                                                | `#4d4d4d`           | `var(--stack-tab-text)`                  |
| `.stack-tab__item` `background-color`                                                     | `#fafafa`           | `var(--stack-tab-surface-muted)`         |
| `.stack-tab__item` `border`                                                               | `1px solid #f0f0f0` | `1px solid var(--stack-tab-border)`      |
| `.stack-tab__item:first-child` `border-left`                                              | `1px solid #f0f0f0` | `1px solid var(--stack-tab-border)`      |
| `.stack-tab__item:hover, .stack-tab__item--active` `color`                                | `#409eff`           | `var(--stack-tab-accent)`                |
| `.stack-tab__item--active` `background-color`                                             | `#fff`              | `var(--stack-tab-surface)`               |
| `.stack-tab__item--active` `border-bottom-color`                                          | `#fff`              | `var(--stack-tab-surface)`               |
| `.stack-tab__item--active` `box-shadow`                                                   | `... #0009`         | `... var(--stack-tab-shadow-color)`      |
| `.stack-tab__item--context-menu` `color`                                                  | `#000`              | `var(--stack-tab-text-strong)`           |
| `.stack-tab__item-button` `background-color`                                              | `#4d4d4d`           | `var(--stack-tab-mask)`                  |
| `.stack-tab__item-button:hover` `background-color`                                        | `#409eff`           | `var(--stack-tab-accent)`                |
| `.stack-tab__item-button:active` `background-color`                                       | `#337ecc`           | `var(--stack-tab-accent-active)`         |
| `.stack-tab__item--drop-before::before, .stack-tab__item--drop-after::after` `background` | `#409eff`           | `var(--stack-tab-accent)`                |
| 同上 `box-shadow`                                                                         | `0 0 6px #409effcc` | `0 0 6px var(--stack-tab-accent-shadow)` |

### 5.3 滚动条

| 选择器 / 属性                                                                                                       | 原值        | 新值                         |
| ------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------- |
| `.stack-tab__scrollbar` `background-color`                                                                          | `#0000001a` | `var(--stack-tab-scrollbar)` |
| `.stack-tab__scrollbar-thumb` `background-color`                                                                    | `#0000001a` | `var(--stack-tab-scrollbar)` |
| `.stack-tab__scrollbar--dragging .stack-tab__scrollbar-thumb, .stack-tab__scrollbar-thumb:hover` `background-color` | `#409eff`   | `var(--stack-tab-accent)`    |

### 5.4 badge

| 选择器 / 属性                                     | 原值             | 新值                                         |
| ------------------------------------------------- | ---------------- | -------------------------------------------- |
| `.stack-tab__badge-content` `color`               | `#fff`           | `var(--stack-tab-accent-contrast)`           |
| `.stack-tab__badge-content` `border`              | `1px solid #fff` | `1px solid var(--stack-tab-accent-contrast)` |
| `.stack-tab__badge-content--default` `background` | `#ef4f4f`        | `var(--stack-tab-badge-default)`             |
| `.stack-tab__badge-content--primary` `background` | `#409eff`        | `var(--stack-tab-badge-primary)`             |

### 5.5 右键菜单

| 选择器 / 属性                                                                       | 原值                    | 新值                                       |
| ----------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------ |
| `.stack-tab__context-menu` `background`                                             | `#fff`                  | `var(--stack-tab-surface)`                 |
| `.stack-tab__context-menu` `border`                                                 | `1px solid #f0f0f0`     | `1px solid var(--stack-tab-border)`        |
| `.stack-tab__context-menu` `box-shadow`                                             | `5px 5px 5px #0000001a` | `5px 5px 5px var(--stack-tab-shadow-soft)` |
| `.stack-tab__context-menu-item` `color`                                             | `#4d4d4d`               | `var(--stack-tab-text)`                    |
| `.stack-tab__context-menu-item:hover/:active/:focus-visible` `color`                | `#fff`                  | `var(--stack-tab-accent-contrast)`         |
| 同上 `background-color`                                                             | `#409eff`               | `var(--stack-tab-accent)`                  |
| 同上 `.stack-tab__icon--mask` `background-color`                                    | `#fff`                  | `var(--stack-tab-accent-contrast)`         |
| `.stack-tab__context-menu-item[disabled]` `color`                                   | `#aaa`                  | `var(--stack-tab-text-disabled)`           |
| `.stack-tab__context-menu-item[disabled] .stack-tab__icon--mask` `background-color` | `#aaa`                  | `var(--stack-tab-text-disabled)`           |
| `.stack-tab__context-menu-icon.stack-tab__icon--mask` `background-color`            | `#4d4d4d`               | `var(--stack-tab-mask)`                    |

### 5.6 阴影

阴影分两层：颜色层（`--stack-tab-shadow-color` / `-soft`）和整体层（`--stack-tab-shadow-*`）。整体层内部引用颜色层，因此深色模式只需覆盖颜色。

| 选择器                                                                       | 原值                                                      | 新值                                     |
| ---------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| `.stack-tab__item--active` `box-shadow`                                      | `-5px 0 5px -5px #0009, 5px 0 5px -5px #0009`             | `var(--stack-tab-shadow-tab)`            |
| `.stack-tab__shadow-left` `box-shadow`                                       | `-5px 0 5px -5px #0009`                                   | `var(--stack-tab-shadow-tab-left)`       |
| `.stack-tab__shadow-right` `box-shadow`                                      | `5px 0 5px -5px #0009`                                    | `var(--stack-tab-shadow-tab-right)`      |
| `.stack-tab__shadow-inset-left::after` `box-shadow`                          | `inset 5px 0 5px -5px #0009`                              | `var(--stack-tab-shadow-inset-left)`     |
| `.stack-tab__shadow-inset-right::after` `box-shadow`                         | `inset -5px 0 5px -5px #0009`                             | `var(--stack-tab-shadow-inset-right)`    |
| `.stack-tab__shadow-inset-top::after` `box-shadow`                           | `inset 0 5px 5px -5px #0009`                              | `var(--stack-tab-shadow-inset-top)`      |
| `.stack-tab__shadow-inset-bottom::after` `box-shadow`                        | `inset 0 -5px 5px -5px #0009`                             | `var(--stack-tab-shadow-inset-bottom)`   |
| `.stack-tab__shadow-inset-vertical::after` `box-shadow`                      | `inset 0 5px 5px -5px #0009, inset 0 -5px 5px -5px #0009` | `var(--stack-tab-shadow-inset-vertical)` |
| `.stack-tab__shadow-inset-all::after` `box-shadow`                           | `inset 5px 0 5px -5px #0009, inset -5px 0 5px -5px #0009` | `var(--stack-tab-shadow-inset-all)`      |
| `.stack-tab__context-menu` `box-shadow`                                      | `5px 5px 5px #0000001a`                                   | `var(--stack-tab-shadow-menu)`           |
| `.stack-tab__item--drop-before::before` / `--drop-after::after` `box-shadow` | `0 0 6px #409effcc`                                       | `var(--stack-tab-shadow-drop)`           |

如果上游希望控制变量数量，inset 的 6 个整体变量可以省略，只保留颜色层变量（规则里写 `inset 5px 0 5px -5px var(--stack-tab-shadow-color)`）。inset 阴影的方向和几何通常由使用方通过类名决定，整体替换的需求较低。

> 深色模式下的阴影策略：深色背景会吞掉黑色阴影，单纯加深颜色容易变成一块死黑。建议保持较低透明度，并把视觉边界交给 `--stack-tab-border`。页签激活态如果仍不够清晰，可以在深色块里把 `--stack-tab-shadow-tab` 覆盖成 `0 0 0 1px var(--stack-tab-border)` 这类描边方案。

### 5.7 iframe

| 选择器 / 属性                                  | 原值                                          | 新值                                |
| ---------------------------------------------- | --------------------------------------------- | ----------------------------------- |
| `.stack-tab__iframe-loading` `background`      | `var(--stack-tab-iframe-loading-bg, #f5f5f5)` | 保持原样（变量已在 `:root` 定义）   |
| `.stack-tab__iframe-loading-text` `color`      | `var(--stack-tab-iframe-loading-color, #999)` | 保持原样                            |
| `.stack-tab__iframe-error` `background`        | `var(--stack-tab-iframe-error-bg, #ffffffeb)` | 保持原样                            |
| `.stack-tab__iframe-error-text` `color`        | `var(--stack-tab-iframe-error-color, #666)`   | 保持原样                            |
| `.stack-tab__iframe-error-retry/-open` `color` | `#4d4d4d`                                     | `var(--stack-tab-text)`             |
| 同上 `background`                              | `#fff`                                        | `var(--stack-tab-surface)`          |
| 同上 `border`                                  | `1px solid #f0f0f0`                           | `1px solid var(--stack-tab-border)` |

> iframe 的 4 个变量已经存在且带 fallback，本次只需在 `:root` 与深色块里给出显式值，选择器本身不用改。宿主覆盖时直接写同名变量即可。

> badge 的描边默认是白色，深色模式下用 `--stack-tab-accent-contrast`（深色）也能形成清晰边界；如果希望边缘与页签背景融合，可以把 `border` 改为 `var(--stack-tab-surface)`。

### 5.8 全局 loading 与分隔线

| 选择器 / 属性                                                   | 原值                                            | 新值                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `.stack-tab-loading__mask` `background-color`                   | `#fff`                                          | `var(--stack-tab-overlay)`                                                   |
| `.stack-tab-loading__spin` `border-right-color`                 | `#007bff97`                                     | `var(--stack-tab-loading-accent)`                                            |
| `.stack-tab-loading__spin::before/::after` `border-right-color` | `#007bff97`                                     | `var(--stack-tab-loading-accent)`                                            |
| `.div-transparent::before` `background-image`                   | `linear-gradient(90deg, #0000, #a9a9a9, #0000)` | `linear-gradient(90deg, transparent, var(--stack-tab-divider), transparent)` |

`#0000` 只是透明值，保持不变。

---

## 6. 关键改动示例

### 页签项

```css
/* before */
.stack-tab__item {
  color: #4d4d4d;
  background-color: #fafafa;
  border: 1px solid #f0f0f0;
}
.stack-tab__item:hover,
.stack-tab__item--active {
  color: #409eff;
}
.stack-tab__item--active {
  background-color: #fff;
  border-bottom-color: #fff;
  box-shadow:
    -5px 0 5px -5px #0009,
    5px 0 5px -5px #0009;
}

/* after */
.stack-tab__item {
  color: var(--stack-tab-text);
  background-color: var(--stack-tab-surface-muted);
  border: 1px solid var(--stack-tab-border);
}
.stack-tab__item:hover,
.stack-tab__item--active {
  color: var(--stack-tab-accent);
}
.stack-tab__item--active {
  background-color: var(--stack-tab-surface);
  border-bottom-color: var(--stack-tab-surface);
  box-shadow: var(--stack-tab-shadow-tab);
}
```

### 右键菜单

```css
/* before */
.stack-tab__context-menu {
  background: #fff;
  border: 1px solid #f0f0f0;
  box-shadow: 5px 5px 5px #0000001a;
}
.stack-tab__context-menu-item {
  color: #4d4d4d;
}
.stack-tab__context-menu-item:hover,
.stack-tab__context-menu-item:active,
.stack-tab__context-menu-item:focus-visible {
  color: #fff;
  background-color: #409eff;
}

/* after */
.stack-tab__context-menu {
  background: var(--stack-tab-surface);
  border: 1px solid var(--stack-tab-border);
  box-shadow: 5px 5px 5px var(--stack-tab-shadow-soft);
}
.stack-tab__context-menu-item {
  color: var(--stack-tab-text);
}
.stack-tab__context-menu-item:hover,
.stack-tab__context-menu-item:active,
.stack-tab__context-menu-item:focus-visible {
  color: var(--stack-tab-accent-contrast);
  background-color: var(--stack-tab-accent);
}
```

---

## 7. 兼容性

- **浅色模式零变化**：所有新变量的默认值都等于现有硬编码值，老用户不配置任何东西，视觉与当前一致。
- **不删类名、不改组件 API**：只是把颜色值换成变量引用，属于向后兼容的新增能力，建议按 `2.4.0` 发布。
- **宿主覆盖方式**：在 `:root` 或任意作用域覆盖变量即可，例如：

  ```css
  :root {
    --stack-tab-accent: #4f46e5;
    --stack-tab-accent-contrast: #fff;
  }
  ```

- **深色触发方式**：`<html class="dark">` 或 `<html data-theme="dark">` 都可以；也支持局部容器加 `data-theme="dark"`。
- **`color-scheme: dark`**：建议保留，能让原生滚动条、表单控件同步变深。

---

## 8. 验收清单

### 浅色模式

- [ ] 与 2.3.0 截图对比，页签头、激活态、边框、阴影无肉眼差异。
- [ ] 右键菜单、滚动条、badge、iframe loading/error、全局 loading 的颜色不变。

### 深色模式

- [ ] 页签内容区、页签头、激活页签均为深色，文字可读。
- [ ] 右键菜单深色背景，hover 项为主色背景 + 反色文字。
- [ ] 左右滚动遮罩按钮、滚动条在深色下可见。
- [ ] badge 默认色/主色在深色背景下可读。
- [ ] iframe loading / error 页不再是白底。
- [ ] 全局 loading 遮罩不再白屏。
- [ ] 拖拽指示条的光晕在深色下不刺眼。
- [ ] 页签边缘、菜单、拖拽指示的阴影强度合适：既不是纯黑一块，也不是完全看不见。
- [ ] 如果深色下页签激活态不够清晰，已用 `--stack-tab-border` 或描边式阴影替代纯黑阴影。

### 覆盖能力

- [ ] 只改 `--stack-tab-accent`，所有主色点（hover、拖拽、滚动条、badge、菜单）一起变。
- [ ] 只改 `--stack-tab-surface`，内容区、激活页签、右键菜单、重试按钮一起变。
- [ ] 只改 `--stack-tab-shadow-tab`，页签激活态与左右边缘阴影一起替换。
- [ ] 在组件局部容器覆盖变量，只影响该容器内的页签。

---

## 9. 补充建议（非必须）

1. **变量命名稳定性**：这些变量一旦发布就视为公开 API，后续不要重命名；需要新增时只加不改。
2. **减少色值数量**：`#666`、`#999`、`#aaa`、`#a9a9a9`、`#4d4d4d` 可以在下一个 major 版本收敛为 `text` / `text-muted` / `text-disabled` 三档。
3. **提供主题切换示例**：README 里加一段 `:root.dark` 的示例，降低宿主接入成本。
4. **截图测试**：如果后续引入视觉回归测试，可以用浅色/深色两组截图作为基线。
5. **阴影分两层**：颜色层（`--stack-tab-shadow-color` / `-soft`）负责透明度，整体层（`--stack-tab-shadow-tab` 等）负责几何。宿主优先覆盖整体层；只调深浅时改颜色层即可，两者不要互相覆盖。

---

## 10. 圆角与动效（评估结论：暂不纳入）

> 结论：圆角和动效不进入本次改造范围。颜色、阴影、字号、尺寸四类已经是运行时 CSS 变量，宿主可直接覆盖；本节余下内容仅保留为评估记录，不需要实施。

### 10.0 现状（2.5.0）

| 类别 | 运行时 CSS 变量                                         | SCSS 编译期变量                                             | 结论       |
| ---- | ------------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| 颜色 | ✅ 完整                                                 | ✅                                                          | 宿主可覆盖 |
| 阴影 | ✅ 完整（颜色层 + 整体层）                              | ✅                                                          | 宿主可覆盖 |
| 字号 | ✅ `--stack-tab-font-size` + `data-stack-tab-size` 三档 | ✅                                                          | 宿主可覆盖 |
| 尺寸 | ✅ head-height / menu item height / padding             | ✅                                                          | 宿主可覆盖 |
| 圆角 | ❌                                                      | ✅ `$stack-tab-tab-radius`、`$stack-tab-contextmenu-radius` | 暂不纳入   |
| 动效 | ❌                                                      | ✅ `$stack-tab-transition-*`                                | 暂不纳入   |

需要区分两类变量：

- **运行时 CSS 变量**（`--stack-tab-*`）：宿主在 `:root` 或任意容器覆盖即可，使用 `dist/style.css` 也能生效。
- **SCSS 编译期变量**（`$stack-tab-*`）：构建时被替换成字面值，dist 里看不到变量名；宿主只有用源码 `@use ... with` 重新编译才能定制。

圆角和动效目前属于后者，对使用 dist 产物的宿主是固定的。既然评估后决定不推进，就不需要在上游新增变量，也不需要宿主侧做类名覆盖。

### 10.1 圆角（评估记录，暂不实施）

源码里已经存在 SCSS 变量：

```scss
$stack-tab-tab-radius: 8px 8px 0 0 !default;
$stack-tab-contextmenu-radius: 10px 0 !default;
$stack-tab-scroll-border-radius: $stack-tab-scroll-height !default;
```

但 `dist/style.css` 里是字面值（`.stack-tab__item { border-radius: 8px 8px 0 0 }`、`.stack-tab__context-menu { border-radius: 10px 0 }`）。如果将来需要导出，方案如下（当前不实施）：

| 变量                         | 对应 SCSS                         | 用途                    |
| ---------------------------- | --------------------------------- | ----------------------- |
| `--stack-tab-radius-tab`     | `$stack-tab-tab-radius`           | 页签上圆角              |
| `--stack-tab-radius-menu`    | `$stack-tab-contextmenu-radius`   | 右键菜单圆角            |
| `--stack-tab-radius-control` | `$stack-tab-scroll-border-radius` | 滚动条、iframe 重试按钮 |
| `--stack-tab-radius-badge`   | 新增（`0.5rem`）                  | 徽标圆角                |
| `--stack-tab-radius-drop`    | 新增（`2px`）                     | 拖拽指示条              |

实现方式：

1. 在 `theme.scss` 的 `:root` 中新增默认值（与现有 SCSS 变量一致）：

   ```css
   --stack-tab-radius-tab: 8px 8px 0 0;
   --stack-tab-radius-menu: 10px 0;
   --stack-tab-radius-control: 6px;
   --stack-tab-radius-badge: 0.5rem;
   --stack-tab-radius-drop: 2px;
   ```

2. 规则里的值换成 `var(--..., fallback)`，fallback 继续用 SCSS 变量，保证单独编译的 scoped 样式也有值：

   | 位置                                                           | 原值                              | 新值                                                                  |
   | -------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
   | `.stack-tab__item`                                             | `$stack-tab-tab-radius`           | `var(--stack-tab-radius-tab, #{$stack-tab-tab-radius})`               |
   | `.stack-tab__context-menu`、`.stack-tab__context-menu-item`    | `$stack-tab-contextmenu-radius`   | `var(--stack-tab-radius-menu, #{$stack-tab-contextmenu-radius})`      |
   | `.stack-tab__scrollbar`、`.stack-tab__scrollbar-thumb`         | `$stack-tab-scroll-border-radius` | `var(--stack-tab-radius-control, #{$stack-tab-scroll-border-radius})` |
   | `.stack-tab__badge-content`                                    | `0.5rem`                          | `var(--stack-tab-radius-badge, 0.5rem)`                               |
   | `.stack-tab__item--drop-before::before`、`--drop-after::after` | `2px`                             | `var(--stack-tab-radius-drop, 2px)`                                   |
   | `.stack-tab__iframe-error-retry`、`-open`                      | `6px`                             | `var(--stack-tab-radius-control, 6px)`                                |

3. 不需要深色块：圆角与明暗无关。

> `.stack-tab-loading__spin` 的 `border-radius: 50%` 是圆形语义，不建议变量化。

### 10.2 字号（已支持）

`--stack-tab-font-size` 已导出，并且提供三档尺寸预设，用 `data-stack-tab-size` 激活：

| 预设     | 字号 | 页签头高度 | 菜单项高度 | 菜单内边距 |
| -------- | ---- | ---------- | ---------- | ---------- |
| `small`  | 12px | 32px       | 26px       | 6px        |
| `normal` | 14px | 40px       | 30px       | 8px        |
| `large`  | 16px | 48px       | 36px       | 10px       |

```html
<html data-stack-tab-size="small"></html>
```

剩余未变量化的字号只有 badge（`.5rem`）和页签图标，量级很小，可以保持现状。

### 10.3 动效（评估记录，暂不实施）

源码里已有：

```scss
$stack-tab-transition-fast: all 0.15s ease-in-out !default;
$stack-tab-transition-duration: 0.3s !default;
$stack-tab-transition-slide-distance: 30px !default;
$stack-tab-transition-slide:
  opacity $stack-tab-transition-duration ease-in-out,
  transform $stack-tab-transition-duration ease-in-out !default;
```

但产物里仍是 `transition: all .15s ease-in-out` / `.3s`。如果将来需要导出，方案如下（当前不实施）：

| 变量                                    | 默认值              | 用途                         |
| --------------------------------------- | ------------------- | ---------------------------- |
| `--stack-tab-transition-fast`           | `150ms ease-in-out` | 页签、关闭按钮、滚动遮罩     |
| `--stack-tab-transition-menu`           | `200ms ease-in-out` | 右键菜单项、菜单图标         |
| `--stack-tab-transition-slow`           | `300ms ease-in-out` | 滚动条拇指、zoom / swap 过渡 |
| `--stack-tab-transition-slide-distance` | `30px`              | 滑动转场距离                 |

实现方式：

1. 在 `theme.scss` 的 `:root` 中新增（保存完整的 transition 值，宿主可整体替换）：

   ```css
   --stack-tab-transition-fast: all 150ms ease-in-out;
   --stack-tab-transition-menu: color 200ms ease-in-out, background-color 200ms ease-in-out;
   --stack-tab-transition-slow: background-color 300ms ease-in-out;
   --stack-tab-transition-page: opacity 300ms ease-in-out, transform 300ms ease-in-out;
   --stack-tab-transition-slide-distance: 30px;
   ```

2. 替换规则：

   | 位置                                                                                              | 原值                                                          | 新值                                                                                                          |
   | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
   | `.stack-tab__mask-button`、`.stack-tab__item`、`.stack-tab__item-button`、`.stack-tab__scrollbar` | `$stack-tab-transition-fast`                                  | `var(--stack-tab-transition-fast, #{$stack-tab-transition-fast})`                                             |
   | `.stack-tab__scrollbar-thumb`                                                                     | `background-color $stack-tab-transition-duration ease-in-out` | `var(--stack-tab-transition-slow, background-color #{$stack-tab-transition-duration} ease-in-out)`            |
   | `.stack-tab__context-menu-item`                                                                   | `color .2s ease-in-out, background-color .2s ease-in-out`     | `var(--stack-tab-transition-menu, ...)`                                                                       |
   | `.stack-tab__context-menu-icon`                                                                   | `background-color .2s ease-in-out`                            | `var(--stack-tab-transition-menu, ...)`（只取 background-color 部分，或额外拆 `--stack-tab-transition-icon`） |
   | `.stack-tab-zoom-*`、`.stack-tab-swap-*`                                                          | `$stack-tab-transition-slide`                                 | `var(--stack-tab-transition-page, #{$stack-tab-transition-slide})`                                            |
   | `transition.scss` 的位移量                                                                        | `$stack-tab-transition-slide-distance`                        | `var(--stack-tab-transition-slide-distance, #{$stack-tab-transition-slide-distance})`                         |

3. 同样不需要深色块；动效与明暗无关。

4. 建议同时支持 `prefers-reduced-motion`，见 10.4。

### 10.4 可访问性（可选，暂不实施）

无论是否抽变量，都建议补上这段：

```css
@media (prefers-reduced-motion: reduce) {
  .stack-tab *,
  .stack-tab *::before,
  .stack-tab *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 10.5 不建议主题化的部分

- 间距（`padding`、`margin`、`gap`、`height`）：属于组件布局与密度，主题化会破坏内部对齐。
- `width` / `min-width` / `min-height`：同上。
- `z-index`：属于层级契约，不是视觉令牌。

如果确实需要密度切换，建议单独设计 `--stack-tab-density-*`，而不是塞进颜色主题。

---

## 11. 暗色变量的特异性与宿主覆盖

> 状态：已在 `vue-stack-tabs@2.5.1` 实现。默认值、尺寸预设、暗色块全部改为 `:where()`，宿主用普通 `:root` 即可覆盖。

### 现象

宿主希望"一套变量同时管浅色和深色"时，通常写成：

```css
:root {
  --stack-tab-accent: var(--brand-primary);
  --stack-tab-surface: var(--bg-surface);
}
```

浅色下正常；切到深色后，这组覆盖会失效。原因是库的暗色块选择了更高的特异性：

```css
:root.dark,
:root[data-theme=dark],
[data-theme=dark] { ... }
```

| 选择器                      | 特异性  |
| --------------------------- | ------- |
| 宿主 `:root`                | (0,1,0) |
| 库 `:root.dark`             | (0,2,0) |
| 库 `:root[data-theme=dark]` | (0,2,0) |
| 库 `[data-theme=dark]`      | (0,1,1) |

暗色块特异性更高，宿主的 `:root` 覆盖会被压回去。宿主只能把选择器提到 `:root:root`（0,2,0），并保证自己的样式在库之后加载，才能同时赢过浅色默认值和暗色块。这就是 `:root:root` 的来源。

### 这不是 bug，但可以优化

这是 CSS 变量 + 暗色选择器的固有冲突，不是实现错误；Element Plus 等库也有同类问题。不过库侧可以用 `:where()` 把主题变量的特异性归零，让宿主用普通 `:root` 覆盖。

### 推荐改法

```scss
// 默认值也必须用 :where()：
// 否则 (0,1,0) 的 :root 会压过 (0,0,0) 的暗色块，导致暗色不生效
:where(:root) {
  --stack-tab-accent: #409eff;
  /* ...其余默认值... */
}

:where(:root.dark, :root[data-theme='dark'], [data-theme='dark']) {
  --stack-tab-accent: #6ea8fe;
  /* ...其余暗色值... */
}
```

层叠结果：

| 规则                     | 特异性  | 结果                     |
| ------------------------ | ------- | ------------------------ |
| `:where(:root)` 默认值   | (0,0,0) | 最低                     |
| `:where(...dark)` 暗色值 | (0,0,0) | 同特异性、后写，暗色生效 |
| 宿主 `:root`             | (0,1,0) | 深浅色都赢               |

宿主侧就可以写成：

```css
:root {
  --stack-tab-accent: var(--brand-primary);
}
```

不再需要 `:root:root`。

### 风险

- 主题变量会更容易被宿主或其他全局 `:root` 规则覆盖。对"主题变量"来说这是期望行为；但如果库内部还有非主题的 `:root` 变量，不应一并降级。
- `:where()` 支持 Chrome 88+ / Safari 14+ / Firefox 78+。库已经使用 `color-mix()`（Chrome 111+），不构成额外限制。

### 如果不改库

宿主有两种写法：

1. `:root:root`（当前项目采用）：一行覆盖浅色和深色，但可读性差，需要注释说明。
2. 分别写 `:root` 和 `:root.dark`：更明确，但变量要维护两遍，且必须保证宿主样式在库之后加载。

```css
:root {
  --stack-tab-accent: #4f46e5;
}
:root.dark {
  --stack-tab-accent: color-mix(in srgb, #4f46e5, white 22%);
}
```
