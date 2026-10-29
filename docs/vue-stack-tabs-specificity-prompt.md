# 给 vue-stack-tabs 的修改提示

> 状态：已在 `vue-stack-tabs@2.5.1` 实现。保留本文档作为参考。

> 直接复制下面这段发给维护者或编码助手即可。

---

请修改 `vue-stack-tabs` 的样式层，把主题变量选择器的特异性归零，让宿主可以用普通 `:root` 覆盖变量，不再需要写 `:root:root`。

## 背景

当前 `src/lib/assets/style/common/theme.scss` 中：

- 默认值定义在 `:root`，特异性 (0,1,0)
- 暗色值定义在 `:root.dark, :root[data-theme='dark'], [data-theme='dark']`，特异性分别是 (0,2,0)、(0,2,0)、(0,1,1)
- 三档尺寸预设定义在 `:root[data-stack-tab-size='...'], [data-stack-tab-size='...']`

宿主想用一套 `:root { --stack-tab-accent: ... }` 同时管浅色和深色时，暗色块会因为特异性更高而覆盖宿主的设置。宿主只能被迫写 `:root:root`，可读性差，而且依赖样式加载顺序。

## 目标

把 `theme.scss` 中所有主题变量块包进 `:where()`，把特异性降到 0。一共 5 个块：

1. 默认值块：

```scss
:where(:root) {
  /* 原有的全部默认变量，值不变 */
}
```

2. 三档尺寸预设块：

```scss
:where(:root[data-stack-tab-size='small'], [data-stack-tab-size='small']) {
  /* 原 small 预设，值不变 */
}

:where(:root[data-stack-tab-size='normal'], [data-stack-tab-size='normal']) {
  /* 原 normal 预设，值不变 */
}

:where(:root[data-stack-tab-size='large'], [data-stack-tab-size='large']) {
  /* 原 large 预设，值不变 */
}
```

3. 暗色块：

```scss
:where(:root.dark, :root[data-theme='dark'], [data-theme='dark']) {
  /* 原有的全部暗色变量，值不变 */
}
```

## 关键注意事项

**默认值块必须一起改。** 如果只把暗色块包进 `:where()`，它的特异性变成 0，会被 `:root`（0,1,0）的默认值压过，暗色将完全不生效。

不要使用 `:is()`：它的特异性由内部最高选择器决定，不能归零；只有 `:where()` 的特异性是 0。

不要做这些事：

- 不要改变量名、默认值、暗色值。
- 不要改规则里 `var(--stack-tab-*, fallback)` 的 fallback。
- 不要动 `var.scss`（只有注释和编译期变量）。
- 不需要新增变量，也不需要改组件逻辑。

## 验收标准

1. 浅色模式视觉与 2.5.0 一致。
2. 暗色模式仍生效：`<html class="dark">` 和 `<html data-theme="dark">` 都能切换。
3. 宿主只写普通 `:root` 就能覆盖：

   ```css
   :root {
     --stack-tab-accent: #4f46e5;
     --stack-tab-font-size: 15px;
   }
   ```

   该覆盖在浅色和暗色下都生效，不需要 `:root:root`。

4. 尺寸预设仍生效：`data-stack-tab-size="small|normal|large"` 的字号、页签头高度、菜单项高度正确。
5. 宿主覆盖 `--stack-tab-font-size` 时，能压过 `data-stack-tab-size` 预设。
6. `pnpm build` 通过，`dist/style.css` 中对应选择器带 `:where()`。

## 兼容性说明

`:where()` 支持 Chrome 88+ / Safari 14+ / Firefox 78+。项目已经在使用 `color-mix()`（Chrome 111+），所以不构成新的兼容性限制。

## 可选：文档补充

如果采纳，建议在主题文档里把宿主覆盖方式从 `:root:root` 改成普通的 `:root`，并说明 `:where()` 的策略，避免后续宿主继续使用高特异性补丁。
