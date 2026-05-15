import { beforeEach, describe, expect, it, vi } from 'vitest';

const getNowPlayingMock = vi.fn();

vi.mock('$lib/server/spotify', () => ({
	getNowPlaying: getNowPlayingMock
}));

const spotifyRoute = await import('./spotify/now_listening/+server');
const f1Route = await import('./f1/driver/+server');

describe('external api routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns now playing payload directly from spotify helper', async () => {
		getNowPlayingMock.mockResolvedValue({ title: 'Track', artist: 'Artist' });

		const response = await spotifyRoute.GET();
		const payload = await response.json();

		expect(payload).toEqual({ title: 'Track', artist: 'Artist' });
	});

	it('returns stringified driver standing payload from the f1 route', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					MRData: {
						StandingsTable: {
							StandingsLists: [
								{
									DriverStandings: [
										{
											position: '1',
											Driver: { givenName: 'Oscar', familyName: 'Piastri' },
											Constructors: { name: 'McLaren' }
										}
									]
								}
							]
						}
					}
				})
			})
		);

		const response = await f1Route.GET();
		const payload = await response.json();

		expect(payload).toEqual({
			status: 200,
			driverData: JSON.stringify({
				givenName: 'Oscar',
				familyName: 'Piastri',
				team: 'McLaren',
				championshipPosition: 1
			})
		});
	});

	it('returns a 400 payload when the f1 route cannot derive standings', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: vi.fn().mockResolvedValue({
					MRData: { StandingsTable: { StandingsLists: [{ DriverStandings: [] }] } }
				})
			})
		);

		const response = await f1Route.GET();
		const payload = await response.json();

		expect(payload).toEqual({ status: 400, error: 'Could not get driver standings.' });
	});
});
