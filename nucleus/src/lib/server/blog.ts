import { db } from './db';
import { error } from '@sveltejs/kit';
import { isUserAdmin } from './user';
import { posts } from './db/blog.schema';
import { and, desc, isNotNull, isNull, lte } from 'drizzle-orm';

export type PostListItem = {
	id: number;
	title: string;
	summary: string | null;
	createdAt: Date;
	publishedAt: Date | null;
};

const postListSelection = {
	id: posts.id,
	title: posts.title,
	summary: posts.summary,
	createdAt: posts.createdAt,
	publishedAt: posts.publishedAt
};

export async function getVisiblePosts(limit?: number): Promise<PostListItem[]> {
	const query = db
		.select(postListSelection)
		.from(posts)
		.where(and(isNotNull(posts.publishedAt), lte(posts.publishedAt, new Date())))
		.orderBy(desc(posts.publishedAt));

	if (limit) {
		return query.limit(limit);
	}

	return query;
}

export async function getHiddenPosts({ locals }: { locals: App.Locals }): Promise<PostListItem[]> {
	const { user } = locals;
	if (!user) {
		throw error(401, 'Unauthenticated!');
	}

	if (!(await isUserAdmin(user))) {
		throw error(401, 'Unauthorized!');
	}

	return db.select(postListSelection).from(posts).where(isNull(posts.publishedAt)).orderBy(desc(posts.createdAt));
}
