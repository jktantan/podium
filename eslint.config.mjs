// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier'

export default withNuxt(
  {
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'vue/no-unused-refs': 'error'
    }
  },
  {
    // 类型感知规则：这些规则需要读取 tsconfig
    files: ['**/*.{ts,vue}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'vue/no-multiple-template-root': 'off'
    }
  },
  // prettier 放在最后，关闭与格式化冲突的 ESLint 规则
  prettier
)
