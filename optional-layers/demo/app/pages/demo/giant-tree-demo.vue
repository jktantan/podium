<template>
  <section class="page giant-tree-demo">
    <p class="page__eyebrow">vue3-giant-tree-wasm</p>
    <h1>{{ t('giantTreeDemo.title') }}</h1>
    <p class="page__lead">{{ t('giantTreeDemo.lead') }}</p>

    <div class="giant-tree-demo__toolbar">
      <span class="giant-tree-demo__label">{{ t('giantTreeDemo.selectMode') }}</span>
      <el-radio-group v-model="selectType" class="giant-tree-demo__modes">
        <el-radio-button :value="SelectType.CHECKBOX">
          {{ t('giantTreeDemo.modes.checkbox') }}
        </el-radio-button>
        <el-radio-button :value="SelectType.RADIO">
          {{ t('giantTreeDemo.modes.radio') }}
        </el-radio-button>
        <el-radio-button :value="SelectType.SELECT">
          {{ t('giantTreeDemo.modes.select') }}
        </el-radio-button>
      </el-radio-group>

      <el-input
        v-model="keyword"
        class="giant-tree-demo__search"
        clearable
        :placeholder="t('giantTreeDemo.searchPlaceholder')"
        @input="handleSearch"
        @clear="handleSearch"
      />

      <el-button @click="expandAll">{{ t('giantTreeDemo.expandAll') }}</el-button>
      <el-button @click="collapseAll">{{ t('giantTreeDemo.collapseAll') }}</el-button>
      <el-button plain @click="clearSelection">{{ t('giantTreeDemo.clear') }}</el-button>

      <el-switch v-model="showLine" :active-text="t('giantTreeDemo.showLine')" />
    </div>

    <div class="giant-tree-demo__layout">
      <div class="giant-tree-demo__panel">
        <VueGiantTree
          ref="treeRef"
          v-model="selected"
          :tree="treeData"
          root="root"
          height="460px"
          :select-type="selectType"
          :size="giantTreeSize"
          :show-line="showLine"
          search-highlight
        />
      </div>

      <aside class="giant-tree-demo__result">
        <h2 class="giant-tree-demo__result-title">{{ t('giantTreeDemo.resultTitle') }}</h2>
        <p class="giant-tree-demo__meta">
          {{ t('giantTreeDemo.resultCount', { count: selectedIds.length }) }} ·
          {{ t('giantTreeDemo.totalNodes', { count: treeData.length }) }}
        </p>

        <div v-if="selectedIds.length" class="giant-tree-demo__tags">
          <el-tag v-for="id in selectedIds" :key="id" type="primary" effect="light">
            {{ nodeNames.get(id) ?? id }}
          </el-tag>
        </div>
        <p v-else class="giant-tree-demo__empty">{{ t('giantTreeDemo.resultEmpty') }}</p>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DisplayType, SelectType, VueGiantTree, type TreeInputItem } from 'vue3-giant-tree-wasm'

/**
 * 树节点的静态定义：id / 父级 / 名称文案 key。
 * 名称在 computed 里按当前语言解析，切换语言时整棵树会重建。
 */
interface TreeNodeDefinition {
  id: string
  parentId: string
  nameKey: string
  disabled?: boolean
}

const NODE_DEFINITIONS: TreeNodeDefinition[] = [
  { id: 'hq', parentId: 'root', nameKey: 'hq' },
  { id: 'rnd', parentId: 'hq', nameKey: 'rnd' },
  { id: 'fe', parentId: 'rnd', nameKey: 'fe' },
  { id: 'components', parentId: 'fe', nameKey: 'components' },
  { id: 'framework', parentId: 'fe', nameKey: 'framework' },
  { id: 'be', parentId: 'rnd', nameKey: 'be' },
  { id: 'gateway', parentId: 'be', nameKey: 'gateway' },
  { id: 'data', parentId: 'be', nameKey: 'data' },
  { id: 'qa', parentId: 'rnd', nameKey: 'qa' },
  { id: 'design', parentId: 'hq', nameKey: 'design' },
  { id: 'product', parentId: 'design', nameKey: 'product' },
  { id: 'ux', parentId: 'design', nameKey: 'ux' },
  { id: 'ops', parentId: 'hq', nameKey: 'ops' },
  { id: 'content', parentId: 'ops', nameKey: 'content' },
  { id: 'users', parentId: 'ops', nameKey: 'users' },
  { id: 'staff', parentId: 'hq', nameKey: 'staff' },
  { id: 'hr', parentId: 'staff', nameKey: 'hr' },
  { id: 'finance', parentId: 'staff', nameKey: 'finance' },
  { id: 'admin', parentId: 'staff', nameKey: 'admin', disabled: true }
]

