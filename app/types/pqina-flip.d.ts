/**
 * @pqina/flip 未随包提供类型声明。
 *
 * 这里只声明组件实际用到的 API，避免 strict 模式下整包退化成 any。
 * 需要其它能力时按官方文档在此补充，不要在业务代码里用 as 绕过。
 */
declare module '@pqina/flip' {
  /** flip 的 value 是按模板 data-key 取值的扁平对象 */
  type TickValue = Record<string, unknown>

  interface TickInstance {
    value: TickValue
    destroy: () => void
  }

  interface TickInterval {
    stop: () => void
    pause: () => void
    resume: () => void
    reset: () => void
  }

  interface TickCreateOptions {
    value?: TickValue
    credits?: string | null
    [key: string]: unknown
  }

  const Tick: {
    DOM: {
      /** 元素上已有实例时返回 undefined，调用方需要判空 */
      create: (element: HTMLElement, options?: TickCreateOptions) => TickInstance | undefined
      destroy: (element: HTMLElement) => boolean
      parse: (context: ParentNode) => TickInstance[]
      find: (element: Element) => TickInstance | null
    }
    helper: {
      interval: (
        callback: (runtime: number) => void,
        interval?: number,
        options?: { autostart?: boolean }
      ) => TickInterval
      date: (iso?: string) => Date
    }
    supported: boolean
  }

  export default Tick
  export type { TickCreateOptions, TickInstance, TickInterval, TickValue }
}
