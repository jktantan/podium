<template>
  <WaterMark :content="['测试水印', '测试水印']">
    <el-container class="app-layout">
      <el-header
        class="app-layout__header flex items-center justify-between border-b border-line bg-surface"
        height="50px"
      >
        <span class="text-[15px] font-bold uppercase tracking-[0.12em] text-primary">Podium</span>

        <div class="flex items-center gap-2">
          <LanguageSwitcher />
          <AppearanceSwitcher />
          <span class="max-w-[180px] truncate text-[13px] text-secondary">{{ user }}</span>
          <el-button @click="logoutToLogin">{{ t('nav.logout') }}</el-button>
        </div>
      </el-header>

      <el-splitter
        ref="splitterRef"
        class="app-layout__body"
        :class="{ 'is-resizing': asideResizing }"
        layout="horizontal"
        @resize-start="handleAsideResizeStart"
        @resize-end="handleAsideResizeEnd"
        @keydown="handleSplitterKeydown"
      >
        <el-splitter-panel
          class="app-layout__aside-panel"
          :size="asideWidth"
          :min="asideCollapsed ? undefined : `${ASIDE_MIN_WIDTH}px`"
          :max="`${ASIDE_MAX_WIDTH}px`"
          :resizable="!asideCollapsed"
        >
          <!-- 菜单滚动交给 OverlayScrollbars，避免容器再产生一条原生滚动条 -->
          <AppScrollbar id="app-layout-aside" class="app-layout__aside-scroll">
            <SidebarMenu :collapse="asideCollapsed" :active="activeMenu" @select="handleMenuSelect">
              <!--
                可选层扩展位：demo 层加载时由 appConfig 提供菜单组件名，
                未加载时这里不渲染任何内容。菜单顺序由宿主固定：
                首页 → 项目 API 菜单 → demo 菜单。
              -->
              <component :is="demoMenuComponent" v-if="demoMenuComponent" />
            </SidebarMenu>
          </AppScrollbar>
        </el-splitter-panel>

        <el-splitter-panel class="app-layout__main-panel" :size="mainWidth">
          <el-main class="app-layout__main">
            <!-- 与 auth 布局同款动态氛围背景，压在主区域背景之上、页签之下 -->
            <AppAmbientBackdrop class="app-layout__ambient" />

            <!--
          页签容器在客户端挂载完成后再渲染：
          既提供首屏占位，也避免 vue-stack-tabs 直接使用 RouterView 时触发 Nuxt 的页面渲染诊断。
        -->
            <ClientOnly>
              <VueStackTabs
                iframe-path="/iframe"
                :home-tab="homeTab"
                :i18n="stackTabsLocale"
                :max="20"
                :contextmenu="true"
                :page-scroll="PageScroll"
                :page-loading="pageLoading"
                height="100%"
                style="padding: 5px"
              >
                <!-- 缩展按钮放在标签栏左侧，复用库的 header 按钮尺寸与外观 -->
                <template #leftButton>
                  <TabHeaderButton
                    class="app-layout__aside-toggle"
                    :class="{ 'is-collapsed': asideCollapsed }"
                    :title="asideToggleLabel"
                    :aria-label="asideToggleLabel"
                    :aria-expanded="!asideCollapsed"
                    aria-controls="app-layout-aside"
                    @click="toggleAside"
                  >
                    <template #icon>
                      <ElIconFold class="app-layout__aside-toggle-icon" />
                    </template>
                  </TabHeaderButton>
                </template>
              </VueStackTabs>

              <template #fallback>
                <div class="grid h-full place-items-center text-sm text-muted">
                  {{ t('app.loading') }}
                </div>
              </template>
            </ClientOnly>
          </el-main>
        </el-splitter-panel>
      </el-splitter>
    </el-container>
  </WaterMark>
</template>

<script setup lang="ts">
import type { ITabData } from 'vue-stack-tabs'
import { useTabActions } from 'vue-stack-tabs'
import PageScroll from '~/components/stackTabs/PageScroll.vue'
import SidebarMenu from '~/components/layout/SidebarMenu.vue'

