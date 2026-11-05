<template>
  <el-menu
    class="sidebar-menu"
    :collapse="collapse"
    :collapse-transition="false"
    :default-active="active"
    @select="handleSelect"
    @mouseover="handleHover"
    @mouseout="handleOut"
  >
    <el-menu-item index="home">
      <el-icon><ElIconHomeFilled /></el-icon>
      <template #title>
        <span>{{ t('nav.home') }}</span>
      </template>
    </el-menu-item>

    <!--
      宿主之外的可选层菜单（如 demo）由调用方通过默认插槽注入，
      菜单顺序由宿主固定：首页 → 项目 API 菜单 → 扩展菜单。
    -->
    <slot />
  </el-menu>

  <!--
    展开态的文字截断提示：el-menu 只在折叠态自带 tooltip，
    展开态文字被省略号截断后，这里用虚拟触发补一个。
  -->
  <el-tooltip
    :visible="menuTooltip.visible"
    :content="menuTooltip.text"
    :virtual-ref="menuTooltip.target ?? undefined"
    virtual-triggering
    placement="right"
    :interactive="false"
  />
</template>

<script setup lang="ts">
/**
 * 左侧导航菜单。
 *
 * 只负责菜单本身的渲染与交互：
 * - 折叠态交给 el-menu 原生 collapse，只留图标；
 * - 每项用 #title 插槽提供文字，折叠后作为悬浮提示；
 * - 展开态文字被截断时，悬停补一个完整名称提示。
 *
 * 宽度、折叠按钮由布局负责；可选项通过默认插槽注入。
 */
interface SidebarMenuProps {
  /** 是否收起为图标模式 */
  collapse: boolean
  /** 当前激活菜单项的 index（与页签 id 一致） */
  active: string
}

defineProps<SidebarMenuProps>()

const emit = defineEmits<{ select: [index: string] }>()

const { t } = useLocale()

const menuTooltip = reactive({
  visible: false,
  text: '',
  target: null as HTMLElement | null
})

function handleSelect(index: string) {
  emit('select', index)
}

/**
 * 展开态菜单项文字被省略号截断时，悬停显示完整名称。
 * 用事件委托，调用方通过插槽注入的菜单项不需要各自处理。
 */
function handleHover(event: MouseEvent) {
  const target = event.target

  if (!(target instanceof Element)) {
    return
  }

  const item = target.closest<HTMLElement>('.el-menu-item, .el-sub-menu__title')
  // 折叠态由 el-menu 自带 tooltip 负责
  if (!item || item.closest('.el-menu--collapse')) {
    return
  }

  const label = item.querySelector<HTMLElement>(':scope > span')
  if (!label || label.scrollWidth <= label.clientWidth) {
    return
  }

  menuTooltip.target = item
  menuTooltip.text = label.textContent?.trim() ?? ''
  menuTooltip.visible = true
}

function handleOut(event: MouseEvent) {
  const target = event.target

  if (!(target instanceof Element)) {
    return
  }

  const item = target.closest<HTMLElement>('.el-menu-item, .el-sub-menu__title')
  if (!item) {
    return
  }

  // 在同一个菜单项内部移动（图标 ↔ 文字）不关闭提示
  const related = event.relatedTarget
  if (related instanceof Node && item.contains(related)) {
    return
  }

  menuTooltip.visible = false
}
</script>

<style scoped lang="scss">
.sidebar-menu {
  // 高度由内容决定，超出部分由外层 OverlayScrollbars 滚动
  --el-menu-item-height: 42px;

  border-right: none;

  /*
   * 菜单项文字过长时用省略号截断。
   * el-menu-item 本身宽度固定为侧栏宽度，文字默认 nowrap 会溢出到项外，
   * 此时激活底色只铺满菜单项，超出的文字既没有底色，也会被侧栏裁掉。
   * 让文字成为可收缩的 flex 项后，底色、可见文字始终是同一宽度。
   */
  :deep(.el-menu-item),
  :deep(.el-sub-menu__title) {
    > .el-icon {
      // 图标不参与收缩，省略只发生在文字上
      flex-shrink: 0;
    }

    > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  :deep(.el-menu-item.is-active) {
    background: var(--brand-primary-surface);
    font-weight: 600;
  }

  :deep(.el-menu-item.is-active)::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    border-radius: 0 var(--radius-xs) var(--radius-xs) 0;
    background: var(--brand-primary);
    content: '';
  }
}
</style>
