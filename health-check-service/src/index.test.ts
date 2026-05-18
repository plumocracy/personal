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
		resendSendMock.mockReset();
		vi.stubGlobal("fetch", vi.fn());
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
			{ service: "plumocracy", status: "ok", checked_at: "2026-05-18T00:00:00.000Z" },
		]);

		const response = await worker.fetch(new Request("https://status.example.com/status"), env);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			plumocracy: {
				status: "ok",
				checked_at: "2026-05-18T00:00:00.000Z",
			},
		});
		expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("SELECT DISTINCT ON (service)"));
	});

	it("returns 404 for unknown routes", async () => {
		const response = await worker.fetch(new Request("https://status.example.com/nope"), env);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Not found");
	});

	it("inserts an ok service check from the per-minute cron", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(Response.json({ status: "ok" }));
		const { ctx, waitForPromises } = createExecutionContext();

		await worker.scheduled({ cron: "* * * * *" } as ScheduledEvent, env, ctx);
		await waitForPromises();

		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO service_checks (service, status) VALUES ($1, $2)",
			["plumocracy", "ok"],
		);
		expect(resendSendMock).not.toHaveBeenCalled();
	});

	it("inserts a bad check, sends email, and records the email", async () => {
		vi.mocked(fetch).mockResolvedValueOnce(Response.json({ status: "bad" }, { status: 500 }));
		resendSendMock.mockResolvedValueOnce({ data: { id: "email_123" }, error: null });
		const { ctx, waitForPromises } = createExecutionContext();

		await worker.scheduled({ cron: "* * * * *" } as ScheduledEvent, env, ctx);
		await waitForPromises();

		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO service_checks (service, status) VALUES ($1, $2)",
			["plumocracy", "bad"],
		);
		expect(resendSendMock).toHaveBeenCalledWith({
			from: "status@status.plumocracy.com",
			to: "plum@plumocracy.com",
			subject: "plumocracy is fucked!",
			html: "go fix",
		});
		expect(queryMock).toHaveBeenCalledWith(
			"INSERT INTO sent_emails (resend_id, error_msg) VALUES ($1, $2)",
			["email_123", null],
		);
	});

	it("runs cleanup from the Sunday midnight cron", async () => {
		const { ctx, waitForPromises } = createExecutionContext();

		await worker.scheduled({ cron: "0 0 * * SUN" } as ScheduledEvent, env, ctx);
		await waitForPromises();

		expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM service_checks"));
		expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("extract(dow from now())"));
	});
});
