<template>
  <section class="login-card">
    <header class="login-card__header">
      <el-tag class="login-card__brand" effect="plain" round>Podium</el-tag>
      <h1>{{ t('login.title') }}</h1>
      <p>{{ t('login.subtitle') }}</p>
    </header>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item :label="t('login.username')" prop="username">
        <el-input
          v-model="form.username"
          name="username"
          autocomplete="username"
          :placeholder="t('login.usernamePlaceholder')"
        />
      </el-form-item>

      <el-form-item :label="t('login.password')" prop="password">
        <el-input
          v-model="form.password"
          name="password"
          type="password"
          show-password
          autocomplete="current-password"
          :placeholder="t('login.passwordPlaceholder')"
        />
      </el-form-item>

      <el-alert
        v-if="error"
        class="login-card__error"
        :title="error"
        type="error"
        :closable="false"
        show-icon
      />

      <el-button
        class="login-card__submit"
        type="primary"
        native-type="submit"
        :loading="submitting"
      >
        {{ t('login.submit') }}
      </el-button>

      <p class="login-card__hint">
        {{ t('login.demoAccounts') }}<br />
        {{ t('login.demoViewer') }}
      </p>
    </el-form>
  </section>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'

definePageMeta({
  layout: 'auth'
})

const route = useRoute()
const { login } = useAuth()
const { t } = useI18n()

const formRef = ref<FormInstance>()
const form = reactive({
  username: 'admin',
  password: 'admin123'
})

const rules = computed<FormRules<typeof form>>(() => ({
  username: [{ required: true, message: t('login.usernameRequired'), trigger: 'blur' }],
  password: [{ required: true, message: t('login.passwordRequired'), trigger: 'blur' }]
}))

const error = ref('')
const submitting = ref(false)

function resolveRedirect() {
  const redirect = route.query.redirect

  // 只接受站内路径，避免把 ?redirect= 变成开放重定向
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }

  return '/admin'
}

async function handleSubmit() {
  if (submitting.value) {
    return
  }

  error.value = ''
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  submitting.value = true

  try {
    await login(form.username, form.password)
    await navigateTo(resolveRedirect())
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('login.failed')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.login-card {
  // 页面专用令牌：只在本页面生效，不进入全局 tokens
  // 颜色类值引用全局语义令牌，深浅色模式自动跟随
  --login-border-faint: color-mix(in srgb, var(--fg-subtle) 25%, transparent);
  --login-shadow: 0 24px 60px rgb(15 23 42 / 0.1);
  --login-brand-text: color-mix(in srgb, var(--brand-primary-dark), black 15%);
  /*
   * 卡片要透出后面的动态云雾，不能用全局的 97% 表面色。
   * 保留较高不透明度（而不是做成全透明玻璃）以保证表单文字对比度。
   */
  --login-surface: color-mix(in srgb, var(--bg-surface) 76%, transparent);
  --login-blur: 18px;

  /* 深色背景才撑得起原来的重阴影，浅色下会显脏 */
  html.dark & {
    --login-shadow: 0 30px 80px rgb(2 6 23 / 0.45);
    --login-brand-text: var(--brand-primary-dark);
    --login-surface: color-mix(in srgb, var(--bg-surface) 70%, transparent);
  }

  padding: 36px 32px 30px;
  border: 1px solid var(--login-border-faint);
  border-radius: var(--radius-xl);
  background: var(--login-surface);
  backdrop-filter: blur(var(--login-blur)) saturate(140%);
  box-shadow: var(--login-shadow);

  &__header {
    margin-bottom: 26px;

    p {
      margin: 0;
      color: var(--fg-muted);
      font-size: 14px;
      line-height: 1.6;
    }
  }

  &__brand {
    margin-bottom: 18px;
    border: none;
    background: var(--brand-primary-surface);
    color: var(--login-brand-text);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0 0 10px;
    color: var(--fg-strong);
    font-size: 26px;
    line-height: 1.2;
  }

  &__error {
    margin-bottom: 16px;
  }

  &__submit {
    width: 100%;
  }

  &__hint {
    margin: 14px 0 0;
    color: var(--fg-default);
    font-size: 12px;
    text-align: center;
  }
}
</style>
