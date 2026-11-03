<template>
  <div class="auth-layout">
    <AppAmbientBackdrop class="auth-layout__ambient" />

    <div class="auth-layout__toolbar">
      <LanguageSwitcher />
      <AppearanceSwitcher />
    </div>

    <main class="auth-layout__content">
      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '../assets/scss/mixins' as *;

.auth-layout {
  position: relative;
  display: grid;
  min-height: 100vh;
  padding: 32px 16px;
  overflow: hidden;
  place-items: center;
  background: var(--ambient-base);

  /* 动态背景铺满整屏，压在卡片与工具栏之下 */
  &__ambient {
    z-index: 0;
  }

  /* 与工作区同款六边形纹理：叠在动态背景之上、卡片之下 */
  &::before {
    position: absolute;
    z-index: 1;
    inset: 0;

    @include ambient-mesh;

    pointer-events: none;
    content: '';
  }

  &__toolbar {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__content {
    position: relative;
    z-index: 2;
    width: min(420px, 100%);
  }
}
</style>
