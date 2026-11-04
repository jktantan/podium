/**
 * demo 层向宿主提供的扩展点。
 *
 * 宿主布局只读取这些数据，不 import demo 层的任何模块：
 * - menuComponent：菜单组件名，由 demo 层的 components 目录自动注册；
 * - tabs：菜单 index（同时是页签 id）→ 标题键 / 路径。
 *
 * 本层不加载时，appConfig 里没有 podium.sidebar.demo，宿主不会渲染 demo 菜单，
 * 页签表里也不会出现 demo 条目。
 */
export default defineAppConfig({
  podium: {
    sidebar: {
      demo: {
        menuComponent: 'DemoMenuItems',
        tabs: {
          'demo-about': { titleKey: 'nav.about', path: '/demo/about' },
          'demo-404': { titleKey: 'nav.notFound', path: '/demo/404-demo' },
          'demo-permission': { titleKey: 'nav.permissionDemo', path: '/demo/permission-demo' },
          'demo-table': { titleKey: 'nav.tableDemo', path: '/demo/table-demo' },
          'demo-element-plus': {
            titleKey: 'nav.elementPlusDemo',
            path: '/demo/element-plus-demo'
          },
          'demo-ep-field-view': {
            titleKey: 'nav.epFieldViewDemo',
            path: '/demo/ep-field-view-demo'
          },
          'demo-giant-tree': {
            titleKey: 'nav.giantTreeDemo',
            path: '/demo/giant-tree-demo'
          },
          'demo-flow-upload': {
            titleKey: 'nav.flowUploadDemo',
            path: '/demo/flow-upload-demo'
          },
          'demo-layer': { titleKey: 'nav.layerDemo', path: '/demo/layer-demo' },
          'demo-search': { titleKey: 'nav.searchDemo', path: '/demo/search-demo' },
          'demo-settings': { titleKey: 'nav.settings', path: '/demo/settings' },
          'demo-iframe': {
            titleKey: 'nav.iframe',
            path: '/demo-assets/iframe-demo.html',
            iframe: true
          },
          'demo-error-401': { titleKey: 'nav.error401', path: '/demo/error-pages/401' },
          'demo-error-403': { titleKey: 'nav.error403', path: '/demo/error-pages/403' },
          'demo-error-404': { titleKey: 'nav.error404', path: '/demo/error-pages/404' },
          'demo-error-500': { titleKey: 'nav.error500', path: '/demo/error-pages/500' }
        }
      }
    }
  }
})
