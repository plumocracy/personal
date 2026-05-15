import { getNowPlaying } from '$lib/server/spotify';
import { json } from '@sveltejs/kit';

export const GET = async () => {
	const track = await getNowPlaying();
	return json(track);
};
