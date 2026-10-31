<template>
  <!--
    Demo 菜单统一收在「示例」子菜单下。
    el-menu 的 index 与页签 id 一致（见 app/demo/index.ts），activeMenu 仍由布局驱动。
  -->
  <el-sub-menu index="demo">
    <template #title>
      <el-icon><ElIconCollection /></el-icon>
      <span>{{ t('nav.demo') }}</span>
    </template>

    <el-menu-item index="about">
      <el-icon><ElIconInfoFilled /></el-icon>
      <template #title>
        <span>{{ t('nav.about') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="404-demo">
      <el-icon><ElIconWarningFilled /></el-icon>
      <template #title>
        <span>{{ t('nav.notFound') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="permission-demo">
      <el-icon><ElIconLock /></el-icon>
      <template #title>
        <span>{{ t('nav.permissionDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="table-demo">
      <el-icon><ElIconGrid /></el-icon>
      <template #title>
        <span>{{ t('nav.tableDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="element-plus-demo">
      <el-icon><ElIconMouse /></el-icon>
      <template #title>
        <span>{{ t('nav.elementPlusDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="ep-field-view-demo">
      <el-icon><ElIconDocument /></el-icon>
      <template #title>
        <span>{{ t('nav.epFieldViewDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="layer-demo">
      <el-icon><ElIconCopyDocument /></el-icon>
      <template #title>
        <span>{{ t('nav.layerDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="search-demo">
      <el-icon><ElIconSearch /></el-icon>
      <template #title>
        <span>{{ t('nav.searchDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="settings">
      <el-icon><ElIconSetting /></el-icon>
      <template #title>
        <span>{{ t('nav.settings') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="iframe">
      <el-icon><ElIconMonitor /></el-icon>
      <template #title>
        <span>{{ t('nav.iframe') }}</span>
      </template>
    </el-menu-item>

    <el-sub-menu index="demo-error-pages">
      <template #title>
        <el-icon><ElIconWarningFilled /></el-icon>
        <span>{{ t('nav.errorPages') }}</span>
      </template>

      <el-menu-item index="error-401">
        <span>{{ t('nav.error401') }}</span>
      </el-menu-item>
      <el-menu-item index="error-403">
        <span>{{ t('nav.error403') }}</span>
      </el-menu-item>
      <el-menu-item index="error-404">
        <span>{{ t('nav.error404') }}</span>
      </el-menu-item>
      <el-menu-item index="error-500">
        <span>{{ t('nav.error500') }}</span>
      </el-menu-item>
    </el-sub-menu>
  </el-sub-menu>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
