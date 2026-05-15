import { error } from '@sveltejs/kit';
import { isUserAdmin } from './user';
import type { PostListItem } from './blog';

export function toPublicPostSummary(post: PostListItem) {
	return {
		id: post.id,
		title: post.title,
		summary: post.summary,
		createdAt: post.createdAt,
		date: post.publishedAt
	};
}

export async function requireAdminUser(locals: App.Locals) {
	const { user } = locals;

	if (!(await isUserAdmin(user))) {
		throw error(401, 'Unauthorized');
	}

	return user;
}

export function getPostIdFromSlug(slug: string) {
	const postId = Number(slug);

	if (Number.isNaN(postId)) {
		throw error(400, 'Invalid post id');
	}

	return postId;
}
