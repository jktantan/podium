<template>
  <el-popover placement="bottom-end" :width="280" trigger="click" popper-class="appearance-panel">
    <template #reference>
      <el-button
        class="appearance-trigger text-secondary! hover:text-primary!"
        text
        circle
        :aria-label="t('appearance.label')"
        :title="t('appearance.label')"
      >
        <el-icon :size="18"><ElIconBrush /></el-icon>
      </el-button>
    </template>

    <div class="appearance grid gap-4">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-strong">{{ t('appearance.title') }}</span>
        <el-button link class="p-0!" type="warning" @click="reset">
          {{ t('appearance.reset') }}
        </el-button>
      </div>

      <div class="appearance__field grid gap-1.75">
        <span class="text-xs text-muted">{{ t('appearance.scheme') }}</span>
        <el-segmented
          :model-value="scheme"
          :options="schemeSelectorOptions"
          block
          @update:model-value="handleSchemeChange"
        />
      </div>

      <div class="appearance__field grid gap-1.75">
        <span class="text-xs text-muted">{{ t('appearance.theme') }}</span>
        <div
          class="flex flex-wrap gap-2 p-0.5"
          role="radiogroup"
          :aria-label="t('appearance.theme')"
        >
          <button
            v-for="preset in presets"
            :key="preset.id"
            type="button"
            role="radio"
            class="appearance__swatch"
            :class="{ 'is-active': preset.id === themeId }"
            :style="{ '--swatch': preset.color }"
            :aria-checked="preset.id === themeId"
            :aria-label="t(preset.labelKey)"
            :title="t(preset.labelKey)"
            @click="setTheme(preset.id)"
          />
        </div>
      </div>

      <div class="appearance__field grid gap-1.75">
        <span class="text-xs text-muted">{{ t('appearance.density') }}</span>
        <el-segmented
          :model-value="density"
          :options="densitySelectorOptions"
          block
          @update:model-value="handleDensityChange"
        />
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import type { ColorScheme, Density } from '~/config/appearance.ts'

const {
  themeId,
  density,
  scheme,
  presets,
  densityOptions,
  schemeOptions,
  setTheme,
  setDensity,
  setScheme,
  reset
} = useAppearance()
const { t } = useI18n()

const schemeSelectorOptions = computed(() =>
  schemeOptions.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))
)

const densitySelectorOptions = computed(() =>
  densityOptions.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))
)

function handleSchemeChange(value: string | number | boolean) {
  setScheme(value as ColorScheme)
}

function handleDensityChange(value: string | number | boolean) {
  setDensity(value as Density)
}
</script>

<style scoped lang="scss">
/*
 * 色板圆点是组件里唯一的多值视觉：双环 box-shadow、hover 缩放和焦点环
 * 用工具类表达会变成一长串任意值，保留在 scoped SCSS 中。
 */
.appearance__swatch {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: var(--swatch);
  box-shadow: 0 0 0 2px var(--bg-elevated);
  outline: none;
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast);

  &:hover {
    transform: scale(1.08);
  }

  &:focus-visible {
    box-shadow:
      0 0 0 2px var(--bg-elevated),
      0 0 0 4px var(--brand-primary);
  }

  &.is-active {
    box-shadow:
      0 0 0 2px var(--bg-elevated),
      0 0 0 4px var(--swatch);
  }
}
</style>
