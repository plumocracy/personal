# Trusted Plumocracy Auth For SvelteKit

This document explains every step a SvelteKit app needs to implement to authenticate users against `plumocracy.com` and get back a stable identity payload.

## Overview

The flow is:

1. User clicks `Sign in with Plumocracy`
2. Your SvelteKit app generates and stores a `state` value
3. Your app redirects the browser to `plumocracy.com`
4. Plumocracy authenticates the user if needed
5. Plumocracy redirects back to your callback URL with `code` and `state`
6. Your SvelteKit server verifies `state`
7. Your SvelteKit server exchanges `code` with Plumocracy server-to-server
8. Plumocracy returns the user identity payload
9. Your app creates or finds the local user and signs them in

## Values You Need

Your SvelteKit app needs these environment variables:

```env
PLUMOCRACY_BASE_URL="https://plumocracy.com"
PLUMOCRACY_CLIENT_ID="your-client-id"
PLUMOCRACY_CLIENT_SECRET="your-client-secret"
PLUMOCRACY_REDIRECT_URI="https://your-app.com/auth/plumocracy/callback"
```

These must match the values configured on Plumocracy exactly.

## Payload Returned By Plumocracy

The exchange endpoint returns JSON like this:

```json
{
  "issuer": "https://plumocracy.com",
  "sub": "stable-user-id",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "avatar_url": "https://..."
}
```

Use `sub` as the stable external identity key.

Do not use `email` as the primary identifier.

## Route Structure

Recommended routes:

- `GET /auth/plumocracy/start`
- `GET /auth/plumocracy/callback`

## Step 1: Add Environment Typing

If you use `$env/dynamic/private`, you can read env vars directly.

If you use `$env/static/private`, add them to your environment and restart the dev server after changes.

## Step 2: Create The Start Route

Create `src/routes/auth/plumocracy/start/+server.ts`.

This route should:

1. generate a random `state`
2. store that `state` in an HTTP-only cookie
3. redirect to Plumocracy's start endpoint

```ts
import { env } from '$env/dynamic/private';
import { redirect } from '@sveltejs/kit';

export async function GET({ cookies }) {
	const state = crypto.randomUUID();

	cookies.set('plumocracy_state', state, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 10
	});

	const authUrl = new URL('/api/trusted-auth/start', env.PLUMOCRACY_BASE_URL);
	authUrl.searchParams.set('client_id', env.PLUMOCRACY_CLIENT_ID);
	authUrl.searchParams.set('redirect_uri', env.PLUMOCRACY_REDIRECT_URI);
	authUrl.searchParams.set('state', state);

	throw redirect(302, authUrl.toString());
}
```

## Step 3: Send Users To The Start Route

In your login page or button handler, link to:

```text
/auth/plumocracy/start
```

Example Svelte button:

```svelte
<a href="/auth/plumocracy/start">Sign in with Plumocracy</a>
```

## Step 4: Create The Callback Route

Create `src/routes/auth/plumocracy/callback/+server.ts`.

This route should:

1. read `code` and `state` from the URL
2. compare `state` to the cookie value
3. reject invalid requests
4. exchange the code server-to-server
5. create or load the local user
6. create the local session
7. redirect into the app

```ts
import { env } from '$env/dynamic/private';
import { error, redirect } from '@sveltejs/kit';

type PlumocracyIdentity = {
	issuer: string;
	sub: string;
	email: string;
	email_verified: boolean;
	name: string;
	avatar_url: string | null;
};

export async function GET({ url, cookies, locals }) {
	const code = url.searchParams.get('code');
	const returnedState = url.searchParams.get('state');
	const expectedState = cookies.get('plumocracy_state');

	cookies.delete('plumocracy_state', { path: '/' });

	if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
		throw error(400, 'Invalid Plumocracy auth callback');
	}

	const basicAuth = Buffer.from(
		`${env.PLUMOCRACY_CLIENT_ID}:${env.PLUMOCRACY_CLIENT_SECRET}`
	).toString('base64');

	const response = await fetch(new URL('/api/trusted-auth/exchange', env.PLUMOCRACY_BASE_URL), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Basic ${basicAuth}`
		},
		body: JSON.stringify({
			code,
			redirect_uri: env.PLUMOCRACY_REDIRECT_URI
		})
	});

	if (!response.ok) {
		throw error(401, 'Plumocracy code exchange failed');
	}

	const identity = (await response.json()) as PlumocracyIdentity;

	// Replace this with your own persistence logic.
	const user = await findOrCreateUserFromPlumocracy(identity);

	// Replace this with your own session logic.
	await createAppSession(locals, user.id);

	throw redirect(302, '/');
}

