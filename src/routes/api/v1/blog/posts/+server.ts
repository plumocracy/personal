import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/blog.schema';
import { lte, desc } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

// FIXME: Handle error where limit isnt a number.
export async function GET({ url }) {
	const limit = url.searchParams.get('limit');

	let query = db
		.select({
			id: posts.id,
			title: posts.title,
			summary: posts.summary,
			createdAt: posts.createdAt,
			date: posts.publishedAt
		})
		.from(posts)
		.where(lte(posts.publishedAt, new Date()))
		.orderBy(desc(posts.publishedAt));

	if (limit) {
		let postList = await query.limit(Number(limit));
		return json({ status: 200, posts: postList });
	} else {
		let postList = await query;
		return json({ status: 200, posts: postList });
	}
}
