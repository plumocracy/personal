import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const envFile = process.env.NEON_DEV_DB_ENV_FILE ?? '.env.neon-dev';
const drizzleCommand = process.argv[2] ?? 'push';

async function main() {
	const envContents = await readFile(envFile, 'utf8');
	const databaseUrl = extractDatabaseUrl(envContents);

	if (!databaseUrl) {
		throw new Error(`DATABASE_URL was not found in ${envFile}`);
	}

	await new Promise((resolve, reject) => {
		const child = spawn('npx', ['drizzle-kit', drizzleCommand], {
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

		const value = rest.join('=').trim();
		return value.replace(/^"|"$/g, '');
	}

	return null;
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
