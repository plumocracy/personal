import { db } from '$lib/server/db';
import { getPostIdFromSlug, requireAdminUser } from '$lib/server/blog-api';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { posts } from '$lib/server/db/blog.schema';

export async function DELETE({ locals, params }) {
	await requireAdminUser(locals);
	const postId = getPostIdFromSlug(params.slug);

	try {
		await db.delete(posts).where(eq(posts.id, postId));
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : 'Failed to delete post');
	}

	return json({ status: 200 });
}
