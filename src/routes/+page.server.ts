import type { PageServerLoad } from "./$types";

export async function load({ locals, fetch }) {
	const user = locals.user;

	const posts = await fetch("api/v1/blog/posts")
	const postJson = await posts.json();

	return { user: user, posts: postJson }
}
