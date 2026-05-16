import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const user = locals.user;

	const posts = await fetch('api/v1/blog/posts?limit=5');
	if (!posts.ok) {
		return { user, posts: { status: posts.status, posts: [] } };
	}

	const postJson = await posts.json();

	return { user, posts: postJson };
};
