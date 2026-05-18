import type { NeonQueryFunction } from "@neondatabase/serverless";

export type ServiceStatus = "ok" | "bad";

export async function insertServiceCheck(
	sql: NeonQueryFunction<false, false>,
	service: string,
	status: ServiceStatus,
) {
	await sql.query(
		"INSERT INTO service_checks (service, status) VALUES ($1, $2)",
		[service, status],
	);
}

export async function insertSentEmail(
	sql: NeonQueryFunction<false, false>,
	resendId: string | null,
	errorMsg: string | null,
) {
	await sql.query(
		"INSERT INTO sent_emails (resend_id, error_msg) VALUES ($1, $2)",
		[resendId, errorMsg],
	);
}

export async function getLatestServiceStatuses(sql: NeonQueryFunction<false, false>) {
	const rows = await sql.query(
		`SELECT DISTINCT ON (service) service, status, checked_at
		FROM service_checks
		ORDER BY service, checked_at DESC`,
	);

	return rows as Array<{
		service: string;
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
