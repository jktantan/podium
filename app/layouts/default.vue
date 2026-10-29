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
      <el-aside class="app-layout__aside" width="192px">
        <!-- 菜单滚动交给 OverlayScrollbars，避免 el-aside 原生滚动条与外层滚动条叠加 -->
        <AppScrollbar class="app-layout__aside-scroll">
          <el-menu class="app-layout__menu" :default-active="activeMenu" @select="handleMenuSelect">
            <el-menu-item index="/admin">
              <el-icon><ElIconHomeFilled /></el-icon>
              <span>{{ t('nav.home') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/about">
              <el-icon><ElIconInfoFilled /></el-icon>
              <span>{{ t('nav.about') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/settings">
              <el-icon><ElIconSetting /></el-icon>
              <span>{{ t('nav.settings') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/iframe">
              <el-icon><ElIconMonitor /></el-icon>
              <span>{{ t('nav.iframe') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/404-demo">
              <el-icon><ElIconWarningFilled /></el-icon>
              <span>{{ t('nav.notFound') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/permission-demo">
              <el-icon><ElIconLock /></el-icon>
              <span>{{ t('nav.permissionDemo') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/table-demo">
              <el-icon><ElIconGrid /></el-icon>
              <span>{{ t('nav.tableDemo') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/element-plus-demo">
              <el-icon><ElIconMouse /></el-icon>
              <span>{{ t('nav.elementPlusDemo') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/layer-demo">
              <el-icon><ElIconCopyDocument /></el-icon>
              <span>{{ t('nav.layerDemo') }}</span>
            </el-menu-item>
            <el-menu-item index="/admin/search-demo">
              <el-icon><ElIconCopyDocument /></el-icon>
              <span>查询柜架</span>
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
          />

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
  'layer-demo': 'nav.layerDemo'
}

const route = useRoute()
const { user } = useAuth()
const { openTab, updateTabTitle, tabs } = useTabActions()
const logoutToLogin = useLogout()
const { t, currentLocale, stackTabsLocale } = useLocale()

const activeMenu = computed(() => route.path)

const homeTab = computed<ITabData>(() => ({
  // 固定 id，避免刷新时 sessionStorage 恢复的首页与默认首页生成两个页签
  id: 'home',
  title: t('nav.home'),
  path: '/admin',
  closable: false,
  refreshable: true
}))

const menuTabs = computed<Record<string, ITabData>>(() => ({
  '/admin': { ...homeTab.value },
  '/admin/about': { id: 'about', title: t('nav.about'), path: '/admin/about' },
  '/admin/settings': { id: 'settings', title: t('nav.settings'), path: '/admin/settings' },
  '/admin/iframe': {
    id: 'iframe',
    title: t('nav.iframe'),
    path: '/iframe-demo.html',
    iframe: true
  },
  '/admin/404-demo': { id: '404-demo', title: t('nav.notFound'), path: '/admin/404-demo' },
  '/admin/permission-demo': {
    id: 'permission-demo',
    title: t('nav.permissionDemo'),
    path: '/admin/permission-demo'
  },
  '/admin/table-demo': { id: 'table-demo', title: t('nav.tableDemo'), path: '/admin/table-demo' },
  '/admin/element-plus-demo': {
    id: 'element-plus-demo',
    title: t('nav.elementPlusDemo'),
    path: '/admin/element-plus-demo'
  },
  '/admin/layer-demo': {
    id: 'layer-demo',
    title: t('nav.layerDemo'),
    path: '/admin/layer-demo'
  },
  '/admin/search-demo': {
    id: 'search-demo',
    title: '查询框架',
    path: '/admin/search-demo'
  }
}))

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
  }

  &__aside-scroll {
    // OverlayScrollbars 的宿主不会像 el-scrollbar 那样自带 height: 100%
    height: 100%;
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

    background:
      radial-gradient(circle at 15% 18%, var(--main-glow-a), transparent 45%),
      radial-gradient(circle at 85% 82%, var(--main-glow-b), transparent 45%),
      radial-gradient(120% 90% at 50% 0%, var(--main-sheen), transparent 62%), var(--main-base);

    html.dark & {
      --main-base: var(--bg-inverse);
      --main-glow-a: color-mix(in srgb, var(--brand-primary) 32%, transparent);
      --main-glow-b: color-mix(in srgb, var(--info) 28%, transparent);
      /* 深色下不需要白光，换成顶部一层冷色氛围 */
      --main-sheen: color-mix(in srgb, var(--brand-primary) 10%, transparent);
      --main-glow-opacity: 0.5;
    }

    /*
     * 卡片底色改为半透明雾面：否则不透明的 .stack-tab 会铺满主区域，
     * 把上面的背景柔光和光斑整个盖住。
     *
     * 毛玻璃必须放在伪元素上：backdrop-filter 会让元素成为 position: fixed
     * 后代的包含块，而库的右键菜单就是 fixed + clientX/clientY，
     * 直接写在 .stack-tab 上会让菜单相对卡片定位而整体偏移。
     */
    :deep(.stack-tab) {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      border: 1px solid color-mix(in srgb, var(--border-default) 72%, transparent);
      border-radius: var(--radius-md);
      box-shadow: var(--el-box-shadow-lighter);
      background: color-mix(in srgb, var(--bg-surface) 58%, transparent);

      &::before {
        position: absolute;
        z-index: -1;
        inset: 0;
        backdrop-filter: blur(10px);
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
