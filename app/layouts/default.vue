<template>
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
          >
            <el-menu-item index="home">
              <el-icon><ElIconHomeFilled /></el-icon>
              <template #title>
                <span>{{ t('nav.home') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="about">
              <el-icon><ElIconInfoFilled /></el-icon>
              <template #title>
                <span>{{ t('nav.about') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="settings">
              <el-icon><ElIconSetting /></el-icon>
              <template #title>
                <span>{{ t('nav.settings') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="iframe">
              <el-icon><ElIconMonitor /></el-icon>
              <template #title>
                <span>{{ t('nav.iframe') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="404-demo">
              <el-icon><ElIconWarningFilled /></el-icon>
              <template #title>
                <span>{{ t('nav.notFound') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="permission-demo">
              <el-icon><ElIconLock /></el-icon>
              <template #title>
                <span>{{ t('nav.permissionDemo') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="table-demo">
              <el-icon><ElIconGrid /></el-icon>
              <template #title>
                <span>{{ t('nav.tableDemo') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="element-plus-demo">
              <el-icon><ElIconMouse /></el-icon>
              <template #title>
                <span>{{ t('nav.elementPlusDemo') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="ep-field-view-demo">
              <el-icon><ElIconDocument /></el-icon>
              <template #title>
                <span>{{ t('nav.epFieldViewDemo') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="layer-demo">
              <el-icon><ElIconCopyDocument /></el-icon>
              <template #title>
                <span>{{ t('nav.layerDemo') }}</span>
              </template>
            </el-menu-item>
            <el-menu-item index="search-demo">
              <el-icon><ElIconCopyDocument /></el-icon>
              <template #title>
                <span>查询柜架</span>
              </template>
            </el-menu-item>
          </el-menu>
        </AppScrollbar>
      </el-aside>

      <el-main class="app-layout__main">
        <!-- 与 auth 布局一致的浮层光斑，压在主区域背景之上、页签之下 -->
        <div class="app-layout__glow app-layout__glow--top" aria-hidden="true"></div>
        <div class="app-layout__glow app-layout__glow--bottom" aria-hidden="true"></div>

        <!--
          页签容器在客户端挂载完成后再渲染：
          既提供首屏占位，也避免 vue-stack-tabs 直接使用 RouterView 时触发 Nuxt 的页面渲染诊断。
        -->
        <ClientOnly>
          <VueStackTabs
            iframe-path="/admin/iframe"
            :home-tab="homeTab"
            :i18n="stackTabsLocale"
            :max="20"
            :contextmenu="true"
            :page-scroll="PageScroll"
            height="100%"
            style="padding: 5px"
          >
            <!-- 缩展按钮放在标签栏左侧，复用库的 header 按钮尺寸与外观 -->
            <template #leftButton>
              <button
                type="button"
                class="stack-tab__header-button app-layout__aside-toggle"
                :class="{ 'is-collapsed': asideCollapsed }"
                :title="asideToggleLabel"
                :aria-label="asideToggleLabel"
                :aria-expanded="!asideCollapsed"
                aria-controls="app-layout-aside"
                @click="toggleAside"
              >
                <span class="stack-tab__button">
                  <ElIconFold class="app-layout__aside-toggle-icon" />
                </span>
              </button>
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
</template>

<script setup lang="ts">
import type { ITabData } from 'vue-stack-tabs'
import { useTabActions } from 'vue-stack-tabs'
import PageScroll from '~/components/stackTabs/PageScroll.vue'

/**
 * 菜单页签的 id 是稳定值，语言切换后按 id 回写标题。
 * （页签标题是打开时的快照，不会自动跟随语言包变化。）
 */
const TAB_TITLE_KEYS: Record<string, string> = {
  home: 'nav.home',
  about: 'nav.about',
  settings: 'nav.settings',
  iframe: 'nav.iframe',
  '404-demo': 'nav.notFound',
  'permission-demo': 'nav.permissionDemo',
  'table-demo': 'nav.tableDemo',
  'element-plus-demo': 'nav.elementPlusDemo',
  'ep-field-view-demo': 'nav.epFieldViewDemo',
  'layer-demo': 'nav.layerDemo'
}

const { user } = useAuth()
const { openTab, updateTabTitle, tabs } = useTabActions()
const logoutToLogin = useLogout()
const { t, currentLocale, stackTabsLocale } = useLocale()

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
 */
const menuTabs = computed<Record<string, ITabData>>(() => ({
  home: { ...homeTab.value },
  about: { id: 'about', title: t('nav.about'), path: '/admin/about' },
  settings: { id: 'settings', title: t('nav.settings'), path: '/admin/settings' },
  iframe: {
    id: 'iframe',
    title: t('nav.iframe'),
    path: '/iframe-demo.html',
    iframe: true
  },
  '404-demo': { id: '404-demo', title: t('nav.notFound'), path: '/admin/404-demo' },
  'permission-demo': {
    id: 'permission-demo',
    title: t('nav.permissionDemo'),
    path: '/admin/permission-demo'
  },
  'table-demo': { id: 'table-demo', title: t('nav.tableDemo'), path: '/admin/table-demo' },
  'element-plus-demo': {
    id: 'element-plus-demo',
    title: t('nav.elementPlusDemo'),
    path: '/admin/element-plus-demo'
  },
  'ep-field-view-demo': {
    id: 'ep-field-view-demo',
    title: t('nav.epFieldViewDemo'),
    path: '/admin/ep-field-view-demo'
  },
  'layer-demo': {
    id: 'layer-demo',
    title: t('nav.layerDemo'),
    path: '/admin/layer-demo'
  },
  'search-demo': {
    id: 'search-demo',
    title: '查询框架',
    path: '/admin/search-demo'
  }
}))

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
    const key = TAB_TITLE_KEYS[tab.id]

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
    color: var(--fg-muted);
    // 图标在两个状态之间旋转，过渡时长与 aside 宽度一致
    transition: color var(--transition-fast);

    &:hover {
      color: var(--brand-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--brand-primary);
      outline-offset: -4px;
    }

    .stack-tab__button {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  &__aside-toggle-icon {
    width: 16px;
    height: 16px;
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
     * 背景与 auth 布局保持一致：品牌色 + 信息色的雾面柔光。
     * 令牌只作用于本布局，不进入全局 tokens。
     */
    --main-base: var(--bg-page);
    --main-glow-a: color-mix(in srgb, var(--brand-primary) 26%, transparent);
    --main-glow-b: color-mix(in srgb, var(--info) 20%, transparent);
    --main-sheen: rgb(255 255 255 / 0.72);
    --main-glow-opacity: 0.32;
    /*
     * 细网格：尺寸沿用 SPA 占位（spa-loading-templates/cog.html），
     * 但线色和线宽都再淡一档 —— 这里是大面积工作区，只能若有若无。
     */
    --main-grid: rgb(15 23 42 / 0.03);
    --main-grid-size: 36px;

    background:
      radial-gradient(circle at 15% 18%, var(--main-glow-a), transparent 45%),
      radial-gradient(circle at 85% 82%, var(--main-glow-b), transparent 45%),
      radial-gradient(120% 90% at 50% 0%, var(--main-sheen), transparent 62%), var(--main-base);

    /*
     * 网格单独一层：mask 在四周淡出，避免整块工作区变成方格纸。
     * 要单独成层就不能写进 background 简写里 —— mask 会连底色和光斑一起裁掉。
     *
     * 线用带一点模糊的细描边，不用硬边实线：1px 落在半透明底上
     * 仍然是一条清晰可见的线，blur 之后才真正是"纹理"而不是"表格"。
     */
    &::before {
      position: absolute;
      z-index: 0;
      inset: 0;
      background-image:
        linear-gradient(var(--main-grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--main-grid) 1px, transparent 1px);
      background-size: var(--main-grid-size) var(--main-grid-size);
      mask-image: radial-gradient(72% 62% at 50% 46%, rgb(0 0 0) 0%, transparent 78%);
      filter: blur(0.6px);
      pointer-events: none;
      content: '';
    }

    html.dark & {
      --main-base: var(--bg-inverse);
      --main-glow-a: color-mix(in srgb, var(--brand-primary) 32%, transparent);
      --main-glow-b: color-mix(in srgb, var(--info) 28%, transparent);
      /* 深色下不需要白光，换成顶部一层冷色氛围 */
      --main-sheen: color-mix(in srgb, var(--brand-primary) 10%, transparent);
      --main-glow-opacity: 0.5;
      --main-grid: rgb(148 163 184 / 0.05);
    }

    /*
     * 卡片底色改为半透明雾面：否则不透明的 .stack-tab 会铺满主区域，
     * 把上面的背景柔光和光斑整个盖住。
     *
     * 毛玻璃必须放在伪元素上：backdrop-filter 会让元素成为 position: fixed
     * 后代的包含块，而库的右键菜单就是 fixed + clientX/clientY，
     * 直接写在 .stack-tab 上会让菜单相对卡片定位而整体偏移。
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
      background: color-mix(in srgb, var(--bg-surface) 58%, transparent);

      &::before {
        position: absolute;
        z-index: -1;
        inset: 0;
        backdrop-filter: blur(10px);
        content: '';
        pointer-events: none;
      }

      /*
       * 卡片占满主区域，网格得再画一次：只画在主区域那层，
       * 会被卡片的半透明底色和上面的 backdrop-filter 糊成一片雾。
       * 网格另起 ::after 而不是塞进上面的 ::before，是为了让 mask
       * 只淡出网格本身，不至于把毛玻璃一起裁掉。
       */
      &::after {
        position: absolute;
        z-index: -1;
        inset: 0;
        background-image:
          linear-gradient(var(--main-grid) 1px, transparent 1px),
          linear-gradient(90deg, var(--main-grid) 1px, transparent 1px);
        background-size: var(--main-grid-size) var(--main-grid-size);
        mask-image: radial-gradient(94% 90% at 50% 42%, rgb(0 0 0) 0%, transparent 88%);
        filter: blur(0.6px);
        pointer-events: none;
        content: '';
      }
    }
  }

  // 与 auth 布局同款浮层光斑：负 z-index 保证不遮挡页签内容
  &__glow {
    position: absolute;
    z-index: -1;
    border-radius: 999px;
    filter: blur(90px);
    opacity: var(--main-glow-opacity);
    pointer-events: none;

    &--top {
      top: -120px;
      right: 8%;
      width: 320px;
      height: 320px;
      background: var(--brand-primary);
    }

    &--bottom {
      bottom: -140px;
      left: 4%;
      width: 360px;
      height: 360px;
      background: var(--info);
    }
  }
}
</style>
