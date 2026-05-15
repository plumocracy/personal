import { db } from '$lib/server/db';
import { requireAdminUser } from '$lib/server/blog-api';
import { error, json } from '@sveltejs/kit';
import { posts } from '$lib/server/db/blog.schema';

export async function POST({ locals }) {
	const user = await requireAdminUser(locals);

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
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : 'Failed to create post');
	}
}