const { t } = useI18n()
// 组件没有全局尺寸配置，尺寸由 useAppearance 的密度映射后在调用点传入
const { giantTreeSize } = useAppearance()

const treeRef = ref<InstanceType<typeof VueGiantTree> | null>(null)

const selectType = ref<SelectType>(SelectType.CHECKBOX)
const keyword = ref('')
const showLine = ref(true)
// RADIO / SELECT 模式输出单个 ID，CHECKBOX 模式输出 ID 数组
const selected = ref<string | string[]>(['components', 'gateway'])

const treeData = computed<TreeInputItem[]>(() =>
  NODE_DEFINITIONS.map(({ id, parentId, nameKey, disabled }) => ({
    id,
    name: t(`giantTreeDemo.nodes.${nameKey}`),
    parentId,
    ...(disabled ? { disabled } : {})
  }))
)

const nodeNames = computed(
  () => new Map(NODE_DEFINITIONS.map((node) => [node.id, t(`giantTreeDemo.nodes.${node.nameKey}`)]))
)

const selectedIds = computed(() => {
  const value = selected.value
  if (Array.isArray(value)) {
    return value
  }
  return value ? [value] : []
})

// 切换选择模式时清空旧结果，避免单选模式收到多选留下的数组
watch(selectType, () => {
  treeRef.value?.clearAllChecked()
  selected.value = []
})

/** 组件内部 300ms 防抖，连续输入只会触发最后一次构建 */
function handleSearch() {
  treeRef.value?.fuzzySearch(keyword.value)
  // 搜索结果渲染在独立的 SEARCH 视图，清空后切回主树
  treeRef.value?.switchDisplay(keyword.value ? DisplayType.SEARCH : DisplayType.TREE)
}

function expandAll() {
  treeRef.value?.expandAll()
}

function collapseAll() {
  treeRef.value?.collapseAll()
}

function clearSelection() {
  treeRef.value?.clearAllChecked()
  selected.value = []
}

/**
 * 组件首次构建是异步的（WASM 初始化 + 树构建），此时调用 expandAll 会作用在空树上。
 * 这里轮询 getBuildReady()，就绪后展开全部节点，让演示页首屏能看到完整层级。
 */
function expandWhenReady(attempt = 0) {
  if (treeRef.value?.getBuildReady()) {
    // 初始 v-model 在树构建完成前传入不会落到内部勾选状态，就绪后补一次
    if (selectedIds.value.length) {
      treeRef.value.setCheckedByIds(selectedIds.value)
    }
    treeRef.value.expandAll()
    return
  }

  if (attempt < 40) {
    window.setTimeout(() => expandWhenReady(attempt + 1), 50)
  }
}

onMounted(expandWhenReady)

useHead({
  title: computed(() => `${t('giantTreeDemo.title')} | Podium`)
})
</script>

<style scoped lang="scss">
.giant-tree-demo {
  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-top: 24px;
  }

  &__label {
    color: var(--fg-muted);
    font-size: 13px;
  }

  &__modes {
    flex: none;
  }

  &__search {
    width: 240px;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 16px;
    margin-top: 16px;
  }

  &__panel,
  &__result {
    border: 1px solid var(--border-default);
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
  }

  &__panel {
    min-width: 0;
    padding: 8px;
  }

  &__result {
    align-self: start;
    padding: 16px;
  }

  &__result-title {
    margin: 0;
    color: var(--fg-strong);
    font-size: 15px;
    font-weight: 600;
  }

  &__meta {
    margin: 6px 0 0;
    color: var(--fg-muted);
    font-size: 13px;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }

  &__empty {
    margin: 12px 0 0;
    color: var(--fg-muted);
    font-size: 13px;
    line-height: 1.7;
  }
}

@media (width <= 1023.98px) {
  .giant-tree-demo__layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .giant-tree-demo__search {
    width: 100%;
  }
}
</style>
