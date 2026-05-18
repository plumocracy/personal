import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";
import {
	deleteOldServiceChecks,
	getLatestServiceStatuses,
	insertSentEmail,
	insertServiceCheck,
	type ServiceStatus,
} from "./queries";

interface Env {
	DATABASE_URL: string;
	RESEND_API_KEY: string;
}

const HEALTH_CHECK_CRON = "* * * * *";
const CLEANUP_CRON = "0 0 * * SUN";

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
			Object.fromEntries(
				statuses.map(({ service, status, checked_at }) => [
					service,
					{ status, checked_at },
				]),
			),
		);
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		if (event.cron === HEALTH_CHECK_CRON) {
			ctx.waitUntil(checkService(env, "plumocracy", "https://plumocracy.com/health"));
		}

		if (event.cron === CLEANUP_CRON) {
			ctx.waitUntil(cleanupOldChecks(env));
		}
	},
};

function renderStatusPage() {
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Plumocracy Status</title>
	<style>
		:root { color-scheme: light; font-family: Verdana, Arial, sans-serif; }
		body { margin: 0; background: #f3f3ef; color: #222; }
		.page { max-width: 760px; margin: 36px auto; padding: 0 16px; }
		.header { background: #23436b; color: white; border: 1px solid #152940; padding: 18px 20px; }
		h1 { margin: 0; font-size: 24px; font-weight: normal; letter-spacing: .2px; }
		.subhead { margin-top: 6px; color: #d7e3f0; font-size: 13px; }
		.panel { background: white; border: 1px solid #bbb; border-top: 0; padding: 18px 20px; box-shadow: 0 2px 0 #ddd; }
		.banner { border: 1px solid #8fbc8f; background: #eef8ee; color: #235423; padding: 12px; margin-bottom: 18px; font-size: 15px; }
		.banner.bad { border-color: #c89191; background: #fbeeee; color: #6b2222; }
		table { width: 100%; border-collapse: collapse; font-size: 14px; }
		th { text-align: left; background: #e8e8df; border: 1px solid #c9c9bd; padding: 9px; }
		td { border: 1px solid #d6d6cc; padding: 9px; }
		.status { display: inline-block; min-width: 54px; padding: 3px 8px; border-radius: 2px; font-weight: bold; text-align: center; }
		.ok { background: #d9f1d9; color: #146314; border: 1px solid #9ac59a; }
		.bad { background: #f5d8d8; color: #8a1e1e; border: 1px solid #cc9b9b; }
		.footer { margin-top: 12px; color: #666; font-size: 12px; }
		.error { color: #8a1e1e; }
	</style>
</head>
<body>
	<main class="page">
		<section class="header">
			<h1>Plumocracy System Status</h1>
			<div class="subhead">Current service health and recent check time</div>
		</section>
		<section class="panel">
			<div id="summary" class="banner">Loading current status...</div>
			<table aria-label="Service status">
				<thead>
					<tr><th>Service</th><th>Status</th><th>Last Checked</th></tr>
				</thead>
				<tbody id="services">
					<tr><td colspan="3">Loading...</td></tr>
				</tbody>
			</table>
			<div id="updated" class="footer"></div>
		</section>
	</main>
	<script>
		const services = document.getElementById("services");
		const summary = document.getElementById("summary");
		const updated = document.getElementById("updated");

		function prettyDate(value) {
			return value ? new Date(value).toLocaleString() : "Unknown";
		}

		async function loadStatus() {
			try {
				const response = await fetch("/status", { cache: "no-store" });
				const data = await response.json();
				const rows = Object.entries(data);

				if (rows.length === 0) {
					services.innerHTML = '<tr><td colspan="3">No checks have run yet.</td></tr>';
					summary.textContent = "No status checks have run yet.";
					return;
				}

				const hasBad = rows.some(([, item]) => item.status !== "ok");
				summary.className = "banner" + (hasBad ? " bad" : "");
				summary.textContent = hasBad ? "Some systems are having trouble." : "All systems operational.";
				services.innerHTML = rows.map(([name, item]) => {
					const statusClass = item.status === "ok" ? "ok" : "bad";
					return '<tr><td>' + name + '</td><td><span class="status ' + statusClass + '">' + item.status.toUpperCase() + '</span></td><td>' + prettyDate(item.checked_at) + '</td></tr>';
				}).join("");
				updated.textContent = "Page updated " + new Date().toLocaleString();
			} catch (error) {
				summary.className = "banner bad";
				summary.textContent = "Could not load current status.";
				services.innerHTML = '<tr><td colspan="3" class="error">Status API request failed.</td></tr>';
			}
		}

		loadStatus();
		setInterval(loadStatus, 60000);
	</script>
</body>
</html>`;
}

async function checkService(env: Env, serviceName: string, healthUrl: string) {
	const sql = neon(env.DATABASE_URL);
	let status: ServiceStatus = "bad";

	try {
		const response = await fetch(healthUrl);
		const healthJson = await response.json<{ status?: string }>();
		status = response.ok && healthJson.status === "ok" ? "ok" : "bad";
	} catch (error) {
		console.log(error);
	}

	await insertServiceCheck(sql, serviceName, status);

	if (status === "bad") {
		await sendEmail(env, serviceName);
	} else {
		console.log(`${serviceName} is ok`);
	}
}

async function cleanupOldChecks(env: Env) {
	const sql = neon(env.DATABASE_URL);
	await deleteOldServiceChecks(sql);
	console.log("Deleted old service checks");
}

async function sendEmail(env: Env, serviceName: string) {
	const sql = neon(env.DATABASE_URL);
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

	await insertSentEmail(sql, data?.id ?? null, error ? JSON.stringify(error) : null);
	console.log(data);
}
