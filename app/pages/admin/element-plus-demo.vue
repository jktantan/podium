<template>
  <section class="page">
    <p class="page__eyebrow">Element Plus</p>
    <h1>{{ t('elementPlusDemo.title') }}</h1>
    <p class="page__lead">{{ t('elementPlusDemo.lead') }}</p>

    <div class="theme-switch">
      <span class="theme-switch__label">{{ t('elementPlusDemo.themeLabel') }}</span>
      <el-segmented v-model="theme" :options="themeOptions" />
    </div>

    <div
      class="ep-demo"
      :class="{ 'ep-demo--native': theme === 'native', 'ep-demo--dark': scheme === 'dark' }"
    >
      <section class="ep-demo__section">
        <h2>{{ t('elementPlusDemo.sections.form') }}</h2>
        <el-form label-position="top">
          <el-form-item :label="t('elementPlusDemo.inputLabel')">
            <el-input
              v-model="form.text"
              clearable
              :placeholder="t('elementPlusDemo.inputPlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="t('elementPlusDemo.numberLabel')">
            <el-input-number v-model="form.number" :min="0" :max="100" />
          </el-form-item>

          <el-form-item :label="t('elementPlusDemo.selectLabel')">
            <el-select
              v-model="form.option"
              clearable
              :placeholder="t('elementPlusDemo.selectPlaceholder')"
            >
              <el-option :label="t('elementPlusDemo.optionA')" value="a" />
              <el-option :label="t('elementPlusDemo.optionB')" value="b" />
            </el-select>
          </el-form-item>

          <el-form-item :label="t('elementPlusDemo.dateLabel')">
            <el-date-picker
              v-model="form.date"
              type="date"
              :placeholder="t('elementPlusDemo.datePlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="t('elementPlusDemo.datetimeLabel')">
            <el-date-picker
              v-model="form.datetime"
              type="datetime"
              :placeholder="t('elementPlusDemo.datetimePlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="t('elementPlusDemo.timeLabel')">
            <el-time-picker
              v-model="form.time"
              :placeholder="t('elementPlusDemo.timePlaceholder')"
            />
          </el-form-item>

          <el-form-item :label="t('elementPlusDemo.switchLabel')">
            <el-switch v-model="form.enabled" />
          </el-form-item>

          <el-form-item :label="t('elementPlusDemo.sliderLabel')">
            <el-slider v-model="form.slider" />
          </el-form-item>

          <el-form-item :label="t('elementPlusDemo.radioLabel')">
            <el-radio-group v-model="form.radio">
              <el-radio value="a">{{ t('elementPlusDemo.optionA') }}</el-radio>
              <el-radio value="b">{{ t('elementPlusDemo.optionB') }}</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item :label="t('elementPlusDemo.checkboxLabel')">
            <el-checkbox-group v-model="form.checks">
              <el-checkbox value="a">{{ t('elementPlusDemo.optionA') }}</el-checkbox>
              <el-checkbox value="b">{{ t('elementPlusDemo.optionB') }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </section>

      <section class="ep-demo__section">
        <h2>{{ t('elementPlusDemo.sections.buttons') }}</h2>
        <div class="ep-demo__row">
          <el-button type="primary">{{ t('elementPlusDemo.buttonPrimary') }}</el-button>
          <el-button>{{ t('elementPlusDemo.buttonDefault') }}</el-button>
          <el-button type="success">{{ t('elementPlusDemo.buttonSuccess') }}</el-button>
          <el-button type="warning">{{ t('elementPlusDemo.buttonWarning') }}</el-button>
          <el-button type="danger">{{ t('elementPlusDemo.buttonDanger') }}</el-button>
          <el-button type="info">{{ t('elementPlusDemo.buttonInfo') }}</el-button>
          <el-button plain>{{ t('elementPlusDemo.buttonPlain') }}</el-button>
          <el-button text>{{ t('elementPlusDemo.buttonText') }}</el-button>
        </div>
      </section>

      <section class="ep-demo__section">
        <h2>{{ t('elementPlusDemo.sections.data') }}</h2>
        <div class="ep-demo__row">
          <el-tag>Tag</el-tag>
          <el-tag type="success">Success</el-tag>
          <el-tag type="warning">Warning</el-tag>
          <el-tag type="danger">Danger</el-tag>
          <el-tag type="info">Info</el-tag>
        </div>

        <el-table :data="tableRows" border>
          <el-table-column prop="name" :label="t('elementPlusDemo.tableName')" />
          <el-table-column prop="role" :label="t('elementPlusDemo.tableRole')" />
        </el-table>
      </section>

      <section class="ep-demo__section">
        <h2>{{ t('elementPlusDemo.sections.navigation') }}</h2>
        <el-tabs v-model="activeTab">
          <el-tab-pane :label="t('elementPlusDemo.tabsFirst')" name="first">
            {{ t('elementPlusDemo.tabsFirst') }}
          </el-tab-pane>
          <el-tab-pane :label="t('elementPlusDemo.tabsSecond')" name="second">
            {{ t('elementPlusDemo.tabsSecond') }}
          </el-tab-pane>
        </el-tabs>

        <el-pagination :total="50" layout="total, prev, pager, next" />
      </section>

      <section class="ep-demo__section">
        <h2>{{ t('elementPlusDemo.sections.feedback') }}</h2>
        <div class="ep-demo__row">
          <el-button @click="dialogVisible = true">
            {{ t('elementPlusDemo.dialogOpen') }}
          </el-button>
          <el-button @click="showMessage">{{ t('elementPlusDemo.messageShow') }}</el-button>
          <el-button @click="showNotification">
            {{ t('elementPlusDemo.notificationShow') }}
          </el-button>
          <el-button @click="showLoading">{{ t('elementPlusDemo.loadingShow') }}</el-button>
        </div>

        <el-alert
          :title="t('elementPlusDemo.alertTitle')"
          :description="t('elementPlusDemo.alertDescription')"
          type="info"
          show-icon
          :closable="false"
        />

        <el-empty />
      </section>

      <el-dialog v-model="dialogVisible" :title="t('elementPlusDemo.dialogTitle')" width="420px">
        {{ t('elementPlusDemo.dialogContent') }}
      </el-dialog>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElLoading, ElMessage, ElNotification } from 'element-plus'

