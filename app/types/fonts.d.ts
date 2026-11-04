/**
 * vite-plugin-font：import 字体文件时注入 @font-face，并导出 CSS 元信息。
 *
 * 这里只声明组件实际用到的字段；完整类型见
 * node_modules/vite-plugin-font/src/font.d.ts。
 */
declare module '*.ttf' {
  export const css: {
    family: string
    weight?: string
    style?: string
  }
  export const fontFamilyFallback: string
}

/**
 * ?subsets 的 specifier 以 `?subsets` 结尾，不匹配上面的 `*.ttf`，
 * 需要单独声明，否则类型检查/IDE 会报找不到模块。
 */
declare module '*.ttf?subsets' {
  export const css: {
    family: string
    weight?: string
    style?: string
  }
  export const fontFamilyFallback: string
}

/**
 * 按 key 选择扫描范围的变体，形如 `Inconsolata.ttf?subsets&key=latin`。
 * TS 的模块通配只能有一个 `*`，所以这里把 key 也写进后缀。
 */
declare module '*.ttf?subsets&key=latin' {
  export const css: {
    family: string
    weight?: string
    style?: string
  }
  export const fontFamilyFallback: string
}
