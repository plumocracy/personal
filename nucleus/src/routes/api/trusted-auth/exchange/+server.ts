import { exchangeTrustedAuthCode, parseTrustedExchangeRequest } from '$lib/server/trusted-auth';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
	const parsedRequest = await parseTrustedExchangeRequest(request);
	const identity = await exchangeTrustedAuthCode(parsedRequest);

	return json(identity, {
		headers: {
			'Cache-Control': 'no-store',
			Pragma: 'no-cache'
		}
	});
}
