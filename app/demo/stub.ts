import { defineComponent } from 'vue'
import type { ITabData } from 'vue-stack-tabs'
import type { DemoHomeCard, DemoTranslate } from './index'

/**
 * PODIUM_DEMO=0（pnpm build:prod）时 '#podium-demo' 指向本文件。
 *
 * 导出形状必须与 ./index.ts 一致，让布局与首页代码在两种模式下都能编译；
 * 组件渲染为空，页签与卡片数据为空，生产包里不包含 demo 菜单 / 页面引用。
 */

export const DemoMenuItems = defineComponent({
  name: 'DemoMenuItemsDisabled',
  render: () => null
})

export const DEMO_TAB_TITLE_KEYS: Record<string, string> = {}

export function createDemoMenuTabs(_t: DemoTranslate): Record<string, ITabData> {
  return {}
}

export function createDemoHomeCards(_t: DemoTranslate): DemoHomeCard[] {
  return []
}