/**
 * 可选层通过 appConfig 提供扩展数据，宿主不 import 任何层内模块。
 * 层未加载时 demoExtension 为 undefined，菜单与页签表里都不会出现 demo 条目。
 */
const appConfig = useAppConfig()
const { baseURL } = useRuntimeConfig().app
const demoExtension = computed(() => appConfig.podium?.sidebar?.demo)
const demoMenuComponent = computed(() => demoExtension.value?.menuComponent ?? null)

/**
 * 菜单页签的 id 是稳定值，语言切换后按 id 回写标题。
 * （页签标题是打开时的快照，不会自动跟随语言包变化。）
 *
 * demo 页签的标题键由 demo 层的 appConfig 提供：层未加载时为空对象。
 */
const TAB_TITLE_KEYS = computed<Record<string, string>>(() => ({
  ...Object.fromEntries(
    Object.entries(demoExtension.value?.tabs ?? {}).map(([id, tab]) => [id, tab.titleKey])
  ),
  home: 'nav.home'
}))

const { user, isLoggedIn } = useAuth()
/** 导航 loading 开关：内网等快速环境可在 .env.<环境> 里把 NUXT_PUBLIC_PAGE_LOADING 设为 0 */
const { pageLoading } = useRuntimeConfig().public
const { openTab, updateTabTitle, tabs } = useTabActions()
const { connect, destroy } = useStomp()
const logoutToLogin = useLogout()
const { t, currentLocale, stackTabsLocale } = useLocale()

/**
 * STOMP 连接跟随登录后的 default 布局：
 * - 进入布局时建立唯一连接；
 * - 离开布局时彻底销毁，重新登录会创建全新连接。
 */
onMounted(() => {
  if (isLoggedIn.value) {
    void connect()
  }
})

onBeforeUnmount(() => {
  void destroy()
})

/** 侧栏宽度：收起时与 el-menu collapse 的图标宽度（24 + 20 * 2）对齐 */
const ASIDE_COLLAPSED_WIDTH = 64
const ASIDE_DEFAULT_WIDTH = 192
const ASIDE_MIN_WIDTH = 160
const ASIDE_MAX_WIDTH = 420
const ASIDE_WIDTH_STORAGE_KEY = 'podium:sidebar-width'

/** 左侧菜单是否收起为图标模式 */
const asideCollapsed = ref(false)

/** 展开态宽度可拖拽，折叠后再展开时恢复到这里记住的宽度 */
const asideSavedWidth = ref(readAsideWidth())

function readAsideWidth() {
  if (!import.meta.client) {
    return ASIDE_DEFAULT_WIDTH
  }

  try {
    const raw = window.localStorage.getItem(ASIDE_WIDTH_STORAGE_KEY)
    const value = raw === null ? Number.NaN : Number(raw)

    if (!Number.isFinite(value)) {
      return ASIDE_DEFAULT_WIDTH
    }

    return Math.min(Math.max(value, ASIDE_MIN_WIDTH), ASIDE_MAX_WIDTH)
  } catch {
    return ASIDE_DEFAULT_WIDTH
  }
}

function saveAsideWidth(width: number) {
  asideSavedWidth.value = width

  try {
    window.localStorage.setItem(ASIDE_WIDTH_STORAGE_KEY, String(width))
  } catch {
    // 隐私模式 / 存储被禁用时忽略，界面仍然可用
  }
}

/** splitter 容器宽度：主区域尺寸按它减去侧栏宽度计算 */
const splitterWidth = ref(0)
let splitterResizeObserver: ResizeObserver | null = null

const asidePanelWidth = computed(() =>
  asideCollapsed.value ? ASIDE_COLLAPSED_WIDTH : asideSavedWidth.value
)

/*
 * 两块面板的尺寸各自受控、且之和始终等于容器宽度。
 * 只固定侧栏时，EP 的 useSize 会把两块面板的固定 px 当比例归一化，
 * 拖拽过或窗口大小变化后，侧栏宽度就会跟着容器一起漂移。
 */