async function findOrCreateUserFromPlumocracy(identity: PlumocracyIdentity) {
	return {
		id: identity.sub,
		email: identity.email,
		name: identity.name,
		avatarUrl: identity.avatar_url
	};
}

async function createAppSession(_locals: App.Locals, _userId: string) {
	return;
}
```

## Step 5: Create Or Look Up Your Local User

Your local database should store a mapping like:

- provider: `plumocracy`
- provider user id: `sub`

Recommended behavior:

1. look up user by provider `plumocracy` and external id `sub`
2. if user exists, sign them in
3. if user does not exist, create them
4. optionally update display fields like name, email, and avatar

You should treat these fields as:

- stable key: `sub`
- mutable profile fields: `email`, `name`, `avatar_url`

## Step 6: Create Your Session

After user lookup:

1. create your normal app session
2. set your app's auth cookie
3. redirect the user to the destination page

How this works depends on your auth stack.

If your SvelteKit app uses Better Auth, Lucia, custom cookies, or another session library, plug that logic into the callback route.

## Optional: Preserve A Return Path

If you want to send the user back to a specific page after sign-in, store a `next` value before redirecting to Plumocracy.

Example in the start route:

```ts
const next = '/dashboard';
cookies.set('plumocracy_next', next, {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
	maxAge: 60 * 10
});
```

Then in the callback route:

```ts
const next = cookies.get('plumocracy_next') ?? '/';
cookies.delete('plumocracy_next', { path: '/' });
throw redirect(302, next);
```

Only allow internal paths.

## Security Requirements

Your client implementation must do all of the following:

1. generate `state` server-side
2. store `state` in a secure HTTP-only cookie or server session
3. verify `state` on callback
4. clear `state` after use
5. exchange the code only from the server
6. never expose `client_secret` to browser code
7. use the exact same `redirect_uri` in both the start and exchange steps
8. use `sub` as the stable identity key

## Browser Request Summary

The browser only does these redirects:

1. your app -> `https://plumocracy.com/api/trusted-auth/start?...`
2. `plumocracy.com` -> your callback URL with `code` and `state`

The browser should never call the exchange endpoint directly.

## Server-To-Server Exchange Summary

Request:

```http
POST /api/trusted-auth/exchange HTTP/1.1
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/json
```

Body:

```json
{
  "code": "SHORT_LIVED_CODE",
  "redirect_uri": "https://your-app.com/auth/plumocracy/callback"
}
```

Response:

```json
{
  "issuer": "https://plumocracy.com",
  "sub": "stable-user-id",
  "email": "user@example.com",
  "email_verified": true,
  "name": "User Name",
  "avatar_url": null
}
```

## Minimal Checklist

- Add Plumocracy env vars
- Create `src/routes/auth/plumocracy/start/+server.ts`
- Create `src/routes/auth/plumocracy/callback/+server.ts`
- Store and verify `state`
- Exchange the code on the server
- Map `sub` to a local user
- Create your local session
- Redirect into the app

## Common Mistakes

- using `email` as the primary identity key instead of `sub`
- exchanging the code in browser code
- forgetting to verify `state`
- sending a different `redirect_uri` during exchange
- exposing `client_secret` in a public environment variable

## Recommended Next Step

Implement the two routes first, then wire the callback route into your existing user/session creation code.
