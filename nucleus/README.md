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

Set `DATABASE_URL` in your local `.env` file. Use `npm run db:which` to confirm which local env file is providing the active database URL.

For local schema iteration, push the current Drizzle schema directly to that database:

```sh
npm run db:push
```

If you want Drizzle Studio against the same database:

```sh
npm run db:studio
```

Do not use `db:push` in CI or production.

Use the migration flow instead:

```sh
npm run db:generate
npm run db:migrate
```

Production and CI should provide `DATABASE_URL` through deployment secrets/environment configuration and use committed migrations only.
