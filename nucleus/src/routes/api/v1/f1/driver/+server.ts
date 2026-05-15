import { json } from '@sveltejs/kit';
import type { DriverStanding } from '$lib/types/f1types';

type ErgastResponse = {
	MRData?: {
		StandingsTable?: {
			StandingsLists?: Array<{
				DriverStandings?: Array<{
					position: string;
					Driver: {
						givenName: string;
						familyName: string;
					};
					Constructors: {
						name: string;
					};
				}>;
			}>;
		};
	};
};

function badResponse(message: string) {
	return json({ status: 400, error: message });
}

function extractDriverStanding(data: ErgastResponse) {
	return data.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings?.[0] ?? null;
}

export async function GET() {
	const response = await fetch(`https://api.jolpi.ca/ergast/f1/2026/drivers/piastri/driverstandings/`);

	if (!response.ok) {
		return badResponse('Could not fetch from ergast API!');
	}

	const jsonData = (await response.json()) as ErgastResponse;
	if (!jsonData) {
		return badResponse('Could not parse json data!');
	}

	const driverStandings = extractDriverStanding(jsonData);

	if (!driverStandings) {
		return badResponse('Could not get driver standings.');
	}

	const standing: DriverStanding = {
		givenName: driverStandings.Driver.givenName,
		familyName: driverStandings.Driver.familyName,
		team: driverStandings.Constructors.name,
		championshipPosition: Number(driverStandings.position)
	};

	return json({ status: 200, driverData: JSON.stringify(standing) });
}
