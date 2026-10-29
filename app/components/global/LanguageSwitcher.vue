<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <el-button
      class="locale-trigger text-secondary! hover:text-primary!"
      text
      circle
      :aria-label="t('locale.label')"
      :title="`${t('locale.label')} · ${currentOption.label}`"
    >
      <span class="text-xs leading-none font-semibold tracking-[0.02em]">
        {{ currentOption.shortLabel }}
      </span>
    </el-button>

    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="option in localeOptions"
          :key="option.value"
          :command="option.value"
        >
          <span class="locale-option inline-flex items-center gap-1.5">
            <span
              class="locale-option__check w-3 text-xs leading-none text-primary"
              aria-hidden="true"
            >
              {{ option.value === currentLocale ? '✓' : '' }}
            </span>
            {{ option.label }}
          </span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import type { AppLocale } from '~~/i18n/config.ts'
import { isAppLocale } from '~~/i18n/config.ts'

const { currentLocale, currentOption, localeOptions, changeLocale, t } = useLocale()

function handleCommand(command: string | number | object) {
  if (typeof command === 'string' && isAppLocale(command)) {
    void changeLocale(command as AppLocale)
  }
}
</script>
