<template>
  <section style="padding: 0 10px">
    <p class="page__eyebrow">Table</p>
    <h1>{{ t('tableDemo.title') }}</h1>
    <p class="page__lead">{{ t('tableDemo.lead') }}</p>
    <p class="page__lead">
      <code>VxeTable</code> · <code>VxeColumn</code> · <code>VxeColgroup</code> ·
      <code>VxeGrid</code> · <code>VxeToolbar</code>
    </p>

    <!--    <div class="mt-6">-->
    <!--  <div style="width: 100%; overflow: hidden">-->
    <vxe-grid
      :data="rows"
      :columns="columns"
      :pager-config="pagerConfig"
      border
      round
      stripe
      :row-config="{ isHover: true }"
      :column-config="{ resizable: true }"
    >
      <template #status="{ row }">
        <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.status }}</el-tag>
      </template>
    </vxe-grid>
    <!--    </div>-->

    <!--    <div class="mt-6">-->
    <vxe-table :data="[]" border round>
      <vxe-column field="name" :title="t('tableDemo.columns.name')" min-width="120" />
    </vxe-table>
    <!--    </div>-->
    <!--  </div>-->
  </section>
</template>

<script setup lang="ts">
type DepartmentKey = 'rnd' | 'design' | 'operations' | 'finance'
type RoleKey = 'frontend' | 'productManager' | 'backend' | 'operations' | 'financeManager'
type StatusKey = 'enabled' | 'disabled'

interface SourceRow {
  id: number
  name: string
  department: DepartmentKey
  role: RoleKey
  status: StatusKey
  createdAt: string
}

const sourceRows: SourceRow[] = [
  {
    id: 1,
    name: '张伟',
    department: 'rnd',
    role: 'frontend',
    status: 'enabled',
    createdAt: '2026-01-12'
  },
  {
    id: 2,
    name: '李娜',
    department: 'design',
    role: 'productManager',
    status: 'enabled',
    createdAt: '2026-02-03'
  },
  {
    id: 3,
    name: '王强',
    department: 'rnd',
    role: 'backend',
    status: 'enabled',
    createdAt: '2026-02-18'
  },
  {
    id: 4,
    name: '赵敏',
    department: 'operations',
    role: 'operations',
    status: 'disabled',
    createdAt: '2026-03-06'
  },
  {
    id: 5,
    name: '陈晨',
    department: 'finance',
    role: 'financeManager',
    status: 'enabled',
    createdAt: '2026-03-21'
  }
]

const { t } = useI18n()

// 示例数据里的部门 / 角色 / 状态属于界面展示文案，跟随语言切换
const rows = computed(() =>
  sourceRows.map((row) => ({
    ...row,
    enabled: row.status === 'enabled',
    department: t(`tableDemo.departments.${row.department}`),
    role: t(`tableDemo.roles.${row.role}`),
    status: t(`tableDemo.status.${row.status}`)
  }))
)

const pagerConfig = computed(() => ({
  total: sourceRows.length,
  pageSize: 5,
  pageSizes: [5, 10, 20]
}))

const columns = computed(() => [
  { type: 'seq', title: '#', width: 50, align: 'center' },
  { field: 'name', title: t('tableDemo.columns.name'), minWidth: 90, sortable: true },
  { field: 'department', title: t('tableDemo.columns.department'), minWidth: 110 },
  { field: 'role', title: t('tableDemo.columns.role'), minWidth: 110 },
  {
    field: 'status',
    title: t('tableDemo.columns.status'),
    width: 90,
    align: 'center',
    slots: { default: 'status' }
  },
  {
    field: 'createdAt',
    title: t('tableDemo.columns.createdAt'),
    minWidth: 110,
    sortable: true
  }
])

useHead({
  title: computed(() => `${t('tableDemo.title')} | Podium`)
})
</script>
