/**
 * Demo 模块的类型声明。
 *
 * '#podium-demo' 是 nuxt.config.ts 里的构建期别名：
 * demo 开启指向 app/demo/index.ts，关闭指向 app/demo/stub.ts。
 * 两个实现导出形状一致，这里声明共同契约，供 TS / IDE 使用。
 */
declare module '#podium-demo' {
  import type { Component } from 'vue'
  import type { ITabData } from 'vue-stack-tabs'

  export type DemoTranslate = (key: string) => string

  export const DemoMenuItems: Component
  export const DEMO_TAB_TITLE_KEYS: Record<string, string>
  export function createDemoMenuTabs(t: DemoTranslate): Record<string, ITabData>
}
