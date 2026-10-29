/**
 * @see https://prettier.io/docs/configuration
 * @type {import('prettier').Config}
 */
const config = {
  semi: false,
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'none',
  arrowParens: 'always',
  // Windows 下也固定 LF，避免换行符混入 diff
  endOfLine: 'lf'
}

export default config
