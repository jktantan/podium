<template>
  <el-form class="layer-form p-1" label-position="top" @submit.prevent>
    <el-form-item :label="labels.name">
      <el-input v-model="form.name" :placeholder="labels.namePlaceholder" />
    </el-form-item>

    <el-form-item :label="labels.department">
      <el-select v-model="form.department" :placeholder="labels.departmentPlaceholder">
        <el-option
          v-for="item in labels.departments"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
    </el-form-item>

    <el-form-item :label="labels.date">
      <el-date-picker v-model="form.date" type="date" :placeholder="labels.datePlaceholder" />
    </el-form-item>

    <el-form-item :label="labels.remark">
      <el-input
        v-model="form.remark"
        type="textarea"
        :rows="2"
        :placeholder="labels.remarkPlaceholder"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { useLayerEvent } from 'vue-lite-layer'

/**
 * 弹层内容示例。
 *
 * 文案由调用方通过 labels 传入：弹层内容在独立的应用实例中渲染，
 * 不在当前页面的 i18n 上下文里，显式传文案比依赖注入更稳。
 * el-date-picker 用来验证 Element Plus 的 locale 会从调用点继承。
 */
interface LayerDemoLabels {
  name: string
  namePlaceholder: string
  department: string
  departmentPlaceholder: string
  departments: { value: string; label: string }[]
  date: string
  datePlaceholder: string
  remark: string
  remarkPlaceholder: string
}

defineProps<{ labels: LayerDemoLabels }>()

const { onOk, onCancel, resolveOk, close } = useLayerEvent()

const form = reactive({
  name: '',
  department: 'product',
  date: null as Date | null,
  remark: ''
})

onOk(() => {
  resolveOk({ ...form })
  close()
})

onCancel(() => {
  close()
})
</script>
