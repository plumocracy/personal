import { db } from "$lib/server/db";
import { posts } from "$lib/server/db/blog.schema";
import { eq } from "drizzle-orm";
import { json, error } from "@sveltejs/kit";

export const GET = async ({ params }) => {
	const slug = params.slug;

	console.log(slug);

	const [post] = await db.select()
		.from(posts)
		.where(eq(posts.id, Number(slug)))

	if (!post) {
		return error(404, "Not found!")
	}

	return json({ status: 200, post: post })
}
