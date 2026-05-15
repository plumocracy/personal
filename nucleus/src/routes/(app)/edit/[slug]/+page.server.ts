import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { isUserAdmin } from '$lib/server/user';
import type { Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/blog.schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	const { user } = locals;
	if (!user) {
		redirect(307, '/?redirect_reason=Unauthenticated');
	}

	if (!isUserAdmin(user)) {
		redirect(307, '/?redirect_reason=Unauthorized');
	}

	const { slug } = params;

	const res = await fetch(`/api/v1/blog/posts/${slug}`);
	if (res.status == 404) {
		redirect(307, '/dashboard');
	}
	const postJson = await res.json();
	return { user: user, post: postJson };
};

export const actions = {
	default: async ({ request, locals, params }) => {
		const { user } = locals;
		if (!user) {
			return;
		}
		if (!isUserAdmin) {
			return;
		}

		const data = await request.formData();

		const title = data.get('title');
		const body = data.get('body');

		const { slug } = params;

		console.log(title);
		console.log(body);
		try {
			await db
				.update(posts)
				.set({
					title: title as string,
					body: body as string
				})
				.where(eq(posts.id, Number(slug)));
			return { success: 'Saved successfully!' };
		} catch (error) {
			return { error: error.message };
		}
	}
} satisfies Actions;
