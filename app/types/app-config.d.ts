export {}

/**
 * 可选层通过 appConfig 向宿主提供的扩展信息。
 *
 * 声明放在宿主而不是层里：层可以不加载，但宿主的类型检查始终需要知道
 * 这些字段的形状。字段全部可选，层未加载时读取结果为 undefined。
 */
declare module 'nuxt/schema' {
  interface AppConfig {
    podium?: {
      mock?: {
        /** 登录页是否展示演示账号提示 */
        demoAccounts?: boolean
        /** 登录页表单的默认账号（仅 mock 层提供） */
        defaultAccount?: {
          username: string
          password: string
        }
      }
      sidebar?: {
        demo?: {
          /** demo 菜单组件名，由 demo 层的 components 自动注册 */
          menuComponent: string
          /** 菜单 index（同时是页签 id）→ 标题键 / 路径 */
          tabs: Record<
            string,
            {
              titleKey: string
              path: string
              /** 静态资源页面（iframe 页签），路径需要补 app.baseURL */
              iframe?: boolean
            }
          >
        }
      }
    }
  }
}
