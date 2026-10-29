<script setup lang="ts">
import type { FormRules } from 'element-plus'
import { useTabRouter } from 'vue-stack-tabs'

const { forward } = useTabRouter()

/** 三个 CommonFrame 演示场景：在当前页签内前进导航，页面内容都足够长以产生滚动条 */
const frameDemos = [
  { id: 'common-frame-full', title: '有头有尾', path: '/admin/common-frame/full' },
  { id: 'common-frame-no-header', title: '无头有尾', path: '/admin/common-frame/no-header' },
  { id: 'common-frame-bare', title: '无头无尾', path: '/admin/common-frame/bare' }
] as const

function openFrameDemo(demo: (typeof frameDemos)[number]) {
  forward({ path: demo.path })
}

const query = reactive({
  keyword: '',
  status: '',
  createdAt: '',
  department: '',
  role: '',
  owner: '',
  remark: ''
})

const rules: FormRules = {
  keyword: [{ max: 20, message: '关键字不能超过 20 个字符', trigger: 'blur' }]
}

function handleSearch() {
  // 示例：实际项目在这里把 query 提交到接口
}

function handleReset() {
  // 表单字段已由 SearchCard 重置，这里可以重新请求列表
}
</script>

<template>
  <search-frame>
    <template #search>
      <!-- app-col 的断点按查询框（app-row）宽度判断，传参与 el-col 一致 -->
      <search-card :model="query" :rules="rules" @search="handleSearch" @reset="handleReset">
        <app-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
          <el-form-item label="关键字" prop="keyword">
            <el-input v-model="query.keyword" clearable placeholder="请输入关键字" />
          </el-form-item>
        </app-col>

        <app-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
          <el-form-item label="状态" prop="status">
            <el-select v-model="query.status" clearable placeholder="请选择状态">
              <el-option label="启用" value="enabled" />
              <el-option label="停用" value="disabled" />
            </el-select>
          </el-form-item>
        </app-col>

        <app-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
          <el-form-item label="创建时间" prop="createdAt">
            <el-date-picker
              v-model="query.createdAt"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%"
            />
          </el-form-item>
        </app-col>

        <app-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
          <el-form-item label="部门" prop="department">
            <el-select v-model="query.department" clearable placeholder="请选择部门">
              <el-option label="研发中心" value="rnd" />
              <el-option label="产品设计部" value="design" />
              <el-option label="运营部" value="operations" />
            </el-select>
          </el-form-item>
        </app-col>

        <app-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
          <el-form-item label="角色" prop="role">
            <el-select v-model="query.role" clearable placeholder="请选择角色">
              <el-option label="管理员" value="admin" />
              <el-option label="编辑" value="editor" />
              <el-option label="访客" value="viewer" />
            </el-select>
          </el-form-item>
        </app-col>

        <app-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
          <el-form-item label="负责人" prop="owner">
            <el-input v-model="query.owner" clearable placeholder="请输入负责人" />
          </el-form-item>
        </app-col>

        <app-col :xs="24" :sm="12" :md="8" :lg="6" :xl="4">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="query.remark" clearable placeholder="请输入备注" />
          </el-form-item>
        </app-col>
      </search-card>
    </template>
    <template #table>
      <div class="flex flex-wrap gap-2">
        <el-button v-for="demo in frameDemos" :key="demo.id" plain @click="openFrameDemo(demo)">
          {{ demo.title }}
        </el-button>
      </div>
    </template>
  </search-frame>
</template>
