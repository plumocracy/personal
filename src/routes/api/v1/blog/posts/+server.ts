import { db } from "$lib/server/db";
import { posts } from "$lib/server/db/blog.schema";
import { lte, desc } from "drizzle-orm";
import { json } from "@sveltejs/kit";

export async function GET() {
	const postList = await db.select({
		id: posts.id,
		title: posts.title,
		summary: posts.summary,
		createdAt: posts.createdAt,
		date: posts.publishedAt
	})
		.from(posts)
		.where(lte(posts.publishedAt, new Date()))
		.orderBy(desc(posts.publishedAt))

	return json({ status: 200, posts: postList })
}
