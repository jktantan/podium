<script setup lang="ts">
interface AppColSize {
  span?: number
  offset?: number
  push?: number
  pull?: number
}

interface AppColProps {
  /** 自定义标签，和 el-col 一致 */
  tag?: string
  /** 栅格占位，和 el-col 一致 */
  span?: number
  /** 左侧间隔，和 el-col 一致 */
  offset?: number
  /** 向右移动，和 el-col 一致 */
  push?: number
  /** 向左移动，和 el-col 一致 */
  pull?: number
  /** 容器宽度 < 560px 时的列配置 */
  xs?: number | AppColSize
  /** 容器宽度 ≥ 560px 时的列配置 */
  sm?: number | AppColSize
  /** 容器宽度 ≥ 840px 时的列配置 */
  md?: number | AppColSize
  /** 容器宽度 ≥ 1120px 时的列配置 */
  lg?: number | AppColSize
  /** 容器宽度 ≥ 1680px 时的列配置 */
  xl?: number | AppColSize
}

const props = withDefaults(defineProps<AppColProps>(), {
  tag: 'div',
  span: 24,
  offset: 0,
  push: 0,
  pull: 0,
  xs: undefined,
  sm: undefined,
  md: undefined,
  lg: undefined,
  xl: undefined
})

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const SIZE_KEYS = ['span', 'offset', 'push', 'pull'] as const

/**
 * 把 el-col 风格的 props 展开成 CSS 变量，具体在当前容器断点下取哪一档交给样式层。
 * 未传的断点字段会回退到上一档，最终回退到 span / offset / push / pull 的默认值。
 */
const colStyle = computed<Record<string, string>>(() => {
  const vars: Record<string, string> = {
    '--app-col-base-span': String(props.span),
    '--app-col-base-offset': String(props.offset),
    '--app-col-base-push': String(props.push),
    '--app-col-base-pull': String(props.pull)
  }

  for (const breakpoint of BREAKPOINTS) {
    const value = props[breakpoint]

    if (value === undefined) {
      continue
    }

    const size: AppColSize = typeof value === 'number' ? { span: value } : value

    for (const key of SIZE_KEYS) {
      const sizeValue = size[key]

      if (sizeValue !== undefined) {
        vars[`--app-col-${breakpoint}-${key}`] = String(sizeValue)
      }
    }
  }

  return vars
})
</script>

<template>
  <el-col class="app-col" :tag="tag" :style="colStyle">
    <slot />
  </el-col>
</template>

<style scoped lang="scss">
/*
 * 容器版 el-col：传参和 el-col 一致（span / offset / push / pull / xs~xl），
 * 但响应式断点判断的是最近的 app-row 容器宽度，而不是 viewport。
 *
 * 容器断点：xs < 560 / sm ≥ 560 / md ≥ 840 / lg ≥ 1120 / xl ≥ 1680
 * 对应 24 栅格：24 / 12 / 8 / 6 / 4，即每行 1 / 2 / 3 / 4 / 6 列。
 */
.app-col {
  /*
   * 每一档只做一次「当前断点有值就用，否则继承上一档」的取值，
   * 避免在 @container 里重复写长回退链。
   */
  @each $prop in span, offset, push, pull {
    --app-col-xs-#{$prop}-value: var(--app-col-xs-#{$prop}, var(--app-col-base-#{$prop}));
    --app-col-sm-#{$prop}-value: var(--app-col-sm-#{$prop}, var(--app-col-xs-#{$prop}-value));
    --app-col-md-#{$prop}-value: var(--app-col-md-#{$prop}, var(--app-col-sm-#{$prop}-value));
    --app-col-lg-#{$prop}-value: var(--app-col-lg-#{$prop}, var(--app-col-md-#{$prop}-value));
    --app-col-xl-#{$prop}-value: var(--app-col-xl-#{$prop}, var(--app-col-lg-#{$prop}-value));

    --app-col-current-#{$prop}: var(--app-col-xs-#{$prop}-value);
  }

  position: relative;
  flex: 0 0 calc(var(--app-col-current-span) / 24 * 100%);
  max-width: calc(var(--app-col-current-span) / 24 * 100%);
  margin-left: calc(var(--app-col-current-offset) / 24 * 100%);
  left: calc(var(--app-col-current-push) / 24 * 100%);
  right: calc(var(--app-col-current-pull) / 24 * 100%);
}

@container app-row (min-width: 560px) {
  .app-col {
    @each $prop in span, offset, push, pull {
      --app-col-current-#{$prop}: var(--app-col-sm-#{$prop}-value);
    }
  }
}

@container app-row (min-width: 840px) {
  .app-col {
    @each $prop in span, offset, push, pull {
      --app-col-current-#{$prop}: var(--app-col-md-#{$prop}-value);
    }
  }
}

@container app-row (min-width: 1120px) {
  .app-col {
    @each $prop in span, offset, push, pull {
      --app-col-current-#{$prop}: var(--app-col-lg-#{$prop}-value);
    }
  }
}

@container app-row (min-width: 1680px) {
  .app-col {
    @each $prop in span, offset, push, pull {
      --app-col-current-#{$prop}: var(--app-col-xl-#{$prop}-value);
    }
  }
}
</style>
