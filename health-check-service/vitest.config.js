import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		{
			name: "raw-html-imports",
			transform(source, id) {
				if (!id.endsWith(".html")) {
					return null;
				}

				return `export default ${JSON.stringify(source)};`;
			},
		},
	],
});
