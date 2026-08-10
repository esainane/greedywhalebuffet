import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from './vitest.config.ts';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			include: ['src/**/*.test.ts'],
			exclude: ['src/data.*.test.ts', 'src/e2e.schema.test.ts'],
		},
	}),
);
