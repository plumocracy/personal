import { db } from '$lib/server/db';
import { isUserAdmin } from '$lib/server/user';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { posts } from '$lib/server/db/blog.schema';

export async function DELETE({ locals, params }) {
	const { user } = locals;
	if (!(await isUserAdmin(user))) {
		throw error(401, 'Unauthorized');
	}

	const { slug } = params;

	try {
		await db.delete(posts).where(eq(posts.id, Number(slug)));
	} catch (err) {
		throw error(400, err instanceof Error ? err.message : 'Failed to delete post');
	}

	return json({ status: 200 });
}
