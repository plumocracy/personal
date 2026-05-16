import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const envFiles = process.env.DATABASE_URL ? [] : ['.env', '.env.local'];
const drizzleCommand = process.argv[2] ?? 'push';
const extraArgs = process.argv.slice(3);

async function main() {
	const databaseUrl = process.env.DATABASE_URL ?? (await readDatabaseUrl());

	if (!databaseUrl) {
		throw new Error('DATABASE_URL was not found in the environment, .env, or .env.local');
	}

	await new Promise((resolve, reject) => {
		const child = spawn('npx', ['drizzle-kit', drizzleCommand, ...extraArgs], {
			stdio: 'inherit',
			env: {
				...process.env,
				DATABASE_URL: databaseUrl
			}
		});

		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`drizzle-kit ${drizzleCommand} exited with code ${code ?? 'unknown'}`));
		});

		child.on('error', reject);
	});
}

async function readDatabaseUrl() {
	let databaseUrl = null;

	for (const file of envFiles) {
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

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
