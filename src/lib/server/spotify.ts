// src/lib/server/spotify.ts
import { env } from '$env/dynamic/private';

async function getAccessToken() {
	const res = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)}`,
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: env.SPOTIFY_REFRESH_TOKEN,
		}),
	});

	const data = await res.json();
	return data.access_token;
}

export async function getNowPlaying() {
	const token = await getAccessToken();

	const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (res.status === 204) return null; // nothing playing

	const data = await res.json();

	return {
		title: data.item.name,
		artist: data.item.artists.map(a => a.name).join(', '),
		album: data.item.album.name,
		albumArt: data.item.album.images[0].url,
		url: data.item.external_urls.spotify,
		isPlaying: data.is_playing,
	};
}
