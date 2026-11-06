<template>
  <CommonFrame :header="false" :footer="false">
    <p class="page__eyebrow">ep-field-view</p>
    <h1>{{ t('epFieldViewDemo.title') }}</h1>
    <p class="page__lead">{{ t('epFieldViewDemo.lead') }}</p>

    <div class="ep-demo__toolbar">
      <span class="ep-demo__label">{{ t('epFieldViewDemo.modeLabel') }}</span>
      <el-switch
        v-model="textMode"
        :active-text="t('epFieldViewDemo.textMode')"
        :inactive-text="t('epFieldViewDemo.editMode')"
      />
      <el-button @click="validateForm">{{ t('epFieldViewDemo.validate') }}</el-button>
    </div>
    <p class="ep-demo__hint">{{ t('epFieldViewDemo.modeHint') }}</p>

    <el-form
      ref="formRef"
      class="ep-demo__form"
      :model="model"
      :rules="rules"
      :text="textMode"
      :size="elSize"
      label-suffix=":"
      label-width="120px"
    >
      <section class="ep-demo__section">
        <h2>{{ t('epFieldViewDemo.sections.basic') }}</h2>
        <div class="ep-demo__grid">
          <!-- el-input：文本态直接显示输入值 -->
          <TextFormItem :label="t('epFieldViewDemo.name')" prop="name">
            <el-input
              v-model="model.name"
              clearable
              :placeholder="t('epFieldViewDemo.namePlaceholder')"
            />
          </TextFormItem>

          <!-- el-select：自动从 el-option 解析 label，而不是显示裸值 -->
          <TextFormItem :label="t('epFieldViewDemo.role')" prop="role">
            <el-select v-model="model.role" :placeholder="t('epFieldViewDemo.rolePlaceholder')">
              <el-option
                v-for="role in roleOptions"
                :key="role.value"
                :label="role.label"
                :value="role.value"
              />
            </el-select>
          </TextFormItem>

          <!-- el-radio-group：解析选中项的文字 -->
          <TextFormItem :label="t('epFieldViewDemo.department')" prop="department">
            <el-radio-group v-model="model.department">
              <el-radio v-for="item in departmentOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </el-radio>
            </el-radio-group>
          </TextFormItem>

          <!-- el-checkbox-group：多值用全局 separator（本项目配置为 、）连接 -->
          <TextFormItem :label="t('epFieldViewDemo.skills')" prop="skills">
            <el-checkbox-group v-model="model.skills">
              <el-checkbox v-for="item in skillOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </el-checkbox>
            </el-checkbox-group>
          </TextFormItem>

          <!-- el-switch：优先使用 active-text / inactive-text -->
          <TextFormItem :label="t('epFieldViewDemo.enabled')" prop="enabled">
            <el-switch
              v-model="model.enabled"
              :active-text="t('epFieldViewDemo.enabledText')"
              :inactive-text="t('epFieldViewDemo.disabledText')"
            />
          </TextFormItem>

          <!-- el-rate：默认显示分数文本 -->
          <TextFormItem :label="t('epFieldViewDemo.score')" prop="score">
            <el-rate v-model="model.score" />
          </TextFormItem>

          <!-- el-date-picker：读取组件的 format，文本态与编辑态展示一致 -->
          <TextFormItem :label="t('epFieldViewDemo.joinedAt')" prop="joinedAt">
            <el-date-picker
              v-model="model.joinedAt"
              type="date"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </TextFormItem>

          <!-- 日期范围：使用全局 rangeSeparator（本项目配置为 至） -->
          <TextFormItem :label="t('epFieldViewDemo.range')" prop="range">
            <el-date-picker
              v-model="model.range"
              type="daterange"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              :start-placeholder="t('epFieldViewDemo.startDate')"
              :end-placeholder="t('epFieldViewDemo.endDate')"
            />
          </TextFormItem>
        </div>
      </section>

      <section class="ep-demo__section">
        <h2>{{ t('epFieldViewDemo.sections.format') }}</h2>
        <div class="ep-demo__grid">
          <!-- 格式化预设：金额 -->
          <TextFormItem
            :label="t('epFieldViewDemo.salary')"
            prop="salary"
            :formatter="salaryFormatter"
          >
            <el-input-number v-model="model.salary" :min="0" :step="1000" />
          </TextFormItem>

          <!-- 格式化预设：百分比 -->
          <TextFormItem
            :label="t('epFieldViewDemo.progress')"
            prop="progress"
            :formatter="progressFormatter"
          >
            <el-input-number v-model="model.progress" :min="0" :max="1" :step="0.01" />
          </TextFormItem>

          <!-- 后端字典映射：formatter 优先级高于插槽解析 -->
          <TextFormItem
            :label="t('epFieldViewDemo.level')"
            prop="level"
            :formatter="levelFormatter"
          >
            <el-input v-model="model.level" :placeholder="t('epFieldViewDemo.levelPlaceholder')" />
          </TextFormItem>

          <!-- el-time-picker：读取组件的 format -->
          <TextFormItem :label="t('epFieldViewDemo.workTime')" prop="workTime">
            <el-time-picker v-model="model.workTime" format="HH:mm" value-format="HH:mm:ss" />
          </TextFormItem>
        </div>
      </section>

      <section class="ep-demo__section">
        <h2>{{ t('epFieldViewDemo.sections.custom') }}</h2>
        <div class="ep-demo__grid">
          <!-- 空值：按全局 emptyText 显示 -->
          <TextFormItem :label="t('epFieldViewDemo.remark')" prop="remark">
            <el-input
              v-model="model.remark"
              :placeholder="t('epFieldViewDemo.remarkPlaceholder')"
            />
          </TextFormItem>

          <!-- text 插槽：保留 Tag、链接等富内容 -->
          <TextFormItem :label="t('epFieldViewDemo.rich')" prop="contact">
            <el-input v-model="model.contact" />
            <template #text="{ value }">
              <span class="ep-demo__rich">
                <el-tag size="small" type="info">{{ value }}</el-tag>
                <el-link type="primary" underline="never">
                  {{ t('epFieldViewDemo.richDetail') }}
                </el-link>
              </span>
            </template>
          </TextFormItem>
        </div>
      </section>
    </el-form>

    <section class="ep-demo__section">
      <h2>{{ t('epFieldViewDemo.sections.theme') }}</h2>
      <el-form label-width="120px">
        <TextFormItem
          :label="t('epFieldViewDemo.themeCompact')"
          theme="compact"
          text
          :value="t('epFieldViewDemo.themeCompactValue')"
        />
        <TextFormItem
          :label="t('epFieldViewDemo.themeBold')"
          theme="bold"
          text
          :value="t('epFieldViewDemo.themeBoldValue')"
        />
        <TextFormItem
          :label="t('epFieldViewDemo.themePlain')"
          theme="plain"
          text
          :value="t('epFieldViewDemo.themePlainValue')"
        />
      </el-form>
    </section>

    <section class="ep-demo__section">
      <h2>{{ t('epFieldViewDemo.sections.json') }}</h2>
      <JsonPreview :value="model.metadata" :max-height="180" />
    </section>

    <section class="ep-demo__section">
      <h2>{{ t('epFieldViewDemo.sections.table') }}</h2>
      <el-table class="ep-demo__table" :data="tableRows" border>
        <el-table-column prop="name" :label="t('epFieldViewDemo.tableName')" width="120" />
        <el-table-column :label="t('epFieldViewDemo.tableRole')" width="120">
          <template #default="{ row }">
            <TextFormItem text :value="row.role" />
          </template>
        </el-table-column>
        <el-table-column :label="t('epFieldViewDemo.tableRemark')" width="260">
          <template #default="{ row }">
            <TextFormItem text nowrap :value="row.remark" />
          </template>
        </el-table-column>
      </el-table>
      <p class="ep-demo__hint">{{ t('epFieldViewDemo.tableHint') }}</p>
    </section>
  </CommonFrame>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import {
  dictFormatter,
  moneyFormatter as createMoneyFormatter,
  percentFormatter as createPercentFormatter
} from 'ep-field-view'

