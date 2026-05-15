import { beforeEach, describe, expect, it, vi } from 'vitest';

const getVisiblePostsMock = vi.fn();
const isUserAdminMock = vi.fn();

const dbMock = {
	select: vi.fn(),
	update: vi.fn(),
	insert: vi.fn(),
	delete: vi.fn()
};

vi.mock('$lib/server/blog', () => ({
	getVisiblePosts: getVisiblePostsMock
}));

vi.mock('$lib/server/user', () => ({
	isUserAdmin: isUserAdminMock
}));

vi.mock('$lib/server/db', () => ({
	db: dbMock
}));

vi.mock('$lib/server/db/blog.schema', () => ({
	posts: {
		id: 'id',
		title: 'title',
		body: 'body',
		publishedAt: 'publishedAt',
		authorId: 'authorId'
	}
}));

const listRoute = await import('./+server');
const detailRoute = await import('./[slug]/+server');
const newRoute = await import('./new/+server');
const deleteRoute = await import('./delete/[slug]/+server');
const publishRoute = await import('./publish/[slug]/+server');
const unpublishRoute = await import('./unpublish/[slug]/+server');

function createEvent<T extends object>(overrides: T): T {
	return overrides;
}

describe('blog api routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists visible posts with the current public response shape', async () => {
		const publishedAt = new Date('2026-01-02T00:00:00.000Z');
		const createdAt = new Date('2026-01-01T00:00:00.000Z');
		getVisiblePostsMock.mockResolvedValue([
			{ id: 1, title: 'Hello', summary: 'World', createdAt, publishedAt }
		]);

		const response = await listRoute.GET(
			createEvent({ url: new URL('https://example.com/api/v1/blog/posts') }) as Parameters<
				typeof listRoute.GET
			>[0]
		);
		const payload = await response.json();

		expect(getVisiblePostsMock).toHaveBeenCalledWith();
		expect(payload).toEqual({
			status: 200,
			posts: [
				{
					id: 1,
					title: 'Hello',
					summary: 'World',
					createdAt: createdAt.toISOString(),
					date: publishedAt.toISOString()
				}
			]
		});
	});

	it('passes numeric limit values through to visible post lookup', async () => {
		getVisiblePostsMock.mockResolvedValue([]);

		await listRoute.GET(
			createEvent({ url: new URL('https://example.com/api/v1/blog/posts?limit=5') }) as Parameters<
				typeof listRoute.GET
			>[0]
		);

		expect(getVisiblePostsMock).toHaveBeenCalledWith(5);
	});

	it('returns a post record by slug', async () => {
		const whereMock = vi.fn().mockResolvedValue([
			{ id: 4, title: 'Post', body: 'Body', publishedAt: null }
		]);
		const fromMock = vi.fn().mockReturnValue({ where: whereMock });
		dbMock.select.mockReturnValue({ from: fromMock });

		const response = await detailRoute.GET(
			createEvent({ params: { slug: '4' } }) as Parameters<typeof detailRoute.GET>[0]
		);
		const payload = await response.json();

		expect(payload).toEqual({
			status: 200,
			post: { id: 4, title: 'Post', body: 'Body', publishedAt: null }
		});
	});

	it('rejects patch updates for non-admin users', async () => {
		isUserAdminMock.mockResolvedValue(false);

		await expect(
			detailRoute.PATCH(
				createEvent({
				params: { slug: '4' },
				locals: { user: { id: 'u1' } },
				request: new Request('https://example.com', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: 'Post', body: 'Body' })
				})
				}) as Parameters<typeof detailRoute.PATCH>[0]
			)
		).rejects.toMatchObject({ status: 401 });
	});

	it('updates title and body through patch', async () => {
		isUserAdminMock.mockResolvedValue(true);
		const returningMock = vi.fn().mockResolvedValue([{ id: 4 }]);
		const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
		const setMock = vi.fn().mockReturnValue({ where: whereMock });
		dbMock.update.mockReturnValue({ set: setMock });

		const response = await detailRoute.PATCH(
			createEvent({
				params: { slug: '4' },
				locals: { user: { id: 'u1' } },
				request: new Request('https://example.com', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ title: 'Post', body: 'Body' })
				})
			}) as Parameters<typeof detailRoute.PATCH>[0]
		);
		const payload = await response.json();

		expect(setMock).toHaveBeenCalledWith({ title: 'Post', body: 'Body' });
		expect(payload).toEqual({ status: 200, postId: 4 });
	});

	it('creates a new blank post for admins', async () => {
		isUserAdminMock.mockResolvedValue(true);
		const returningMock = vi.fn().mockResolvedValue([{ id: 9 }]);
		const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
		dbMock.insert.mockReturnValue({ values: valuesMock });

		const response = await newRoute.POST(
			createEvent({ locals: { user: { id: 'author-1' } } }) as Parameters<typeof newRoute.POST>[0]
		);
		const payload = await response.json();

		expect(valuesMock).toHaveBeenCalledWith({ authorId: 'author-1', title: '', body: '' });
		expect(payload).toEqual({ status: 201, postId: 9 });
	});

	it('deletes posts for admins', async () => {
		isUserAdminMock.mockResolvedValue(true);
		const whereMock = vi.fn().mockResolvedValue(undefined);
		dbMock.delete.mockReturnValue({ where: whereMock });

		const response = await deleteRoute.DELETE(
			createEvent({
				locals: { user: { id: 'u1' } },
				params: { slug: '8' }
			}) as Parameters<typeof deleteRoute.DELETE>[0]
		);
		const payload = await response.json();

		expect(payload).toEqual({ status: 200 });
	});

	it('publishes posts for admins', async () => {
		isUserAdminMock.mockResolvedValue(true);
		const whereMock = vi.fn().mockResolvedValue(undefined);
		const setMock = vi.fn().mockReturnValue({ where: whereMock });
		dbMock.update.mockReturnValue({ set: setMock });

		const response = await publishRoute.POST(
			createEvent({
				locals: { user: { id: 'u1' } },
				params: { slug: '10' }
			}) as Parameters<typeof publishRoute.POST>[0]
		);
		const payload = await response.json();

		expect(setMock).toHaveBeenCalledWith({ publishedAt: expect.any(Date) });
		expect(payload).toEqual({ status: 201 });
	});

	it('unpublishes posts for admins', async () => {
		isUserAdminMock.mockResolvedValue(true);
		const whereMock = vi.fn().mockResolvedValue(undefined);
		const setMock = vi.fn().mockReturnValue({ where: whereMock });
		dbMock.update.mockReturnValue({ set: setMock });

		const response = await unpublishRoute.POST(
			createEvent({
				locals: { user: { id: 'u1' } },
				params: { slug: '10' }
			}) as Parameters<typeof unpublishRoute.POST>[0]
		);
		const payload = await response.json();

		expect(setMock).toHaveBeenCalledWith({ publishedAt: null });
		expect(payload).toEqual({ status: 200 });
	});
});
