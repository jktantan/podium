/**
 * Stylelint 配置
 *
 * - standard-scss：CSS/SCSS 的通用规范与 SCSS 语法检查
 * - recommended-vue/scss：让 .vue 的 <style lang="scss"> 块用 postcss-html 解析
 * - 格式化交给 Prettier，这里只保留正确性与非格式化规则
 *
 * @see https://stylelint.io/user-guide/configure
 * @type {import('stylelint').Config}
 */
export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-recommended-vue/scss'],
  ignoreFiles: [
    'node_modules/**',
    '.nuxt/**',
    '.output/**',
    '.data/**',
    'dist/**',
    // 第三方库样式/构建产物不参与检查
    'public/**'
  ],
  rules: {
    // Tailwind v4 的指令不是标准 CSS at-rule，放行以免误报
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'layer',
          'theme',
          'source',
          'utility',
          'variant',
          'custom-variant',
          'reference',
          'plugin',
          'config',
          'screen',
          'responsive',
          'variants'
        ]
      }
    ],
    // BEM：block__element--modifier，同时兼容普通 kebab-case
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      {
        message: (selector) => `Expected class selector "${selector}" to be kebab-case or BEM`
      }
    ],
    // Nuxt 根节点使用 #__nuxt
    'selector-id-pattern': '^(?:[a-z][a-z0-9]*(-[a-z0-9]+)*|__nuxt)$',
    // alpha 通道统一用 0-1 小数，与现有 rgb(... / 0.72) 写法一致
    'alpha-value-notation': 'number',
    // 以下都是排版类规则：空行分组和注释空格由 Prettier/人工控制，
    // 现有代码大量使用空行分组、注释掉的代码块，保留规则只会产生噪音
    'comment-empty-line-before': null,
    'custom-property-empty-line-before': null,
    'scss/comment-no-empty': null,
    'scss/double-slash-comment-empty-line-before': null,
    'scss/double-slash-comment-whitespace-inside': null
  }
}
