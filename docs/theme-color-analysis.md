# Element Plus / VXE Table 深色颜色体系对照分析

> 结论先行：两个库的深色方案不是同一套算法，必须分别对齐。
>
> - **Element Plus 深色主色阶**：`light-1..9` 是「主色按 10% 步进混进深色背景 `--el-bg-color`（默认 `#141414`）」，**不是混纯黑**。菜单 hover 用的正是 `--el-color-primary-light-9`。
> - **VXE Table 深色**：表头 / 斑马纹 / 边框是**中性灰层次**（相对 `#121212` 混白 9.3% / 4.6% / 15.6%）；行 hover 官方也是中性灰（8.7%），项目确认**保留品牌色**。
> - 项目此前的映射把 EP 的基底写成了纯黑、VXE 的层次比例偏低，同时漏掉了 `hover-striped` 的联动，导致深色下 hover 与官方表现不一致。

---

## 1. Element Plus

### 1.1 官方定义（源码依据）

| 内容                   | 位置                                                      |
| ---------------------- | --------------------------------------------------------- |
| 菜单颜色变量           | `element-plus/theme-chalk/src/common/var.scss` L1275-1296 |
| 深色模式下主色阶的生成 | `element-plus/theme-chalk/src/dark/var.scss` L58-77       |
| 菜单 hover 应用规则    | `element-plus/theme-chalk/src/menu.scss` L37-38、L289-290 |
| 深色变量最终输出       | `element-plus/theme-chalk/dark/css-vars.css`              |

深色主色阶的官方算法：

```scss
// dark/var.scss
$bg-color: (
  'page': #0a0a0a,
  '': #141414,
  'overlay': #1d1e1f
);

@each $type in common.$types {
  @for $i from 1 through 9 {
    // light-N = 主色混入 N*10% 的深色背景 #141414
    @include set-color-mix-level($type, $i, 'light', map.get($bg-color, ''));
  }
}
```

菜单变量：

```scss
// common/var.scss
'menu-hover-text-color': getCssVar('color-primary'),
'menu-bg-color': getCssVar('fill-color', 'blank'),   // = --el-bg-color = #141414（深色）
'menu-hover-bg-color': getCssVar('color-primary-light-9'),
```

因此官方深色菜单 hover 的观感是：**背景 = 90% 深色底 + 10% 主色，文字 = 主色**。以默认蓝 `#409eff`、深色底 `#141414` 计算，`light-9 = #18222b`，比菜单背景亮一档，所以看得清。

### 1.2 项目映射对照

| 变量                         | 官方深色（默认蓝）                   | 修复前（项目靛蓝）                  | 修复后（项目靛蓝）                                     |
| ---------------------------- | ------------------------------------ | ----------------------------------- | ------------------------------------------------------ |
| `--el-color-primary`         | `#409eff`                            | `#6b63ea`（品牌提亮）               | 同左                                                   |
| `--el-color-primary-light-9` | `#18222b` = 10% 主色 + 90% `#141414` | **`#0b0a17` = 10% 主色 + 90% 纯黑** | `#16203a` = 10% 主色 + 90% `--bg-surface`（`#111827`） |
| `--el-menu-bg-color`         | `#141414`                            | `#111827`（项目表面）               | 同左                                                   |
| `--el-menu-hover-bg-color`   | `= light-9`                          | 同上（比菜单底还暗）                | 同上（比菜单底亮一档）                                 |
| `--el-menu-hover-text-color` | `= primary`                          | `= primary`                         | 同左                                                   |

### 1.3 根因

映射公式（`primary-3..9 = color-mix(primary, tint)`）与官方一致，**错的是深色下 `--brand-tint` 取了 `black`**：

- 官方基底是「深色背景」，不是黑色；
- 纯黑会把 `light-9` 压到比背景更暗，hover 视觉上消失；
- 同一错误还影响 `--brand-primary-border / -surface` 等派生值，深色下全部趋近纯黑。

### 1.4 处理

`tokens.css` 的 `html.dark` 中把 `--brand-tint` 改为 `var(--bg-surface)`，与官方「混深色底」同构；浅色仍混白，与官方浅色一致。

`--el-*` 语义色（背景、文字、边框）继续映射到项目令牌：这是项目统一蓝调深色的设计选择，不会破坏 EP 深色方案的**层次关系**（背景 < hover < 浮层），只改变色相，保留。

---

## 2. VXE Table

### 2.1 官方定义（源码依据）

VXE 的深色方案是独立的一套变量，定义在 `[data-vxe-ui-theme="dark"]`：

| 文件                                | 内容                                      |
| ----------------------------------- | ----------------------------------------- |
| `vxe-table/styles/theme/light.scss` | 浅色变量（值来自 `styles/variable.scss`） |
| `vxe-table/styles/theme/dark.scss`  | 深色变量                                  |
| `vxe-table/styles/theme/base.scss`  | 与明暗无关的尺寸/字体/联动变量            |

深色关键值：

