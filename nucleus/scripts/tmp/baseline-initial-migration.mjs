import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const migrationIndex = Number(process.argv[2] ?? 0);
const journalPath = 'drizzle/meta/_journal.json';

async function main() {
	const databaseUrl = process.env.DATABASE_URL ?? (await readDatabaseUrl());

	if (!databaseUrl) {
		throw new Error('DATABASE_URL was not found in the environment, .env, or .env.local');
	}

	const journal = JSON.parse(await readFile(journalPath, 'utf8'));
	const entry = journal.entries?.[migrationIndex];

	if (!entry) {
		throw new Error(`No migration journal entry found at index ${migrationIndex}`);
	}

	const migrationPath = `drizzle/${entry.tag}.sql`;
	const migrationSql = await readFile(migrationPath, 'utf8');
	const hash = createHash('sha256').update(migrationSql).digest('hex');
	const sql = neon(databaseUrl);

	console.log(`Baselining ${entry.tag} on ${maskDatabaseUrl(databaseUrl)}`);

	await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
	await sql`
		CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
			id serial PRIMARY KEY,
			hash text NOT NULL,
			created_at bigint
		)
	`;

	const existingRows = await sql`
		SELECT id, hash, created_at
		FROM drizzle.__drizzle_migrations
		WHERE hash = ${hash}
		LIMIT 1
	`;

	if (existingRows.length > 0) {
		console.log(`Migration ${entry.tag} is already baselined.`);
		return;
	}

	await sql`
		INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
		VALUES (${hash}, ${entry.when})
	`;

	console.log(`Baselined ${entry.tag} in drizzle.__drizzle_migrations.`);
}

async function readDatabaseUrl() {
	let databaseUrl = null;

	for (const file of ['.env', '.env.local']) {
		try {
			const contents = await readFile(file, 'utf8');
			databaseUrl = extractDatabaseUrl(contents) ?? databaseUrl;
		} catch {
			// Missing env files are fine as long as a later source provides DATABASE_URL.
		}
	}

	return databaseUrl;
}

function extractDatabaseUrl(contents) {
	for (const rawLine of contents.split(/\r?\n/)) {
		const line = rawLine.trim();

		if (!line || line.startsWith('#')) {
			continue;
		}

		const [key, ...rest] = line.split('=');

		if (key !== 'DATABASE_URL') {
			continue;
		}

		return rest.join('=').trim().replace(/^"|"$/g, '');
	}

	return null;
}

function maskDatabaseUrl(value) {
	try {
		const url = new URL(value);
		if (url.password) {
			url.password = '***';
		}
		return url.toString();
	} catch {
		return '[unparseable DATABASE_URL]';
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