const asideWidth = computed(() => `${asidePanelWidth.value}px`)
const mainWidth = computed(() =>
  splitterWidth.value > 0 ? `${splitterWidth.value - asidePanelWidth.value}px` : undefined
)

/** 拖拽期间禁用宽度过渡，避免 flex-basis 过渡造成拖影 */
const asideResizing = ref(false)

function handleAsideResizeStart() {
  asideResizing.value = true
}

/** 拖拽结束：记住展开宽度；折叠宽度由按钮控制，不写回存储 */
function handleAsideResizeEnd(_index: number, sizes: number[]) {
  asideResizing.value = false

  if (asideCollapsed.value) {
    return
  }

  const width = Math.round(sizes[0] ?? 0)
  if (width < ASIDE_MIN_WIDTH) {
    return
  }

  saveAsideWidth(Math.min(width, ASIDE_MAX_WIDTH))
}

/**
 * el-splitter 的分隔条只有鼠标 / 触摸拖拽，没有键盘与 ARIA 语义。
 * 挂载后补齐 separator 属性：方向键按 8px（Shift 32px）调整，Home / End 到两端。
 */
const splitterRef = ref<{ $el?: HTMLElement } | null>(null)

function syncSplitterA11y() {
  const bar = splitterRef.value?.$el?.querySelector<HTMLElement>('.el-splitter-bar__dragger')

  if (!bar) {
    return
  }

  bar.setAttribute('role', 'separator')
  bar.setAttribute('aria-orientation', 'vertical')
  bar.setAttribute('aria-label', t('app.resizeSidebar'))
  bar.setAttribute('aria-controls', 'app-layout-aside')
  bar.setAttribute('aria-valuemin', String(ASIDE_MIN_WIDTH))
  bar.setAttribute('aria-valuemax', String(ASIDE_MAX_WIDTH))
  bar.setAttribute('aria-valuenow', String(asideSavedWidth.value))
  // 折叠态宽度固定，分隔条不进入键盘焦点
  bar.setAttribute('aria-disabled', String(asideCollapsed.value))
  bar.setAttribute('tabindex', asideCollapsed.value ? '-1' : '0')
}

function handleSplitterKeydown(event: KeyboardEvent) {
  const target = event.target

  if (
    asideCollapsed.value ||
    !(target instanceof HTMLElement) ||
    !target.classList.contains('el-splitter-bar__dragger')
  ) {
    return
  }

  const step = event.shiftKey ? 32 : 8
  let width = asideSavedWidth.value

  switch (event.key) {
    case 'ArrowLeft':
      width -= step
      break
    case 'ArrowRight':
      width += step
      break
    case 'Home':
      width = ASIDE_MIN_WIDTH
      break
    case 'End':
      width = ASIDE_MAX_WIDTH
      break
    default:
      return
  }

  event.preventDefault()
  saveAsideWidth(Math.min(Math.max(width, ASIDE_MIN_WIDTH), ASIDE_MAX_WIDTH))
}

onMounted(syncSplitterA11y)
watch([asideCollapsed, asideSavedWidth, currentLocale], syncSplitterA11y)

/** 跟随容器宽度更新主区域尺寸，保证两块面板之和恒等于容器宽度 */
onMounted(() => {
  const el = splitterRef.value?.$el

  if (!el) {
    return
  }

  splitterWidth.value = el.clientWidth
  splitterResizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width ?? 0

    if (width > 0) {
      splitterWidth.value = Math.round(width)
    }
  })
  splitterResizeObserver.observe(el)
})

onBeforeUnmount(() => {
  splitterResizeObserver?.disconnect()
  splitterResizeObserver = null
})
const asideToggleLabel = computed(() =>
  asideCollapsed.value ? t('app.expandSidebar') : t('app.collapseSidebar')
)

function toggleAside() {
  asideCollapsed.value = !asideCollapsed.value
}

