/**
 * mock 层向宿主提供的公开信息。
 *
 * 宿主登录页只读这些字段决定是否展示演示账号，不直接依赖 msw；
 * 项目自研 mock 时，把本层删掉后自己不提供这些字段即可，
 * 登录页会退回普通的空表单。
 */
export default defineAppConfig({
  podium: {
    mock: {
      demoAccounts: true,
      defaultAccount: {
        username: 'admin',
        password: 'admin123'
      }
    }
  }
})
