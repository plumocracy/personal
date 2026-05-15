import { getVisiblePosts } from '$lib/server/blog';
import { json } from '@sveltejs/kit';

// FIXME: Handle error where limit isnt a number.
export async function GET({ url }) {
	const limit = url.searchParams.get('limit');

	if (limit) {
		const postList = await getVisiblePosts(Number(limit));
		return json({
			status: 200,
			posts: postList.map((post) => ({
				id: post.id,
				title: post.title,
				summary: post.summary,
				createdAt: post.createdAt,
				date: post.publishedAt
			}))
		});
	}

	const postList = await getVisiblePosts();
	return json({
		status: 200,
		posts: postList.map((post) => ({
			id: post.id,
			title: post.title,
			summary: post.summary,
			createdAt: post.createdAt,
			date: post.publishedAt
		}))
	});
}
