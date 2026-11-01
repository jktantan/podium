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
  {
    // TypeScript 6.0.3 + @typescript-eslint 解析 defineNuxtConfig 的重载时
    // 会在 TS 内部断言崩溃（Debug Failure. No error for last overload signature），
    // 该规则对配置文件没有实际意义，这里单独关闭。
    files: ['nuxt.config.ts'],
    rules: {
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'off'
    }
  },
  // prettier 放在最后，关闭与格式化冲突的 ESLint 规则
  prettier
)
