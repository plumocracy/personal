import { readFile } from 'node:fs/promises';

const envFiles = ['.env', '.env.local'];

async function main() {
	const values = [];

	for (const file of envFiles) {
		const value = await readDatabaseUrl(file);

		if (value) {
			values.push({ file, value });
		}
	}

	if (values.length === 0) {
		console.log('No DATABASE_URL found in .env or .env.local');
		return;
	}

	const winner = values.at(-1);

	console.log('DATABASE_URL resolution:');
	for (const entry of values) {
		console.log(`- ${entry.file}: ${maskDatabaseUrl(entry.value)}`);
	}

	console.log('');
	console.log(`Active source: ${winner.file}`);
	console.log(`Active DATABASE_URL: ${maskDatabaseUrl(winner.value)}`);
}

async function readDatabaseUrl(file) {
	try {
		const contents = await readFile(file, 'utf8');
		return extractDatabaseUrl(contents);
	} catch {
		return null;
	}
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
