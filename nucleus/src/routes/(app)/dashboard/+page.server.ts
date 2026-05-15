import { isUserAdmin } from '$lib/server/user';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getHiddenPosts, getVisiblePosts } from '$lib/server/blog';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals;

	if (!user) {
		redirect(307, '/?redirect_reason=Unauthenticated');
	}

	const isAdmin = await isUserAdmin(user);

	if (!isAdmin) {
		redirect(307, '/?redirect_reason=Unauthorized');
	}

	const [visiblePosts, hiddenPosts] = await Promise.all([
		getVisiblePosts(),
		getHiddenPosts({ locals })
	]);

	return { user, visiblePosts, hiddenPosts };
};