| 变量                                                | 官方深色               | 相对 `#121212` 的混白比例 |
| --------------------------------------------------- | ---------------------- | ------------------------- |
| `--vxe-ui-layout-background-color`                  | `#121212`              | 0%                        |
| `--vxe-ui-font-color`                               | `rgba(255,255,255,.6)` | —                         |
| `--vxe-ui-table-header-background-color`            | `#28282a`              | ≈ 9.3%                    |
| `--vxe-ui-table-row-hover-background-color`         | `#262727`              | ≈ 8.7%                    |
| `--vxe-ui-table-row-hover-striped-background-color` | `#262727`              | ≈ 8.7%                    |
| `--vxe-ui-table-row-striped-background-color`       | `#1d1d1d`              | ≈ 4.6%                    |
| `--vxe-ui-table-border-color`                       | `#37373a`              | ≈ 15.6%                   |
| `--vxe-ui-input-border-color`                       | `#424242`              | ≈ 20.3%                   |

注意：**VXE 官方行 hover 是中性灰，不是品牌色**；浅色的 `#f5f7fa` 同理。项目经确认在这里保留品牌色（见 2.4），其余状态按官方比例。

### 2.2 项目映射对照

| 变量                                                | 官方深色                | 项目原值                       | 差异                                  |
| --------------------------------------------------- | ----------------------- | ------------------------------ | ------------------------------------- |
| `--vxe-ui-table-header-background-color`            | `#28282a`（9.3%）       | 6% `--fg-strong` 混表面 → 偏暗 | 表头层次偏弱                          |
| `--vxe-ui-table-row-hover-background-color`         | `#262727`（8.7%，中性） | 10% 品牌色混表面 → `#1a1f3b`   | 色相不同；**确认保留品牌色**          |
| `--vxe-ui-table-row-hover-striped-background-color` | `#262727`               | **未映射，仍是官方灰**         | 斑马纹行与非斑马纹行 hover 是两种颜色 |
| `--vxe-ui-table-row-striped-background-color`       | `#1d1d1d`（4.6%）       | 3% → 偏暗                      | 斑马纹偏弱                            |
| `--vxe-ui-table-border-color`                       | `#37373a`（15.6%）      | 12% → 偏暗                     | 边框偏弱                              |
| `--vxe-ui-input-border-color`                       | `#424242`（20.3%）      | 12% → 偏暗                     | 输入框边框偏弱                        |
| `--vxe-ui-layout-background-color`                  | `#121212`               | `--bg-surface`（项目表面）     | 有意融入项目，保留                    |
| `--vxe-ui-font-color`                               | 60% 白                  | `--fg-default`                 | 项目文字层级更亮，保留                |

### 2.3 发现

1. **`hover-striped` 漏映射**：官方深色/浅色都把它定义成与 `hover` 相同，项目只覆盖了 `hover`，于是斑马纹行 hover 仍是官方的中性灰，非斑马纹行是品牌色，同一张表格出现两种 hover。
2. **层次比例低于官方**：表头 6% vs 9.3%、斑马纹 3% vs 4.6%、边框 12% vs 15.6%，深色下表格的层次比官方弱。
3. **hover 色相被品牌化**：官方是中性灰；项目改成品牌色。这一条经确认**保留品牌色**——hover 是项目表达品牌反馈的状态，亮度仍与官方同档；其余层次按官方比例。

### 2.4 处理

按官方给出的比例，把 VXE 的中性层次映射到项目表面色（`--bg-surface`）；**行 hover 例外，保留品牌色**：

- 表头 9.5%、斑马纹 4.6%、边框 16%、输入框边框 20%；
- 行 hover 用「品牌色 10% 混表面」，深浅模式语义一致；`hover-striped` 直接引用 `hover`，斑马纹行不会出现第二种颜色；
- `layout-background`、字体、主色、圆角继续映射（融入项目 + 品牌跟随）。

浅色同步对齐官方比例（表头 2.7%、斑马纹 2%、边框沿用 `--border-default`），hover 同样用品牌色，避免出现「深色品牌、浅色中性」的分裂。

> 依据 `docs/styling.md`「只映射必须跟随品牌的部分」：VXE 的表头/斑马纹/边框属于组件专属层次，官方已按明暗调过，不应整份替换成品牌色；hover 是明确保留的品牌反馈状态。

---

## 3. 修正清单

| 文件                     | 改动                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `tokens.css`             | `html.dark` 的 `--brand-tint` 由 `black` 改为 `var(--bg-surface)`；注释同步说明官方算法                          |
| `adapters/vxe-table.css` | 表头/斑马纹/边框按官方比例重算；补 `--vxe-ui-table-row-hover-striped-background-color` 联动；行 hover 保留品牌色 |
| `docs/styling.md`        | 更新 `--brand-tint` 深色说明（不再「混黑」）                                                                     |

## 4. 验证

1. 深色下悬停侧栏菜单：hover 背景应比侧栏背景亮一档，文字/图标可辨。
2. 深色下悬停 VXE 表格的普通行与斑马纹行：两种行 hover 颜色一致，且比表体亮一档。
3. 深色下表头、斑马纹、边框层次与官方 `#28282a / #1d1d1d / #37373a` 的明度关系一致。
4. 浅色模式复查：菜单 hover、表格 hover/表头/边框与 EP / VXE 官方浅色关系一致（hover 为品牌色属有意差异）。
5. `npm run build` 通过。
