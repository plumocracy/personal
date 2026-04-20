import { isUserAdmin } from "$lib/server/user";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getHiddenPosts } from "$lib/server/blog";

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const { user } = locals;

	if (!user) {
		redirect(307, "/?redirect_reason=Unauthenticated");
	}

	const isAdmin = await isUserAdmin(user);

	if (!isAdmin) {
		redirect(307, "/?redirect_reason=Unauthorized");
	}

	const posts = await fetch("/api/v1/blog/posts");
	const postJson = await posts.json();

	const hidden = await getHiddenPosts({ locals });
	const hiddenJson = await hidden.json();

	return { user: user, visiblePosts: postJson, hiddenPosts: hiddenJson }
}
