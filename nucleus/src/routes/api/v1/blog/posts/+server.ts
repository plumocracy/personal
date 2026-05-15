import { getVisiblePosts } from '$lib/server/blog';
import { toPublicPostSummary } from '$lib/server/blog-api';
import { json } from '@sveltejs/kit';

// FIXME: Handle error where limit isnt a number.
export async function GET({ url }) {
	const limit = url.searchParams.get('limit');

	if (limit) {
		const postList = await getVisiblePosts(Number(limit));
		return json({
			status: 200,
			posts: postList.map(toPublicPostSummary)
		});
	}

	const postList = await getVisiblePosts();
	return json({
		status: 200,
		posts: postList.map(toPublicPostSummary)
	});
}
