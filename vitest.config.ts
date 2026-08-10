import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: 'data-schema',
					environment: 'node',
					include: ['src/data.schema.test.ts'],
				},
			},
			{
				test: {
					name: 'data',
					environment: 'node',
					include: ['src/**/data.*.test.ts'],
					exclude: ['src/data.schema.test.ts']
				},
			},
			{
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.test.ts'],
					exclude: ['src/**/data.*.test.ts', 'src/e2e.schema.test.ts', 'src/e2e.schema.test.ts']
				},
			},
			{
				test: {
					name: 'e2e-export',
					environment: 'node',
					include: ['src/e2e.schema.test.ts']
				},
			},
			{
				test: {
					name: 'ui',
					environment: 'jsdom',
					include: ['src/**/*.test.tsx'],
				},
			},
		],
	},
});
