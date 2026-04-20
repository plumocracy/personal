import { json } from "@sveltejs/kit"
import type { DriverStanding } from "$lib/types/f1types";

export async function GET() {
	const data = await fetch(
		`https://api.jolpi.ca/ergast/f1/2026/drivers/piastri/driverstandings/`
	);

	if (!data) { return json({ status: 400, error: "Could not fetch from ergast API!" }) }

	const jsonData = await data.json();
	if (!jsonData) { return json({ status: 400, error: "Could not parse json data!" }) }

	const driverStandings = jsonData.MRData.StandingsTable.StandingsLists[0].DriverStandings[0];

	if (!driverStandings) { return json({ status: 400, error: "Could not get driver standings." }) }

	const standing: DriverStanding = {
		givenName: driverStandings.Driver.givenName,
		familyName: driverStandings.Driver.familyName,
		team: driverStandings.Constructors.name,
		championshipPosition: driverStandings.position
	}

	return json({ status: 200, driverData: JSON.stringify(standing) })
}
