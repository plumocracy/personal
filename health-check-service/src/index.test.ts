import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const resendSendMock = vi.fn();

vi.mock("@neondatabase/serverless", () => ({
	neon: vi.fn(() => ({ query: queryMock })),
}));

vi.mock("resend", () => ({
	Resend: vi.fn(function () {
		return {
		emails: { send: resendSendMock },
		};
	}),
}));

const { default: worker } = await import("./index");

const env = {
	DATABASE_URL: "postgres://test",
	RESEND_API_KEY: "re_test",
};

function createExecutionContext() {
	const promises: Promise<unknown>[] = [];

	return {
		ctx: {
			waitUntil(promise: Promise<unknown>) {
				promises.push(promise);
			},
		} as ExecutionContext,
		async waitForPromises() {
			await Promise.all(promises);
		},
	};
}

describe("health check worker", () => {
	beforeEach(() => {
		queryMock.mockReset();
		queryMock.mockResolvedValue([]);
		resendSendMock.mockReset();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				Response.json({
					status: "healthy",
					site: { status: "healthy" },
					chat: { status: "healthy" },
				}),
			),
		);
	});

	it("serves a lightweight status page from root", async () => {
		const response = await worker.fetch(new Request("https://status.example.com/"), env);
		const html = await response.text();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(html).toContain("Plumocracy System Status");
		expect(html).toContain('fetch("/status"');
	});

	it("returns latest service statuses from /status", async () => {
		queryMock.mockResolvedValueOnce([
			{
				service: "plumocracy",
				component: null,
				check_name: null,
				status: "ok",
				checked_at: "2026-05-18T00:00:00.000Z",
			},
			{
				service: "plumocracy",
				component: "chat",
				check_name: null,
				status: "bad",
				checked_at: "2026-05-18T00:00:01.000Z",
			},
			{
				service: "plumocracy",
				component: "chat",
				check_name: "openRouter",
				status: "bad",
				checked_at: "2026-05-18T00:00:02.000Z",
			},
		]);

		const response = await worker.fetch(new Request("https://status.example.com/status"), env);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			plumocracy: {
				status: "ok",
				checked_at: "2026-05-18T00:00:00.000Z",
				checks: {
					chat: {
						status: "bad",
						checked_at: "2026-05-18T00:00:01.000Z",
						checks: {
							openRouter: {
								status: "bad",
								checked_at: "2026-05-18T00:00:02.000Z",
							},
						},
					},
				},
			},
		});
		expect(queryMock).toHaveBeenCalledWith(
			expect.stringContaining("SELECT DISTINCT ON (service, component, check_name)"),
		);
	});

	it("returns 404 for unknown routes", async () => {
		const response = await worker.fetch(new Request("https://status.example.com/nope"), env);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Not found");
	});

	it("inserts an ok service check from the per-minute cron", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(
			Response.json({
				status: "healthy",
				site: {
					status: "healthy",
					checks: { database: { status: "healthy" } },
				},
				chat: {
					status: "healthy",
					checks: {
						database: { status: "healthy" },
						openRouter: { status: "healthy" },
					},
				},
			}),
		);
		const { ctx, waitForPromises } = createExecutionContext();

		await worker.scheduled({ cron: "* * * * *" } as ScheduledEvent, env, ctx);
		await waitForPromises();

		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO service_checks (service, component, check_name, status) VALUES ($1, $2, $3, $4)",
			["plumocracy", null, null, "ok"],
		);
		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO service_checks (service, component, check_name, status) VALUES ($1, $2, $3, $4)",
			["plumocracy", "site", "database", "ok"],
		);
		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO service_checks (service, component, check_name, status) VALUES ($1, $2, $3, $4)",
			["plumocracy", "chat", "openRouter", "ok"],
		);
		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO service_checks (service, component, check_name, status) VALUES ($1, $2, $3, $4)",
			["atom", null, null, "ok"],
		);
		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO service_checks (service, component, check_name, status) VALUES ($1, $2, $3, $4)",
			["atom", "site", null, "ok"],
		);
		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO service_checks (service, component, check_name, status) VALUES ($1, $2, $3, $4)",
			["atom", "chat", null, "ok"],
		);
		expect(resendSendMock).not.toHaveBeenCalled();
	});

	it("does not send email before five consecutive failed service checks", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(Response.json({ status: "bad" }, { status: 500 }));
		const { ctx, waitForPromises } = createExecutionContext();

		await worker.scheduled({ cron: "* * * * *" } as ScheduledEvent, env, ctx);
		await waitForPromises();

		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO service_checks (service, component, check_name, status) VALUES ($1, $2, $3, $4)",
			["plumocracy", null, null, "bad"],
		);
		expect(resendSendMock).not.toHaveBeenCalled();
	});

	it("sends email after five failed service checks and records the email", async () => {
		queryMock.mockImplementation((query: string, params?: unknown[]) => {
			if (query.includes("SELECT status")) {
				if (params?.[0] === "atom") {
					return Promise.resolve([{ status: "ok" }]);
				}

				return Promise.resolve([
					{ status: "bad" },
					{ status: "bad" },
					{ status: "bad" },
					{ status: "bad" },
					{ status: "bad" },
				]);
			}

			if (query.includes("SELECT EXISTS")) {
				return Promise.resolve([{ sent_recently: false }]);
			}

			return Promise.resolve([]);
		});
		vi.mocked(fetch).mockResolvedValueOnce(Response.json({ status: "bad" }, { status: 500 }));
		resendSendMock.mockResolvedValueOnce({ data: { id: "email_123" }, error: null });
		const { ctx, waitForPromises } = createExecutionContext();

		await worker.scheduled({ cron: "* * * * *" } as ScheduledEvent, env, ctx);
		await waitForPromises();

		expect(resendSendMock).toHaveBeenCalledWith({
			from: "status@status.plumocracy.com",
			to: "plum@plumocracy.com",
			subject: "plumocracy is fucked!",
			html: "go fix",
		});
		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO sent_emails (service, resend_id, error_msg) VALUES ($1, $2, $3)",
			["plumocracy", "email_123", null],
		);
	});

	it("does not send another email within an hour while service remains down", async () => {
		queryMock.mockImplementation((query: string, params?: unknown[]) => {
			if (query.includes("SELECT status")) {
				if (params?.[0] === "atom") {
					return Promise.resolve([{ status: "ok" }]);
				}

				return Promise.resolve([
					{ status: "bad" },
					{ status: "bad" },
					{ status: "bad" },
					{ status: "bad" },
					{ status: "bad" },
				]);
			}

			if (query.includes("SELECT EXISTS")) {
				return Promise.resolve([{ sent_recently: true }]);
			}

			return Promise.resolve([]);
		});
		vi.mocked(fetch).mockResolvedValueOnce(Response.json({ status: "bad" }, { status: 500 }));
		const { ctx, waitForPromises } = createExecutionContext();

		await worker.scheduled({ cron: "* * * * *" } as ScheduledEvent, env, ctx);
		await waitForPromises();

		expect(resendSendMock).not.toHaveBeenCalled();
	});

	it("runs cleanup from the Sunday midnight cron", async () => {
		const { ctx, waitForPromises } = createExecutionContext();

		await worker.scheduled({ cron: "0 0 * * SUN" } as ScheduledEvent, env, ctx);
		await waitForPromises();

		expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM service_checks"));
		expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("extract(dow from now())"));
	});
});
