# SVG 图标

图标源文件在 `app/assets/icons/`，构建期由 `vite-plugin-svg-icons-ng` 合成一张 sprite，运行时由 `app/plugins/svg-icons.client.ts` 导入 `virtual:svg-icons/register` 注入 `<body>` 末尾的隐藏 `<svg id="__svg__icons__dom__">`。

## 目录与命名

```
app/assets/icons/
├── color/
│   ├── cms-b/    34 个多色业务图标
│   └── files/    78 个文件类型图标
└── mono/
    ├── ant/      599 个 Ant Design 线性图标
    └── opt/      541 个项目补充线性图标
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
- 源文件已经统一处理过：移除根节点的 `width` / `height` / `class` / `style`，`viewBox` 收缩到图形实际边界。
- 多色图标（`color/`）保留原始颜色，`fill` 写在 path 上，不受 `currentColor` 影响。
- 单色图标（`mono/`）的 `fill` / `stroke` 颜色已全部移除，颜色继承外层 CSS 的 `fill`（AppIcon 默认 `currentcolor`），因此自动跟随文字色和明暗模式。

## 新增图标

1. 把 SVG 放进对应目录，文件名即 symbolId 的 `[name]` 片段（大小写敏感）。
2. 确保文件里有 `viewBox`。
3. 运行 `pnpm icons:optimize`，把新图标按同一套规则处理。
4. 插件会在 dev 下监听文件变化；如果新增目录后没有生效，重启 dev server。

## 图标优化

`pnpm icons:optimize` 会递归处理 `app/assets/icons` 下的所有 `.svg`，直接写回源文件：

| 规则         | 实现                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------- |
| 删除无用内容 | svgo `preset-default` + `removeTitle`（元数据、注释、空容器、无用属性）                  |
| 尺寸交给 CSS | `removeDimensions` 移除 `width` / `height`，`removeAttrs` 移除根节点的 `class` / `style` |
| 去除空白     | 用 `svg-path-bbox` 计算所有 path 的实际包围盒，取长边作为正方形边长、内容居中            |
| 收缩 viewBox | `viewBox` 始终是 1:1 正方形，长方形图形在画布内居中，不会被拉伸                          |
| 颜色         | `color/` 保留颜色；`mono/` 的 `fill` / `stroke` 统一转成 `currentColor`                  |

```bash
pnpm icons:optimize            # 写回源文件
pnpm icons:optimize --dry-run  # 只统计，不写文件
```

- 脚本是幂等的：处理过的图标再跑一次不会再变化。
- 构建期 `svg-icon-baker` 还会用 svgo 4 安全预设再压一次，保留 `viewBox`，并禁用 `cleanupIds` / `removeUnknownsAndDefaults` 等会破坏 sprite 引用的插件；需要自定义时用 `nuxt.config.ts` 的 `bakerOptions.svgoOptions`。
- `viewBox` 始终是正方形：文件、横线这类长方形图形会在正方形画布内居中，保留必要的留白，不会被拉伸。尺寸仍由 `AppIcon` / CSS 控制。

## 体积提示

当前 1252 个图标会全部进入 sprite，并通过注册模块打进客户端入口。图标数量继续增长时，有两个方向：

- 只把实际用到的目录加入 `nuxt.config.ts` 的 `iconDirs`；
- 按目录拆多个 sprite（需要自行处理虚拟模块 id 冲突，`vite-plugin-svg-icons-ng` 的 `virtual:svg-icons/register` 是固定 id，多个实例只有第一个生效）。
