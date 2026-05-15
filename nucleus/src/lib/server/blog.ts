import { db } from './db';
import { error, json } from '@sveltejs/kit';
import { isUserAdmin } from './user';
import { posts } from './db/blog.schema';
import { isNull } from 'drizzle-orm';

export async function getHiddenPosts({ locals }: { locals: App.Locals }) {
	const { user } = locals;
	if (!user) {
		throw error(401, 'Unauthenticated!');
	}

	if (!(await isUserAdmin(user))) {
		throw error(401, 'Unauthorized!');
	}

	const res = await db.select().from(posts).where(isNull(posts.publishedAt));

	return json({ posts: res });
}
