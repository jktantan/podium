<template>
  <slot v-if="allowed" />
  <slot v-else name="forbidden">
    <AppErrorState :status-code="403" />
  </slot>
</template>

<script setup lang="ts">
import type { PermissionMode } from '~/composables/useAuth.ts'

const props = withDefaults(
  defineProps<{
    /**
     * 需要的权限，支持单个或多个。
     * 例如：permission="settings:view" 或 :permission="['a', 'b']"
     */
    permission?: string | string[]
    /** 多个权限时的匹配方式，默认全部满足 */
    mode?: PermissionMode
  }>(),
  {
    permission: undefined,
    mode: 'all'
  }
)

const { can } = useAuth()

const allowed = computed(() => {
  if (!props.permission) {
    return true
  }

  if (Array.isArray(props.permission) && props.permission.length === 0) {
    return true
  }

  return can(props.permission, props.mode)
})
</script>
