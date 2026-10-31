/**
 * parallax-js 未随包提供类型声明。
 *
 * 这里只声明组件实际用到的 API，避免 strict 模式下整包退化成 any。
 * 其它配置项按官方 README 需要时再补充。
 */
declare module 'parallax-js' {
  interface ParallaxOptions {
    relativeInput?: boolean
    clipRelativeInput?: boolean
    hoverOnly?: boolean
    inputElement?: HTMLElement | null
    calibrateX?: boolean
    calibrateY?: boolean
    invertX?: boolean
    invertY?: boolean
    limitX?: number
    limitY?: number
    scalarX?: number
    scalarY?: number
    frictionX?: number
    frictionY?: number
    originX?: number
    originY?: number
    precision?: number
    onReady?: () => void
  }

  export default class Parallax {
    constructor(element: HTMLElement, options?: ParallaxOptions)
    enable: () => void
    disable: () => void
    destroy: () => void
    refresh: () => void
  }
}