const { t } = useLocale()
const { scheme } = useAppearance()

const theme = ref<'project' | 'native'>('project')
const themeOptions = computed(() => [
  { label: t('elementPlusDemo.themeProject'), value: 'project' },
  { label: t('elementPlusDemo.themeNative'), value: 'native' }
])

const activeTab = ref('first')
const dialogVisible = ref(false)

const form = reactive({
  text: '',
  number: 1,
  option: '',
  date: null as Date | null,
  datetime: null as Date | null,
  time: null as Date | null,
  enabled: true,
  slider: 40,
  radio: 'a',
  checks: ['a'] as string[]
})

const tableRows = computed(() => [
  { name: t('elementPlusDemo.tableAlice'), role: t('elementPlusDemo.tableRoleAdmin') },
  { name: t('elementPlusDemo.tableBob'), role: t('elementPlusDemo.tableRoleViewer') }
])

function showMessage() {
  ElMessage({ message: t('elementPlusDemo.messageText') })
}

function showNotification() {
  ElNotification({
    title: t('elementPlusDemo.notificationTitle'),
    message: t('elementPlusDemo.notificationContent')
  })
}

function showLoading() {
  const loading = ElLoading.service({
    lock: true,
    text: t('elementPlusDemo.loadingText')
  })

  window.setTimeout(() => loading.close(), 1200)
}

useHead({
  title: computed(() => `${t('elementPlusDemo.title')} | Podium`)
})
</script>

<style scoped lang="scss">
.theme-switch {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 24px;

  &__label {
    color: var(--fg-muted);
    font-size: 12px;
  }
}

.ep-demo {
  display: grid;
  gap: 28px;
  margin-top: 20px;

  &__section {
    display: grid;
    gap: 12px;
  }

  &__section h2 {
    margin: 0;
    font-size: 15px;
  }

  &__row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
}

/*
 * Element Plus 官方默认颜色（浅色）。
 * 项目主题已经使用 Element Plus 的默认圆角、尺寸、字号和字体，这里只把颜色还原成官方值，
 * 用于在同一页面里对比「项目颜色」和「Element Plus 默认颜色」。
 */
