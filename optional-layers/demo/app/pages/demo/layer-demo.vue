<template>
  <section class="page">
    <p class="page__eyebrow">Layer</p>
    <h1>{{ t('layerDemo.title') }}</h1>
    <p class="page__lead">{{ t('layerDemo.lead') }}</p>

    <div class="layer-demo__actions">
      <el-button type="primary" @click="openBasic">{{ t('layerDemo.openBasic') }}</el-button>
      <el-button @click="openForm">{{ t('layerDemo.openForm') }}</el-button>
      <el-button plain @click="openConfirm">{{ t('layerDemo.openConfirm') }}</el-button>
    </div>

    <el-alert class="mt-6" type="info" :closable="false" show-icon :title="t('layerDemo.tip')" />
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import LayerConfirmContent from '../../components/demo/LayerConfirmContent.vue'
import LayerDemoContent from '../../components/demo/LayerDemoContent.vue'

const { t } = useI18n()
const { open } = useLayer()

const formLabels = computed(() => ({
  name: t('layerDemo.form.name'),
  namePlaceholder: t('layerDemo.form.namePlaceholder'),
  department: t('layerDemo.form.department'),
  departmentPlaceholder: t('layerDemo.form.departmentPlaceholder'),
  departments: [
    { value: 'product', label: t('layerDemo.form.departments.product') },
    { value: 'engineering', label: t('layerDemo.form.departments.engineering') },
    { value: 'design', label: t('layerDemo.form.departments.design') }
  ],
  date: t('layerDemo.form.date'),
  datePlaceholder: t('layerDemo.form.datePlaceholder'),
  remark: t('layerDemo.form.remark'),
  remarkPlaceholder: t('layerDemo.form.remarkPlaceholder')
}))

function openBasic() {
  open({
    title: t('layerDemo.basic.title'),
    textContent: t('layerDemo.basic.content'),
    size: { width: '420px', height: '220px' },
    // 纯文本内容没有组件处理 Footer 事件，隐藏默认按钮，靠标题栏 / 遮罩 / Esc 关闭
    footer: false
  })
}

function openForm() {
  open({
    title: t('layerDemo.form.title'),
    content: LayerDemoContent,
    props: { labels: formLabels.value },
    size: { width: '480px', height: '440px' },
    onOk: () => {
      ElMessage.success(t('layerDemo.form.saved'))
    }
  })
}

function openConfirm() {
  open({
    title: t('layerDemo.confirm.title'),
    content: LayerConfirmContent,
    footer: false,
    props: {
      message: t('layerDemo.confirm.content'),
      okText: t('layerDemo.confirm.ok'),
      cancelText: t('layerDemo.confirm.cancel')
    },
    size: { width: '380px', height: '200px' },
    onOk: () => {
      ElMessage.success(t('layerDemo.confirm.done'))
    }
  })
}

useHead({
  title: computed(() => `${t('layerDemo.title')} | Podium`)
})
</script>

<style scoped lang="scss">
.layer-demo {
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 20px;
  }
}
</style>
