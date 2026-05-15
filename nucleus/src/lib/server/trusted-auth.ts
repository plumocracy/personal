import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { trustedAuthCode, user } from '$lib/server/db/schema';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

const DEFAULT_CODE_TTL_SECONDS = 60;

type TrustedCodeExchangeIdentity = {
	issuer: string;
	sub: string;
	email: string;
	email_verified: boolean;
	name: string;
	avatar_url: string | null;
};

function getRequiredEnv(name: keyof typeof env) {
	const value = env[name];

	if (!value) {
		throw new Error(`${name} is not set`);
	}

	return value;
}

function getTrustedClientConfig() {
	return {
		clientId: getRequiredEnv('TRUSTED_GIT_APP_CLIENT_ID'),
		clientSecret: getRequiredEnv('TRUSTED_GIT_APP_CLIENT_SECRET'),
		redirectUri: getRequiredEnv('TRUSTED_GIT_APP_REDIRECT_URI'),
		issuer: getRequiredEnv('ORIGIN'),
		codeTtlSeconds: Number(env.TRUSTED_GIT_APP_CODE_TTL_SECONDS ?? DEFAULT_CODE_TTL_SECONDS)
	};
}

function encodeBase64Url(bytes: Uint8Array) {
	const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function normalizeInternalPath(value: string | null | undefined) {
	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return '/';
	}

	return value;
}

export function assertTrustedClient(clientId: string | null, redirectUri: string | null) {
	const config = getTrustedClientConfig();

	if (!clientId || !redirectUri) {
		throw error(400, 'Missing client_id or redirect_uri');
	}

	if (clientId !== config.clientId || redirectUri !== config.redirectUri) {
		throw error(400, 'Unrecognized client configuration');
	}

	return config;
}

async function hashCode(code: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(left: string, right: string) {
	if (left.length !== right.length) {
		return false;
	}

	let diff = 0;

	for (let index = 0; index < left.length; index += 1) {
		diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}

	return diff === 0;
}

export async function createTrustedAuthCode(input: {
	clientId: string;
	redirectUri: string;
	userId: string;
}) {
	const config = getTrustedClientConfig();
	const codeBytes = crypto.getRandomValues(new Uint8Array(32));
	const code = encodeBase64Url(codeBytes);
	const now = Date.now();
	const ttlSeconds =
		Number.isFinite(config.codeTtlSeconds) && config.codeTtlSeconds > 0
			? config.codeTtlSeconds
			: DEFAULT_CODE_TTL_SECONDS;

	await db.insert(trustedAuthCode).values({
		id: crypto.randomUUID(),
		codeHash: await hashCode(code),
		clientId: input.clientId,
		redirectUri: input.redirectUri,
		userId: input.userId,
		expiresAt: new Date(now + ttlSeconds * 1000)
	});

	return code;
}

function parseBasicAuth(header: string | null) {
	if (!header?.startsWith('Basic ')) {
		return null;
	}

	const decoded = atob(header.slice(6));
	const separatorIndex = decoded.indexOf(':');

	if (separatorIndex === -1) {
		return null;
	}

	return {
		clientId: decoded.slice(0, separatorIndex),
		clientSecret: decoded.slice(separatorIndex + 1)
	};
}

export async function parseTrustedExchangeRequest(request: Request) {
	const contentType = request.headers.get('content-type') ?? '';
	const basicAuth = parseBasicAuth(request.headers.get('authorization'));
	let code: string | null = null;
	let redirectUri: string | null = null;
	let clientId = basicAuth?.clientId ?? null;
	let clientSecret = basicAuth?.clientSecret ?? null;

	if (contentType.includes('application/json')) {
		const body = await request.json();
		code = typeof body.code === 'string' ? body.code : null;
		redirectUri = typeof body.redirect_uri === 'string' ? body.redirect_uri : null;
		clientId ??= typeof body.client_id === 'string' ? body.client_id : null;
		clientSecret ??= typeof body.client_secret === 'string' ? body.client_secret : null;
	} else {
		const body = await request.formData();
		code = body.get('code')?.toString() ?? null;
		redirectUri = body.get('redirect_uri')?.toString() ?? null;
		clientId ??= body.get('client_id')?.toString() ?? null;
		clientSecret ??= body.get('client_secret')?.toString() ?? null;
	}

	return {
		code,
		redirectUri,
		clientId,
		clientSecret
	};
}

export async function exchangeTrustedAuthCode(input: {
	code: string | null;
	clientId: string | null;
	clientSecret: string | null;
	redirectUri: string | null;
}): Promise<TrustedCodeExchangeIdentity> {
	const config = assertTrustedClient(input.clientId, input.redirectUri);

	if (!input.code || !input.clientSecret) {
		throw error(400, 'Missing code or client_secret');
	}

	if (!safeEqual(input.clientSecret, config.clientSecret)) {
		throw error(401, 'Invalid client credentials');
	}

	const now = new Date();
	const [record] = await db
		.select({ id: trustedAuthCode.id, userId: trustedAuthCode.userId })
		.from(trustedAuthCode)
		.where(
			and(
				eq(trustedAuthCode.codeHash, await hashCode(input.code)),
				eq(trustedAuthCode.clientId, config.clientId),
				eq(trustedAuthCode.redirectUri, config.redirectUri),
				isNull(trustedAuthCode.usedAt),
				gt(trustedAuthCode.expiresAt, now)
			)
		)
		.limit(1);

	if (!record) {
		throw error(400, 'Invalid or expired code');
	}

	const [usedCode] = await db
		.update(trustedAuthCode)
		.set({ usedAt: now })
		.where(and(eq(trustedAuthCode.id, record.id), isNull(trustedAuthCode.usedAt)))
		.returning({ id: trustedAuthCode.id });

	if (!usedCode) {
		throw error(400, 'Invalid or expired code');
	}

	const [trustedUser] = await db
		.select({
			id: user.id,
			email: user.email,
			emailVerified: user.emailVerified,
			name: user.name,
			image: user.image
		})
		.from(user)
		.where(eq(user.id, record.userId))
		.limit(1);

	if (!trustedUser) {
		throw error(404, 'User not found');
	}

	return {
		issuer: config.issuer,
		sub: trustedUser.id,
		email: trustedUser.email,
		email_verified: trustedUser.emailVerified,
		name: trustedUser.name,
		avatar_url: trustedUser.image ?? null
	};
}
