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

      <el-container class="app-layout__body">
        <el-aside id="app-layout-aside" class="app-layout__aside" :width="asideWidth">
          <!-- 菜单滚动交给 OverlayScrollbars，避免 el-aside 原生滚动条与外层滚动条叠加 -->
          <AppScrollbar class="app-layout__aside-scroll">
            <!--
            收缩时交给 el-menu 原生 collapse 模式：只留图标，激活态与点击导航不变。
            每项用 #title 插槽提供文字，折叠后该插槽会作为悬浮提示显示。
          -->
            <el-menu
              class="app-layout__menu"
              :collapse="asideCollapsed"
              :collapse-transition="false"
              :default-active="activeMenu"
              @select="handleMenuSelect"
              @mouseover="handleMenuHover"
              @mouseout="handleMenuOut"
            >
              <el-menu-item index="home">
                <el-icon><ElIconHomeFilled /></el-icon>
                <template #title>
                  <span>{{ t('nav.home') }}</span>
                </template>
              </el-menu-item>
              <!--
                可选层扩展位：demo 层加载时由 appConfig 提供菜单组件名，
                未加载时这里不渲染任何内容。菜单顺序由宿主固定：
                首页 → 项目 API 菜单 → demo 菜单。
              -->
              <component :is="demoMenuComponent" v-if="demoMenuComponent" />
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
          </AppScrollbar>
        </el-aside>

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
      </el-container>
    </el-container>
  </WaterMark>
</template>

<script setup lang="ts">
import type { ITabData } from 'vue-stack-tabs'
import { useTabActions } from 'vue-stack-tabs'
import PageScroll from '~/components/stackTabs/PageScroll.vue'

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

/** 左侧菜单是否收起为图标模式 */
const asideCollapsed = ref(false)
/** el-aside 宽度：收起时与 el-menu collapse 的图标宽度（24 + 20 * 2）对齐 */
const asideWidth = computed(() => (asideCollapsed.value ? '64px' : '192px'))
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

/**
 * 展开态菜单项文字被省略号截断时，悬停显示完整名称。
 *
 * el-menu 只在折叠态自带 tooltip，展开态截断后需要补一层提示；
 * 这里用事件委托，后续通过 API 下发的菜单项不用各自处理。
 */
const menuTooltip = reactive({
  visible: false,
  text: '',
  target: null as HTMLElement | null
})

function handleMenuHover(event: MouseEvent) {
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

function handleMenuOut(event: MouseEvent) {
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
    min-height: 0;
  }

  &__aside {
    // 滚动交给 OverlayScrollbars，避免 el-aside 默认 overflow: auto 再产生一条原生滚动条
    overflow: hidden;
    border-right: 1px solid var(--border-default);
    background: var(--bg-surface);
    // 收缩 / 展开时宽度跟着图标栏一起过渡，菜单内容由 overflow 裁切
    transition: width 300ms ease;
  }

  &__aside-scroll {
    // OverlayScrollbars 的宿主不会像 el-scrollbar 那样自带 height: 100%
    height: 100%;
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

  &__menu {
    //高度由内容决定，超出部分由外层 OverlayScrollbars 滚动
    --el-menu-item-height: 42px;
    //--el-menu-base-level-padding: 14px;

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

  &__main {
    position: relative;
    // 建立层叠上下文：光斑用负 z-index 停在背景之上、页签内容之下
    isolation: isolate;
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
