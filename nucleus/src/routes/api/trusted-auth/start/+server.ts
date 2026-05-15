import { createTrustedAuthCode, assertTrustedClient } from '$lib/server/trusted-auth';
import { error, redirect } from '@sveltejs/kit';

export async function GET({ locals, url }) {
	const clientId = url.searchParams.get('client_id');
	const redirectUri = url.searchParams.get('redirect_uri');
	const state = url.searchParams.get('state');

	if (!state) {
		throw error(400, 'Missing state');
	}

	const config = assertTrustedClient(clientId, redirectUri);

	if (!locals.user) {
		const next = `${url.pathname}${url.search}`;
		throw redirect(302, `/login?next=${encodeURIComponent(next)}`);
	}

	const code = await createTrustedAuthCode({
		clientId: config.clientId,
		redirectUri: config.redirectUri,
		userId: locals.user.id
	});

	const callbackUrl = new URL(config.redirectUri);
	callbackUrl.searchParams.set('code', code);
	callbackUrl.searchParams.set('state', state);

	throw redirect(302, callbackUrl.toString());
}
