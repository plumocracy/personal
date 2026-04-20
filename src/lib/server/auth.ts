import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { user } from './db/auth.schema';
import { eq } from 'drizzle-orm';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID as string,
			clientSecret: env.GITHUB_CLIENT_SECRET as string
		}
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	],
	hooks: {
		before: async (context) => {
			if (context.path === '/sign-in/social/callback') {
				const email = context.body?.email;

				if (!email) return;

				const existing = await db
					.select()
					.from(user)
					.where(eq(user.email, email))
					.limit(1);

				if (existing.length === 0) {
					return {
						response: new Response(
							JSON.stringify({ error: 'No account found. Signups are disabled.' }),
							{ status: 403, headers: { 'Content-Type': 'application/json' } }
						)
					};
				}
			}
		}
	}
});
