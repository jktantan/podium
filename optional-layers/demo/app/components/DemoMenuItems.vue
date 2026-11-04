<template>
  <!--
    Demo 菜单统一收在「示例」子菜单下。
    el-menu 的 index 与页签 id 一致（见 app/app.config.ts 的 tabs），
    activeMenu 仍由宿主布局驱动；index 统一带 demo- 前缀，避免和项目侧
    通过 API 下发的菜单 index 冲突。
  -->
  <el-sub-menu index="demo">
    <template #title>
      <el-icon><ElIconCollection /></el-icon>
      <span>{{ t('nav.demo') }}</span>
    </template>

    <el-menu-item index="demo-about">
      <el-icon><ElIconInfoFilled /></el-icon>
      <template #title>
        <span>{{ t('nav.about') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-404">
      <el-icon><ElIconWarningFilled /></el-icon>
      <template #title>
        <span>{{ t('nav.notFound') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-permission">
      <el-icon><ElIconLock /></el-icon>
      <template #title>
        <span>{{ t('nav.permissionDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-table">
      <el-icon><ElIconGrid /></el-icon>
      <template #title>
        <span>{{ t('nav.tableDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-element-plus">
      <el-icon><ElIconMouse /></el-icon>
      <template #title>
        <span>{{ t('nav.elementPlusDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-ep-field-view">
      <el-icon><ElIconDocument /></el-icon>
      <template #title>
        <span>{{ t('nav.epFieldViewDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-giant-tree">
      <el-icon><ElIconShare /></el-icon>
      <template #title>
        <span>{{ t('nav.giantTreeDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-flow-upload">
      <el-icon><ElIconUpload /></el-icon>
      <template #title>
        <span>{{ t('nav.flowUploadDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-layer">
      <el-icon><ElIconCopyDocument /></el-icon>
      <template #title>
        <span>{{ t('nav.layerDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-search">
      <el-icon><ElIconSearch /></el-icon>
      <template #title>
        <span>{{ t('nav.searchDemo') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-settings">
      <el-icon><ElIconSetting /></el-icon>
      <template #title>
        <span>{{ t('nav.settings') }}</span>
      </template>
    </el-menu-item>

    <el-menu-item index="demo-iframe">
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

      <el-menu-item index="demo-error-401">
        <span>{{ t('nav.error401') }}</span>
      </el-menu-item>
      <el-menu-item index="demo-error-403">
        <span>{{ t('nav.error403') }}</span>
      </el-menu-item>
      <el-menu-item index="demo-error-404">
        <span>{{ t('nav.error404') }}</span>
      </el-menu-item>
      <el-menu-item index="demo-error-500">
        <span>{{ t('nav.error500') }}</span>
      </el-menu-item>
    </el-sub-menu>
  </el-sub-menu>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
