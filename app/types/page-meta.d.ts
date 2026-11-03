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

    /**
     * 路由守卫的放行标记。
     *
     * demo 层通过 pages:extend 给自己的页面批量设置，宿主守卫只读这个
     * meta，不认识 /demo 前缀；层不加载时页面也不存在。
     */
    podium?: {
      allow?: boolean
    }
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    noPageScroll?: boolean
    podium?: {
      allow?: boolean
    }
  }
}
