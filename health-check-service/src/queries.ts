import type { NeonQueryFunction } from "@neondatabase/serverless";

export type ServiceStatus = "ok" | "bad";

export async function insertServiceCheck(
	sql: NeonQueryFunction<false, false>,
	service: string,
	component: string | null,
	checkName: string | null,
	status: ServiceStatus,
) {
	await sql.query(
		"INSERT INTO service_checks (service, component, check_name, status) VALUES ($1, $2, $3, $4)",
		[service, component, checkName, status],
	);
}

export async function insertSentEmail(
	sql: NeonQueryFunction<false, false>,
	service: string,
	resendId: string | null,
	errorMsg: string | null,
) {
	await sql.query(
		"INSERT INTO sent_emails (service, resend_id, error_msg) VALUES ($1, $2, $3)",
		[service, resendId, errorMsg],
	);
}

export async function getRecentServiceCheckStatuses(
	sql: NeonQueryFunction<false, false>,
	service: string,
	limit: number,
) {
	const rows = await sql.query(
		`SELECT status
		FROM service_checks
		WHERE service = $1
			AND component IS NULL
			AND check_name IS NULL
		ORDER BY checked_at DESC
		LIMIT $2`,
		[service, limit],
	);

	return rows.map((row) => row.status) as ServiceStatus[];
}

export async function hasSentServiceEmailRecently(sql: NeonQueryFunction<false, false>, service: string) {
	const rows = await sql.query(
		`SELECT EXISTS (
			SELECT 1
			FROM sent_emails
			WHERE service = $1
				AND sent_at > now() - interval '1 hour'
		) AS sent_recently`,
		[service],
	);

	return Boolean(rows[0]?.sent_recently);
}

export async function getLatestServiceStatuses(sql: NeonQueryFunction<false, false>) {
	const rows = await sql.query(
		`SELECT DISTINCT ON (service, component, check_name) service, component, check_name, status, checked_at
		FROM service_checks
		ORDER BY service, component NULLS FIRST, check_name NULLS FIRST, checked_at DESC`,
	);

	return rows as Array<{
		service: string;
		component: string | null;
		check_name: string | null;
		status: ServiceStatus;
		checked_at: string;
	}>;
}

export async function deleteOldServiceChecks(sql: NeonQueryFunction<false, false>) {
	await sql.query(`
		DELETE FROM service_checks
		WHERE checked_at < date_trunc('day', now())
			- (((extract(dow from now())::int - 5 + 7) % 7) * interval '1 day')
	`);
}
