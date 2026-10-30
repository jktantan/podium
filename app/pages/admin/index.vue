<template>
  <section class="page">
    <p class="page__eyebrow">Dashboard</p>
    <h1>{{ t('home.greeting', { user }) }}</h1>
    <p class="page__lead">{{ t('home.lead') }}</p>

    <div class="page-clock">
      <FlipClock />
    </div>

    <div class="page__grid">
      <button
        type="button"
        class="page-card"
        @click="openPage('/admin/about', 'about', 'home.aboutTitle')"
      >
        <span class="page-card__icon">🧩</span>
        <span class="page-card__title">{{ t('home.aboutTitle') }}</span>
        <span class="page-card__desc">{{ t('home.aboutDesc') }}</span>
      </button>

      <button
        type="button"
        class="page-card"
        @click="openPage('/admin/settings', 'settings', 'home.settingsTitle')"
      >
        <span class="page-card__icon">⚙️</span>
        <span class="page-card__title">{{ t('home.settingsTitle') }}</span>
        <span class="page-card__desc">{{ t('home.settingsDesc') }}</span>
      </button>

      <button type="button" class="page-card" @click="openIframe">
        <span class="page-card__icon">🌐</span>
        <span class="page-card__title">{{ t('home.iframeTitle') }}</span>
        <span class="page-card__desc">{{ t('home.iframeDesc') }}</span>
      </button>
    </div>

    <div class="page__actions">
      <el-button plain @click="openPage('/admin/settings', 'settings', 'home.settingsTitle')">
        {{ t('home.reopenSettings') }}
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTabActions } from 'vue-stack-tabs'

const { user } = useAuth()
const { openTab } = useTabActions()
const { t } = useI18n()

function openPage(path: string, id: string, titleKey: string) {
  void openTab({ id, title: t(titleKey), path })
}

function openIframe() {
  void openTab({
    id: 'iframe',
    title: t('home.iframeTitle'),
    path: '/iframe-demo.html',
    iframe: true
  })
}
</script>

<style scoped lang="scss">
.page-clock {
  display: flex;
  justify-content: center;
  max-width: 420px;
  margin: 24px auto;
  padding: 24px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--elevation-panel);
}

// 首页卡片：重复三次的块，按规范抽成 BEM + 令牌，而不是复制长串工具类。
.page-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  color: inherit;
  font: inherit;
  text-align: left;
  transition:
    transform var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--brand-primary) 40%, transparent);
    box-shadow:
      0 20px 25px -5px color-mix(in srgb, var(--brand-primary) 10%, transparent),
      0 8px 10px -6px color-mix(in srgb, var(--brand-primary) 10%, transparent);
  }

  &__icon {
    font-size: 24px;
    line-height: 1.2;
  }

  &__title {
    color: var(--fg-strong);
    font-size: 16px;
    font-weight: 600;
  }

  &__desc {
    color: var(--fg-muted);
    font-size: 13px;
    line-height: 1.625;
  }
}
</style>
