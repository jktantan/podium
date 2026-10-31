<template>
  <section class="page">
    <p class="page__eyebrow">Dashboard</p>
    <h1>{{ t('home.greeting', { user }) }}</h1>
    <p class="page__lead">{{ t('home.lead') }}</p>

    <div class="page-clock">
      <FlipClock />
    </div>

    <div class="page__grid">
      <!-- Demo 入口卡片：生产构建时 demoCards 为空，不渲染 -->
      <button
        v-for="card in demoCards"
        :key="card.id"
        type="button"
        class="page-card"
        @click="openDemoCard(card)"
      >
        <span class="page-card__icon">{{ card.icon }}</span>
        <span class="page-card__title">{{ card.title }}</span>
        <span class="page-card__desc">{{ card.desc }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useTabActions } from 'vue-stack-tabs'
import { createDemoHomeCards } from '#podium-demo'
import type { DemoHomeCard } from '#podium-demo'

const { user } = useAuth()
const { openTab } = useTabActions()
const { t } = useI18n()

/** Demo 首页入口；生产构建时由 '#podium-demo' 的空实现返回 [] */
const demoCards = computed(() => createDemoHomeCards((key) => t(key)))

function openDemoCard(card: DemoHomeCard) {
  void openTab({ id: card.id, title: card.title, path: card.path, iframe: card.iframe })
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