const homeTab = computed<ITabData>(() => ({
  // 固定 id，避免刷新时 sessionStorage 恢复的首页与默认首页生成两个页签
  id: 'home',
  title: t('nav.home'),
  path: '/admin',
  closable: false,
  refreshable: true
}))

/**
 * 菜单 index → 页签数据。
 * 菜单 item 的 index 与页签 id 保持一致，激活态可以直接用页签 id 驱动。
 *
 * demo 条目全部来自 appConfig；项目自己的 API 菜单以后在这里按同样结构
 * 合并即可，demo 始终排在最后。
 */
const menuTabs = computed<Record<string, ITabData>>(() => {
  const demoTabs = Object.fromEntries(
    Object.entries(demoExtension.value?.tabs ?? {}).map(([id, tab]) => [
      id,
      {
        id,
        title: t(tab.titleKey),
        // iframe 页签指向静态资源，不走 router，需要手动补 app.baseURL
        path: tab.iframe ? `${baseURL}${tab.path.replace(/^\//, '')}` : tab.path,
        ...(tab.iframe ? { iframe: true } : {})
      }
    ])
  )

  return {
    ...demoTabs,
    home: { ...homeTab.value }
  }
})

/**
 * 左侧菜单的激活项跟着当前页签走。
 *
 * 不能用 route.path：vue-stack-tabs 的页签切换（含页签内前进 / 后退）
 * 由库内部维护页面栈，布局层拿到的 route 不会跟着变，
 * 只有 tabs 里的 active 视图对象是可靠的。
 * 菜单 item 的 index 就是页签 id，直接用它驱动 default-active
 * （el-menu 内部通过 updateActiveIndex 落地）。
 */
const activeMenu = computed(() => tabs.value.find((tab) => tab.active)?.id ?? '')

function handleMenuSelect(index: string) {
  const tab = menuTabs.value[index]

  if (!tab) {
    return
  }

  void openTab({ ...tab })
}

// 已打开的菜单页签跟随语言切换，避免中英混排。
// updateTabTitle 会同步 store / session / URL，但库内复用稳定的页签视图对象，
// 子组件按引用比较会跳过更新；这里再替换一次视图对象引用，让标题立即刷新。
watch(currentLocale, () => {
  const localized = tabs.value.map((tab) => {
    const key = TAB_TITLE_KEYS.value[tab.id]

    if (!key) {
      return tab
    }

    const title = t(key)
    updateTabTitle(tab.id, title)
    return { ...tab, title }
  })

  tabs.value = localized
})
</script>

<style scoped lang="scss">
@use '../assets/scss/mixins' as *;