.ep-demo--native {
  --el-color-primary: #409eff;
  --el-color-primary-dark-2: #337ecc;
  --el-color-primary-light-3: #79bbff;
  --el-color-primary-light-4: #8cc5ff;
  --el-color-primary-light-5: #a0cfff;
  --el-color-primary-light-6: #b3d8ff;
  --el-color-primary-light-7: #c6e2ff;
  --el-color-primary-light-8: #d9ecff;
  --el-color-primary-light-9: #ecf5ff;
  --el-color-success: #67c23a;
  --el-color-success-dark-2: #529b2e;
  --el-color-success-light-3: #95d475;
  --el-color-success-light-5: #b3e19d;
  --el-color-success-light-7: #d1edc4;
  --el-color-success-light-8: #e1f3d8;
  --el-color-success-light-9: #f0f9eb;
  --el-color-warning: #e6a23c;
  --el-color-warning-dark-2: #b88230;
  --el-color-warning-light-3: #eebe77;
  --el-color-warning-light-5: #f3d19e;
  --el-color-warning-light-7: #f8e3c5;
  --el-color-warning-light-8: #faecd8;
  --el-color-warning-light-9: #fdf6ec;
  --el-color-danger: #f56c6c;
  --el-color-danger-dark-2: #c45656;
  --el-color-danger-light-3: #f89898;
  --el-color-danger-light-5: #fab6b6;
  --el-color-danger-light-7: #fcd3d3;
  --el-color-danger-light-8: #fde2e2;
  --el-color-danger-light-9: #fef0f0;
  --el-color-error: #f56c6c;
  --el-color-error-dark-2: var(--el-color-danger-dark-2);
  --el-color-error-light-3: var(--el-color-danger-light-3);
  --el-color-error-light-5: var(--el-color-danger-light-5);
  --el-color-error-light-7: var(--el-color-danger-light-7);
  --el-color-error-light-8: var(--el-color-danger-light-8);
  --el-color-error-light-9: var(--el-color-danger-light-9);
  --el-color-info: #909399;
  --el-color-info-dark-2: #73767a;
  --el-color-info-light-3: #b1b3b8;
  --el-color-info-light-5: #c8c9cc;
  --el-color-info-light-7: #dedfe0;
  --el-color-info-light-8: #e9e9eb;
  --el-color-info-light-9: #f4f4f5;
  --el-text-color-primary: #303133;
  --el-text-color-regular: #606266;
  --el-text-color-secondary: #909399;
  --el-text-color-placeholder: #a8abb2;
  --el-text-color-disabled: #c0c4cc;
  --el-border-color: #dcdfe6;
  --el-border-color-light: #e4e7ed;
  --el-border-color-lighter: #ebeef5;
  --el-border-color-extra-light: #f2f6fc;
  --el-bg-color: #fff;
  --el-bg-color-page: #f2f3f5;
  --el-bg-color-overlay: #fff;
  --el-fill-color-blank: #fff;

  padding: 20px;
  border-radius: var(--el-border-radius-base);
  background: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

.ep-demo--native h2 {
  color: var(--el-text-color-primary);
}

/* 对比模式在深色下使用 Element Plus 官方深色色板。 */
.ep-demo--native.ep-demo--dark {
  --el-color-primary-light-3: #3375b9;
  --el-color-primary-light-4: #2e679f;
  --el-color-primary-light-5: #2a598a;
  --el-color-primary-light-6: #254b73;
  --el-color-primary-light-7: #213d5b;
  --el-color-primary-light-8: #1d3043;
  --el-color-primary-light-9: #18222b;
  --el-color-primary-dark-2: #66b1ff;
  --el-color-success-light-3: #4e8e2f;
  --el-color-success-light-5: #3e6b27;
  --el-color-success-light-7: #2d481f;
  --el-color-success-light-8: #25371c;
  --el-color-success-light-9: #1c2518;
  --el-color-success-dark-2: #85ce61;
  --el-color-warning-light-3: #a77730;
  --el-color-warning-light-5: #7d5b28;
  --el-color-warning-light-7: #533f20;
  --el-color-warning-light-8: #3e301c;
  --el-color-warning-light-9: #292218;
  --el-color-warning-dark-2: #ebb563;
  --el-color-danger-light-3: #b25252;
  --el-color-danger-light-5: #854040;
  --el-color-danger-light-7: #582e2e;
  --el-color-danger-light-8: #412626;
  --el-color-danger-light-9: #2a1d1d;
  --el-color-danger-dark-2: #f78989;
  --el-color-error-dark-2: var(--el-color-danger-dark-2);
  --el-color-info-light-3: #6b6d71;
  --el-color-info-light-5: #525457;
  --el-color-info-light-7: #393a3c;
  --el-color-info-light-8: #2d2d2f;
  --el-color-info-light-9: #202121;
  --el-color-info-dark-2: #a6a9ad;
  --el-text-color-primary: #e5eaf3;
  --el-text-color-regular: #cfd3dc;
  --el-text-color-secondary: #a3a6ad;
  --el-text-color-placeholder: #8d9095;
  --el-text-color-disabled: #6c6e72;
  --el-border-color: #4c4d4f;
  --el-border-color-light: #414243;
  --el-border-color-lighter: #363637;
  --el-border-color-extra-light: #2b2b2c;
  --el-bg-color: #141414;
  --el-bg-color-page: #0a0a0a;
  --el-bg-color-overlay: #1d1e1f;
  --el-fill-color-blank: #141414;
}
</style>
