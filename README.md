# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

> 样式规范（SCSS + Tailwind CSS 的分工、设计令牌与层叠顺序）见 [docs/styling.md](./docs/styling.md)。
>
> 环境配置（dev / test / staging / prod 四套 `.env`）见 [docs/env.md](./docs/env.md)。

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Deploy demo to GitHub Pages

Pages 上的站点只是演示：使用 test 环境构建，保留 demo 页面。

- workflow：`.github/workflows/pages.yml`，push 到 `master` / `main` 或手动触发
- 首次部署前，在仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**
- 项目页子路径会自动推导为 `/<repo>/`；绑定自定义域名时，把 Actions Variable
  `NUXT_APP_BASE_URL` 设为 `/`
- 可选：用 Actions Variable `NUXT_PUBLIC_API_BASE_URL` 覆盖 `.env.test` 的接口地址