.app-layout {
  // 布局直接用语义令牌，深浅色模式自动跟随，不再维护局部色值
  height: 100vh;

  &__header {
    --el-header-padding: 0 14px;
  }

  &__body {
    // el-splitter 自带 height: 100%，作为 flex 列的直接子项会取整屏高度；这里用 flex 撑满剩余空间
    flex: 1;
    height: auto;
    min-height: 0;

    // el-splitter-panel 是 Fragment 根组件，拿不到父级 scoped 标记；
    // 默认 overflow: auto，滚动交给内部容器，避免出现双滚动条
    :deep(.el-splitter-panel) {
      overflow: hidden;
      // 折叠 / 展开时宽度跟着图标栏一起过渡
      transition: flex-basis 300ms ease;
    }

    // 侧栏背景直接放在面板上：面板就是侧栏的盒子，不再额外包一层
    :deep(.app-layout__aside-panel) {
      background: var(--bg-surface);
    }

    // 拖拽是逐帧写 flex-basis，带过渡会拖影
    &.is-resizing :deep(.el-splitter-panel) {
      transition: none;
    }

    // 分隔条：默认 1px 边框色；悬停 / 拖拽时整条热区亮起主色
    :deep(.el-splitter-bar__dragger) {
      border-radius: var(--radius-xs);
      transition: background-color 150ms ease;

      &::before {
        width: 1px;
        background-color: var(--border-default);
        transition:
          width 150ms ease,
          background-color 150ms ease;
      }

      &:hover:not(.is-disabled) {
        background-color: color-mix(in srgb, var(--brand-primary) 14%, transparent);

        &::before {
          width: 2px;
          background-color: var(--brand-primary);
        }
      }

      // 拖拽中：热区再加深一档，主线保持主色
      &.el-splitter-bar__dragger-active {
        background-color: color-mix(in srgb, var(--brand-primary) 22%, transparent);

        &::before {
          width: 2px;
          background-color: var(--brand-primary);
        }
      }
    }
  }

  &__aside-scroll {
    // OverlayScrollbars 的宿主不会像 el-scrollbar 那样自带 height: 100%
    height: 100%;

    // 分隔条热区覆盖侧栏右缘 8px，滚动条内移避让，避免被拖拽条接管
    :deep(.os-scrollbar-vertical) {
      right: 5px;
    }
  }

  &__aside-toggle {
    &:focus-visible {
      outline: 2px solid var(--brand-primary);
      outline-offset: -4px;
    }
  }

  &__aside-toggle-icon {
    width: 16px;
    height: 16px;
    // 图标在两个状态之间旋转，过渡时长与 aside 宽度一致
    transition: transform 300ms ease;
  }

  &__aside-toggle.is-collapsed &__aside-toggle-icon {
    transform: rotate(180deg);
  }

  &__main {
    position: relative;
    // 建立层叠上下文：光斑用负 z-index 停在背景之上、页签内容之下
    isolation: isolate;
    height: 100%;
    min-height: 0;
    overflow: hidden;
    padding: 0 0 0 5px;

    /*
     * 卡片要透出动态背景：只保留一层很薄的表面色，不再做毛玻璃。
     * 六边形纹理由主区域那一层直接透出来，只有一套网格，不会错位；
     * 深色下表面色收得紧一些，避免内容区和纹理糊在一起。
     */
    --main-card-surface: color-mix(in srgb, var(--bg-surface) 10%, transparent);

    background: var(--ambient-base);

    /*
     * 六边形纹理单独一层：mask 在四周淡出，避免整块工作区变成蜂巢板。
     * 要单独成层就不能写进 background 简写里 —— mask 会连底色和光斑一起裁掉。
     *
     * 线用带一点模糊的细描边，不用硬边实线：1px 落在半透明底上
     * 仍然是一条清晰可见的线，blur 之后才真正是"纹理"而不是"图案"。
     */
    &::before {
      position: absolute;
      z-index: 0;
      inset: 0;

      @include ambient-mesh;

      pointer-events: none;
      content: '';
    }

    html.dark & {
      --main-card-surface: color-mix(in srgb, var(--bg-surface) 10%, transparent);
    }

    /*
     * 卡片底色改为半透明：否则不透明的 .stack-tab 会铺满主区域，
     * 把上面的背景柔光、光斑和六边形纹理整个盖住。
     *
     * 不再使用 backdrop-filter：六边形只画在主区域一层，毛玻璃会把它糊成雾；
     * 而且 backdrop-filter 会让元素成为 position: fixed 后代的包含块，
     * 库的右键菜单是 fixed + clientX/clientY，会被整体带偏。
     *
     * 这些样式只作用于普通卡片态：最大化时库靠 .stack-tab--maximum
     * 把元素改成 position: fixed + inset: 0，若这里仍命中 .stack-tab，
     * 高特异性的 position: relative 会压过库规则，最大化会塌成一张小卡片。
     */
    :deep(.stack-tab:not(.stack-tab--maximum)) {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      //border: 1px solid color-mix(in srgb, var(--border-default) 72%, transparent);
      //border-radius: var(--radius-md);
      box-shadow: var(--el-box-shadow-lighter);
      background: var(--main-card-surface);
    }
  }

  // 与 auth 布局同款动态氛围背景：负 z-index 保证不遮挡页签内容
  &__ambient {
    z-index: -1;
  }
}
</style>
