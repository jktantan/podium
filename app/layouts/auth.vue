<template>
  <div class="auth-layout">
    <div class="auth-layout__glow auth-layout__glow--top" aria-hidden="true"></div>
    <div class="auth-layout__glow auth-layout__glow--bottom" aria-hidden="true"></div>

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
.auth-layout {
  position: relative;
  display: grid;
  min-height: 100vh;
  padding: 32px 16px;
  overflow: hidden;
  place-items: center;

  /*
   * 登录页专用背景令牌：只作用于本布局，不进入全局 tokens。
   * 浅色是"明亮雾面"，深色是"深空发光"，光晕都跟随品牌色与信息色。
   */
  --auth-base: var(--bg-page);
  --auth-glow-a: color-mix(in srgb, var(--brand-primary) 26%, transparent);
  --auth-glow-b: color-mix(in srgb, var(--info) 20%, transparent);
  --auth-sheen: rgb(255 255 255 / 0.72);
  --auth-glow-opacity: 0.32;

  background:
    radial-gradient(circle at 15% 18%, var(--auth-glow-a), transparent 45%),
    radial-gradient(circle at 85% 82%, var(--auth-glow-b), transparent 45%),
    radial-gradient(120% 90% at 50% 0%, var(--auth-sheen), transparent 62%), var(--auth-base);

  html.dark & {
    --auth-base: var(--bg-inverse);
    --auth-glow-a: color-mix(in srgb, var(--brand-primary) 32%, transparent);
    --auth-glow-b: color-mix(in srgb, var(--info) 28%, transparent);
    /* 深色下不需要白光，换成顶部一层冷色氛围 */
    --auth-sheen: color-mix(in srgb, var(--brand-primary) 10%, transparent);
    --auth-glow-opacity: 0.5;
  }

  &__glow {
    position: absolute;
    border-radius: 999px;
    filter: blur(90px);
    opacity: var(--auth-glow-opacity);
    pointer-events: none;

    &--top {
      top: -120px;
      right: 8%;
      width: 320px;
      height: 320px;
      background: var(--brand-primary);
    }

    &--bottom {
      bottom: -140px;
      left: 4%;
      width: 360px;
      height: 360px;
      background: var(--info);
    }
  }

  &__toolbar {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__content {
    position: relative;
    z-index: 1;
    width: min(420px, 100%);
  }
}
</style>
