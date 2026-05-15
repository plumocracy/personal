# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.15.1 create --template minimal --types ts --add prettier vitest="usages:unit,component" tailwindcss="plugins:typography,forms" drizzle="database:postgresql+postgresql:neon" better-auth="demo:github" --install bun nucleus
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Database workflow

Use a disposable Neon branch for local schema iteration, and keep migrations as the source of truth for CI and production.

### Local development branch

1. Set the Neon management variables in your local `.env`:

```sh
NEON_API_KEY="..."
NEON_PROJECT_ID="..."
NEON_DB_NAME="neondb"
NEON_DB_ROLE="neondb_owner"
NEON_PARENT_BRANCH="main"
NEON_DEV_BRANCH_NAME="dev-local"
```

2. Create or refresh the local Neon branch and write `.env.neon-dev`:

```sh
npm run db:dev:branch
```

This also writes `.env.local` with the same `DATABASE_URL`, which means local app commands like `npm run dev` use the dev branch automatically.

To recreate it from the parent branch:

```sh
npm run db:dev:branch -- --reset
```

3. Push schema changes to the dev branch freely:

```sh
npm run db:push:dev
```

4. If you want Drizzle Studio against the dev branch:

```sh
npm run db:studio:dev
```

### Production and CI

Do not use `db:push` in CI or production.

Use the migration flow instead:

```sh
npm run db:generate
npm run db:migrate
```

Recommended rule:

- local dev branch: `db:push:dev`
- shared environments: committed migrations only

Production and CI are unaffected by `.env.local` because they should provide their own `DATABASE_URL` through deployment secrets/environment configuration.
