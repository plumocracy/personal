import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/blog.schema';
import { getPostIdFromSlug, requireAdminUser } from '$lib/server/blog-api';
import { eq } from 'drizzle-orm';
import { json, error } from '@sveltejs/kit';

export const GET = async ({ params }) => {
	const postId = Number(params.slug);

	const [post] = await db
		.select()
		.from(posts)
		.where(eq(posts.id, postId));

	if (!post) {
		throw error(404, 'Not found!');
	}

	return json({ status: 200, post });
};

export const PATCH = async ({ params, request, locals }) => {
	await requireAdminUser(locals);

	const postId = getPostIdFromSlug(params.slug);
	const body = (await request.json()) as {
		title?: unknown;
		body?: unknown;
	};

	if (typeof body.title !== 'string' || typeof body.body !== 'string') {
		throw error(400, 'Invalid post payload');
	}

	const [updatedPost] = await db
		.update(posts)
		.set({
			title: body.title,
			body: body.body
		})
		.where(eq(posts.id, postId))
		.returning({ id: posts.id });

	if (!updatedPost) {
		throw error(404, 'Post not found');
	}

	return json({ status: 200, postId: updatedPost.id });
};
