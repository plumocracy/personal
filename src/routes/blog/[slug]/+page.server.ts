import { isUserAdmin } from '$lib/server/user';
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const { user } = locals;
	const { slug } = params;

	const result = await fetch(`/api/v1/blog/posts/${slug}`);

	if (!result) {
		error(404, "Could not find post.");
	}

	const json = await result.json();

	const isAdmin = await isUserAdmin(user);

	if (!json.post.publishedAt && !isAdmin) {
		redirect(307, "/")
	}

	return { user: user, post: json.post }
};
