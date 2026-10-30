# SVG 图标

图标分两个目录：`app/assets/icons/` 是源目录，入库，保持设计稿 / 上游图标包原样；`.icons/` 是 `pnpm icons:build` 生成的目录，已被 gitignore，只作为 sprite 输入，不要手工修改。构建期由 `vite-plugin-svg-icons-ng` 把 `.icons/` 合成一张 sprite，运行时由 `app/plugins/svg-icons.client.ts` 导入 `virtual:svg-icons/register` 注入 `<body>` 末尾的隐藏 `<svg id="__svg__icons__dom__">`。

## 目录与命名

源目录与生成目录同构，`.icons/` 由 `pnpm icons:build` 生成：

```
app/assets/icons/          # 源目录，入库，保持原始 SVG
├── color/
│   ├── cms-b/    34 个多色业务图标
│   └── files/    78 个文件类型图标
└── mono/
    ├── ant/      599 个 Ant Design 线性图标
    └── opt/      541 个项目补充线性图标

.icons/                    # 生成目录，gitignore，结构与上面一致
```

`symbolId` 规则是 `icon-[dir]-[name]`，目录层级会保留：

| 源文件                  | symbolId                 |
| ----------------------- | ------------------------ |
| `color/cms-b/SEO.svg`   | `icon-color-cms-b-SEO`   |
| `mono/ant/close.svg`    | `icon-mono-ant-close`    |
| `mono/opt/AI-money.svg` | `icon-mono-opt-AI-money` |

目录层级不能省：`mono/ant` 与 `mono/opt` 有大量同名文件（`close.svg`、`calendar.svg` 等），去掉目录会互相覆盖。

## 使用

优先用全局组件 `AppIcon`（`app/components/global/AppIcon.vue`）：

```vue
<!-- 跟随字号 -->
<AppIcon name="mono-ant-search" />

<!-- 固定尺寸 -->
<AppIcon name="color-cms-b-SEO" :size="32" />

<!-- 可访问名称；纯装饰图标不要传 label -->
<AppIcon name="mono-opt-AI-money" label="AI 金额" />
```

也可以直接用 sprite：

```vue
<svg width="20" height="20" aria-hidden="true">
  <use href="#icon-mono-ant-close" />
</svg>
```

- `AppIcon` 默认 `1em`，`fill: currentcolor`，尺寸和颜色都由 CSS 控制。
- 生成目录里的文件已经统一处理过：移除根节点的 `width` / `height` / `class` / `style`，`viewBox` 收缩到图形实际边界；源目录保持原样。
- 多色图标（`color/`）保留原始颜色，`fill` 写在 path 上，不受 `currentColor` 影响。
- 单色图标（`mono/`）的 `fill` / `stroke` 颜色已全部移除，颜色继承外层 CSS 的 `fill`（AppIcon 默认 `currentcolor`），因此自动跟随文字色和明暗模式。

## 下拉选择

`AppIconPicker` 把图标清单做成下拉选择器，适合表单里挑图标（菜单图标、业务标识等）：

```vue
<script setup lang="ts">
const form = reactive({ icon: 'mono-ant-Gitlab' })
</script>

<template>
  <AppIconPicker v-model="form.icon" />
</template>
```

- `v-model` 的值是 `AppIcon` 的 `name`（symbolId 去掉 `icon-` 前缀），可直接传给 `<AppIcon :name="form.icon" />`。
- 输入框左侧预览当前图标，右侧显示图标代码；在输入框里输入即可按代码过滤，支持带 `icon-` 前缀的完整 symbolId。
- 打开后点击输入框、tab 或面板任意位置都不会收起；只有选中图标、点击组件外部或按 `Esc` 才关闭。
- 关闭（失焦）时输入框立即恢复显示当前图标代码，搜索词不会残留。
- 单色（`mono-`）和彩色（`color-`）分 tab 显示，一次渲染一行多列；列表是虚拟滚动，只挂载可视区域附近的图标。
- 选中项统一使用主色边框 + 浅主色背景；单色图标再变为主色，彩色图标保留原色。
- 搜索时当前 tab 没有结果、另一个 tab 有时会自动切换过去。
- 输入框尺寸、tabs 高度和网格格宽都跟随项目的全局密度（`ElConfigProvider` 的 size）。
- 可选属性：`placeholder`、`disabled`、`clearable`、`size`、`panel-width`、`panel-height`、`teleported`；选择后额外触发 `change` 事件。

## 新增图标

1. 把原始 SVG 放进 `app/assets/icons/` 的对应目录，文件名即 symbolId 的 `[name]` 片段（大小写敏感）。不要手工处理源文件，也不要直接改 `.icons/`。
2. 确保文件里有 `viewBox`。
3. dev 下保存后会自动同步到 `.icons/`；也可以手动跑 `pnpm icons:build`。
4. dev / build 启动时会先全量同步一次；新增目录后需要重启 dev server。

## 构建处理

`pnpm icons:build` 递归读取 `app/assets/icons` 下的所有 `.svg`，处理结果写到 `.icons/`，源文件不会被改动：

| 规则         | 实现                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| 删除无用内容 | svgo `preset-default` + `removeTitle`（元数据、注释、空容器、无用属性）                                 |
| 尺寸交给 CSS | `removeDimensions` 移除 `width` / `height`，自定义 `removeRootStyle` 插件移除根节点的 `class` / `style` |
| 去除空白     | 用 `svg-path-bbox` 计算所有 path 的实际包围盒，取长边作为正方形边长、内容居中                           |
| 收缩 viewBox | `viewBox` 始终是 1:1 正方形，长方形图形在画布内居中，不会被拉伸                                         |
| 颜色         | `color/` 保留颜色；`mono/` 的 `fill` / `stroke` 统一转成 `currentColor`                                 |

```bash
pnpm icons:build            # 生成到 .icons
pnpm icons:build --dry-run  # 只统计，不写文件
```

- 生成是幂等的：内容没变化的图标不会重写；源目录删掉的图标，下次构建会从 `.icons/` 清理掉。
- dev 和 build 都会通过 `nuxt.config.ts` 的 `iconsBuildPlugin` 自动构建：启动时全量同步，dev 运行中监听源目录做增量同步。
- 构建期 `svg-icon-baker` 还会用 svgo 4 安全预设再压一次，保留 `viewBox`，并禁用 `cleanupIds` / `removeUnknownsAndDefaults` 等会破坏 sprite 引用的插件；需要自定义时用 `nuxt.config.ts` 的 `bakerOptions.svgoOptions`。
- `viewBox` 始终是正方形：文件、横线这类长方形图形会在正方形画布内居中，保留必要的留白，不会被拉伸。尺寸仍由 `AppIcon` / CSS 控制。

## 体积提示

当前 1252 个图标会全部进入 sprite，并通过注册模块打进客户端入口。图标数量继续增长时，有两个方向：

- 只把实际用到的目录加入 `iconDirs`（需要同时调整 `scripts/build-icons.mjs` 的输出目录）；
- 按目录拆多个 sprite（需要自行处理虚拟模块 id 冲突，`vite-plugin-svg-icons-ng` 的 `virtual:svg-icons/register` 是固定 id，多个实例只有第一个生效）。
