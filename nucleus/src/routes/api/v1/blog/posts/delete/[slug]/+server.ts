import { db } from '$lib/server/db';
import { isUserAdmin } from '$lib/server/user';
import { fail, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { posts } from '$lib/server/db/blog.schema';

export async function DELETE({ locals, params }) {
	const { user } = locals;
	if (!isUserAdmin(user)) {
		return fail(401, 'Unauthorized');
	}

	const { slug } = params;

	try {
		await db.delete(posts).where(eq(posts.id, Number(slug)));
	} catch (error) {
		return fail(400, { error: error });
	}

	return json({ status: 200 });
}
