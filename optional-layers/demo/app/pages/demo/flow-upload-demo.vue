<template>
  <section class="page flow-upload-demo">
    <p class="page__eyebrow">vue-flow-upload</p>
    <h1>{{ t('flowUploadDemo.title') }}</h1>
    <p class="page__lead">{{ t('flowUploadDemo.lead') }}</p>

    <el-alert
      class="mt-6"
      type="info"
      :closable="false"
      show-icon
      :title="t('flowUploadDemo.tip')"
    />

    <div class="flow-upload-demo__layout">
      <section class="flow-upload-demo__panel">
        <div class="flow-upload-demo__header">
          <div>
            <h2 class="flow-upload-demo__title">{{ t('flowUploadDemo.fileTitle') }}</h2>
            <p class="flow-upload-demo__hint">{{ t('flowUploadDemo.fileHint') }}</p>
          </div>

          <div class="flow-upload-demo__actions">
            <el-radio-group v-model="listType" size="small">
              <el-radio-button value="list">
                {{ t('flowUploadDemo.listTypes.list') }}
              </el-radio-button>
              <el-radio-button value="picture">
                {{ t('flowUploadDemo.listTypes.picture') }}
              </el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="addSample">{{
              t('flowUploadDemo.addSample')
            }}</el-button>
            <el-button size="small" plain @click="clearFiles">
              {{ t('flowUploadDemo.clear') }}
            </el-button>
          </div>
        </div>

        <FlowUpload
          ref="uploadRef"
          v-model="files"
          belong-id="demo-order-1"
          :transport="transport"
          :i18n="flowUploadI18n"
          :list-type="listType"
          accept="image/*,.pdf,.txt,.md"
          :max-size="20 * 1024 * 1024"
          :max-count="8"
          height="380px"
          drag
        >
          <template #tip>{{ t('flowUploadDemo.uploadTip') }}</template>
        </FlowUpload>
      </section>

      <section class="flow-upload-demo__panel flow-upload-demo__panel--avatar">
        <h2 class="flow-upload-demo__title">{{ t('flowUploadDemo.avatarTitle') }}</h2>
        <p class="flow-upload-demo__hint">{{ t('flowUploadDemo.avatarHint') }}</p>

        <AvatarUpload
          v-model="avatar"
          belong-id="demo-profile-1"
          :transport="transport"
          :i18n="flowUploadI18n"
          accept="image/*"
          :max-size="5 * 1024 * 1024"
          :width="180"
          :height="180"
          shape="circle"
        />
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { FlowUpload, UploadFileItem, UploadListType } from 'vue-flow-upload'
import { useDemoUploadTransport } from '../../composables/useDemoUploadTransport'

/** 示例图片：点击按钮即可走完整的校验、上传、进度与预览流程 */
const SAMPLE_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">',
  '<rect width="320" height="320" rx="72" fill="#409eff"/>',
  '<path d="M96 224V96h48v80h80v48z" fill="#fff"/>',
  '</svg>'
].join('')

const { t } = useI18n()
const { flowUploadI18n } = useLocale()
// demo 专用：内存 transport，不请求后端
const transport = useDemoUploadTransport()

const uploadRef = ref<InstanceType<typeof FlowUpload> | null>(null)
const files = ref<UploadFileItem[]>([])
const avatar = ref<UploadFileItem[]>([])
const listType = ref<UploadListType>('list')

function addSample() {
  const file = new File([SAMPLE_SVG], `podium-sample-${Date.now()}.svg`, {
    type: 'image/svg+xml'
  })
  void uploadRef.value?.handleStart(file)
}

function clearFiles() {
  uploadRef.value?.clear()
}

useHead({
  title: computed(() => `${t('flowUploadDemo.title')} | Podium`)
})
</script>

<style scoped lang="scss">
.flow-upload-demo {
  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 24px;
    margin-top: 24px;
  }

  &__panel {
    min-width: 0;
  }

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__title {
    margin: 0;
    color: var(--fg-strong);
    font-size: 15px;
    font-weight: 600;
  }

  &__hint {
    margin: 6px 0 0;
    color: var(--fg-muted);
    font-size: 13px;
    line-height: 1.7;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__panel--avatar {
    .flow-upload-demo__hint {
      margin-bottom: 16px;
    }
  }
}

@media (width <= 1023.98px) {
  .flow-upload-demo__layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
