<template>
  <div class="api-error-content">
    <p class="api-error-content__message">{{ message }}</p>

    <div class="api-error-content__actions">
      <button type="button" class="api-error-content__button" @click="handleConfirm">
        {{ confirmText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

interface ApiErrorContentProps {
  message: string
  confirmText: string
  /** 401：确认后执行完整登出并返回登录页 */
  authExpired?: boolean
}

const props = withDefaults(defineProps<ApiErrorContentProps>(), {
  authExpired: false
})

const { close } = useLayerEvent()
const logout = useLogout()

async function handleConfirm() {
  close()

  if (!props.authExpired) {
    return
  }

  try {
    await logout()
  } catch {
    // 页签上下文不可用时仍然要清掉认证状态并回到登录页
    useAuthStore().clear()
    await navigateTo('/')
  }
}
</script>

<style scoped lang="scss">
.api-error-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  gap: 18px;

  &__message {
    flex: 1;
    min-height: 0;
    margin: 0;
    overflow: auto;
    color: var(--el-text-color-primary);
    font-size: 14px;
    line-height: 1.7;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
  }

  &__button {
    padding: 8px 18px;
    border: none;
    border-radius: 4px;
    background: var(--el-color-primary);
    color: var(--el-color-white);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;

    &:hover {
      background: var(--el-color-primary-light-3);
    }

    &:focus-visible {
      outline: 2px solid var(--el-color-primary-light-5);
      outline-offset: 2px;
    }
  }
}
</style>
