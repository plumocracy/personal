import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { Resend } from "resend";
import {
	deleteOldServiceChecks,
	getRecentServiceCheckStatuses,
	getLatestServiceStatuses,
	hasSentServiceEmailRecently,
	insertSentEmail,
	insertServiceCheck,
	type ServiceStatus,
} from "./queries";
import { renderStatusPage } from "./frontend/status-page";

interface Env {
	DATABASE_URL: string;
	RESEND_API_KEY: string;
}

interface StatusNode {
	status: ServiceStatus;
	checked_at: string;
	checks?: Record<string, StatusNode>;
}

interface HealthPayload {
	status?: string;
	site?: HealthPayload;
	chat?: HealthPayload;
	checks?: Record<string, HealthPayload>;
}

interface ServiceCheckResult {
	component: string | null;
	checkName: string | null;
	status: ServiceStatus;
}

type Sql = NeonQueryFunction<false, false>;

const HEALTH_CHECK_CRON = "*/30 * * * *";
const CLEANUP_CRON = "0 0 * * SUN";
const FAILURE_EMAIL_CHECK_COUNT = 5;

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/") {
			return new Response(renderStatusPage(), {
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		}

		if (url.pathname !== "/status") {
			return new Response("Not found", { status: 404 });
		}

		const sql = neon(env.DATABASE_URL);
		const statuses = await getLatestServiceStatuses(sql);

		return Response.json(
			statuses.reduce<Record<string, StatusNode>>(
				(result, { service, component, check_name, status, checked_at }) => {
					result[service] ??= { status: "bad", checked_at, checks: {} };
					const serviceNode = result[service];

					if (!component) {
						serviceNode.status = status;
						serviceNode.checked_at = checked_at;
						return result;
					}

					serviceNode.checks ??= {};
					serviceNode.checks[component] ??= { status: "bad", checked_at, checks: {} };
					const componentNode = serviceNode.checks[component];

					if (!check_name) {
						componentNode.status = status;
						componentNode.checked_at = checked_at;
						return result;
					}

					componentNode.checks ??= {};
					componentNode.checks[check_name] = { status, checked_at };
					return result;
				},
				{},
			),
		);
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		if (event.cron === HEALTH_CHECK_CRON) {
			ctx.waitUntil(checkService(env, "plumocracy", "https://plumocracy.com/health"));
			ctx.waitUntil(checkService(env, "atom", "https://atom.plumocracy.com/api/health"));
		}

		if (event.cron === CLEANUP_CRON) {
			ctx.waitUntil(cleanupOldChecks(env));
		}
	},
};

async function checkService(env: Env, serviceName: string, healthUrl: string) {
	const sql = neon(env.DATABASE_URL);
	let checks: ServiceCheckResult[] = [{ component: null, checkName: null, status: "bad" }];

	try {
		const response = await fetch(healthUrl);
		const healthJson = await response.json<HealthPayload>();
		checks = parseHealthPayload(response.ok, healthJson);
	} catch (error) {
		console.log(error);
	}

	await Promise.all(
		checks.map((check) =>
			insertServiceCheck(sql, serviceName, check.component, check.checkName, check.status),
		),
	);

	if (await shouldSendFailureEmail(sql, serviceName)) {
		await sendEmail(env, sql, serviceName);
	} else {
		console.log(`${serviceName} is ok`);
	}
}

async function shouldSendFailureEmail(sql: Sql, serviceName: string) {
	const statuses = await getRecentServiceCheckStatuses(sql, serviceName, FAILURE_EMAIL_CHECK_COUNT);

	if (statuses.length < FAILURE_EMAIL_CHECK_COUNT || statuses.some((status) => status !== "bad")) {
		return false;
	}

	return !(await hasSentServiceEmailRecently(sql, serviceName));
}

function parseHealthPayload(responseOk: boolean, payload: HealthPayload): ServiceCheckResult[] {
	const checks: ServiceCheckResult[] = [
		{ component: null, checkName: null, status: responseOk && isHealthy(payload.status) ? "ok" : "bad" },
	];

	for (const componentName of ["site", "chat"] as const) {
		const component = payload[componentName];

		if (!component) {
			continue;
		}

		checks.push({
			component: componentName,
			checkName: null,
			status: isHealthy(component.status) ? "ok" : "bad",
		});

		for (const [checkName, check] of Object.entries(component.checks ?? {})) {
			checks.push({
				component: componentName,
				checkName,
				status: isHealthy(check.status) ? "ok" : "bad",
			});
		}
	}

	return checks;
}

function isHealthy(status: string | undefined) {
	return status === "ok" || status === "healthy";
}

async function cleanupOldChecks(env: Env) {
	const sql = neon(env.DATABASE_URL);
	await deleteOldServiceChecks(sql);
	console.log("Deleted old service checks");
}

async function sendEmail(env: Env, sql: Sql, serviceName: string) {
	const resend = new Resend(env.RESEND_API_KEY);
	const { data, error } = await resend.emails.send({
		from: "status@status.plumocracy.com",
		to: "plum@plumocracy.com",
		subject: `${serviceName} is fucked!`,
		html: "go fix",
	});

	if (error) {
		console.log(error);
	}

	await insertSentEmail(sql, serviceName, data?.id ?? null, error ? JSON.stringify(error) : null);
	console.log(data);
}
