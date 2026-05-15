import { db } from '$lib/server/db';
import { isUserAdmin } from '$lib/server/user';
import { fail, json } from '@sveltejs/kit';
import { posts } from '$lib/server/db/blog.schema';

export async function POST({ locals }) {
	const { user } = locals;
	if (!isUserAdmin(user)) {
		return fail(401, 'Unauthorized');
	}

	try {
		const [post] = await db
			.insert(posts)
			.values({
				authorId: user.id,
				title: '',
				body: ''
			})
			.returning();
		return json({ status: 201, postId: post.id });
	} catch (error) {
		return fail(400, { error: error });
	}
}
