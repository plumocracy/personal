import { normalizeInternalPath } from '$lib/server/trusted-auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	return {
		user: locals.user,
		next: normalizeInternalPath(url.searchParams.get('next'))
	};
};