/**
 * ep-field-view 由 `ep-field-view/nuxt` 模块全局注册，
 * 这里不需要 import TextFormItem / JsonPreview；
 * 只用到三个格式化预设，才从包入口按名导入。
 */
const { t, currentLocale } = useLocale()
/**
 * 密度：ElConfigProvider 只把 size 注入组件的 useFormSize，
 * ep-field-view 的文本态 min-height 读取的是 el-form 的 props.size，
 * 所以这里显式绑一次，文本态才会跟着项目的紧凑/标准/宽松切换。
 */
const { elSize } = useAppearance()

const formRef = ref<FormInstance>()

/** 整个表单的文本态开关：对应 el-form 的 text 属性 */
const textMode = ref(true)

const model = reactive({
  name: '张三',
  role: 'admin',
  department: 'engineering',
  skills: ['vue', 'ts'],
  enabled: true,
  score: 4,
  joinedAt: '2024-05-20',
  range: ['2026-01-01', '2026-01-31'],
  salary: 23500,
  progress: 0.86,
  level: 'p2',
  workTime: '09:30:00',
  remark: '',
  contact: '张三 / 研发中心',
  metadata: {
    source: 'hr',
    tags: ['核心成员', '远程办公'],
    syncedAt: '2026-10-31T09:30:00+08:00'
  }
})

