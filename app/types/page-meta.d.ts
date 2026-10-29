export {}

declare module '#app' {
  interface PageMeta {
    /**
     * 关闭 PageScroll 包裹。
     *
     * 页面自带滚动容器或整页固定布局时设为 true：
     * PageScroll 不再渲染 el-scrollbar，页面内容直接进入缓存页 wrapper。
     */
    noPageScroll?: boolean
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    noPageScroll?: boolean
  }
}