const roleOptions = computed(() => [
  { value: 'admin', label: t('epFieldViewDemo.roles.admin') },
  { value: 'editor', label: t('epFieldViewDemo.roles.editor') },
  { value: 'viewer', label: t('epFieldViewDemo.roles.viewer') }
])

const departmentOptions = computed(() => [
  { value: 'product', label: t('epFieldViewDemo.departments.product') },
  { value: 'engineering', label: t('epFieldViewDemo.departments.engineering') },
  { value: 'design', label: t('epFieldViewDemo.departments.design') }
])

const skillOptions = computed(() => [
  { value: 'vue', label: 'Vue' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'node', label: 'Node.js' }
])

/**
 * 校验只挂在编辑态可见的字段上；
 * 文本态由 TextFormItem 自动跳过，这是它相对「把输入框置灰」的主要差别。
 */
const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: t('epFieldViewDemo.nameRequired'), trigger: 'blur' }]
}))

/** 金额 / 百分比预设会按当前界面语言格式化，切语言后自动更新 */
const salaryFormatter = computed(() =>
  createMoneyFormatter({ locale: currentLocale.value, precision: 2 })
)
const progressFormatter = computed(() =>
  createPercentFormatter({ locale: currentLocale.value, precision: 1, trimTrailingZeros: true })
)
const levelFormatter = computed(() =>
  dictFormatter(
    {
      p1: t('epFieldViewDemo.levels.p1'),
      p2: t('epFieldViewDemo.levels.p2'),
      p3: t('epFieldViewDemo.levels.p3')
    },
    { fallback: 'value' }
  )
)

const tableRows = computed(() => [
  {
    id: 1,
    name: '张三',
    role: t('epFieldViewDemo.roles.admin'),
    remark: t('epFieldViewDemo.tableRemarkLong')
  },
  {
    id: 2,
    name: '李四',
    role: t('epFieldViewDemo.roles.viewer'),
    remark: t('epFieldViewDemo.tableRemarkShort')
  }
])

async function validateForm() {
  const valid = await formRef.value?.validate().catch(() => false)

  if (valid) {
    ElMessage.success(t('epFieldViewDemo.validatePass'))
  }
}

useHead({
  title: computed(() => `${t('epFieldViewDemo.title')} | Podium`)
})
</script>

<style scoped lang="scss">
.ep-demo {
  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-top: 24px;
  }

  &__label {
    color: var(--fg-muted);
    font-size: 12px;
  }

  &__hint {
    margin: 8px 0 0;
    color: var(--fg-muted);
    font-size: 12px;
  }

  &__form {
    max-width: 960px;
    margin-top: 16px;
  }

  &__section {
    margin-top: 28px;

    h2 {
      margin: 0 0 12px;
      font-size: 15px;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 0 24px;
  }

  &__rich {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  &__table {
    max-width: 960px;
  }
}
</style>
