import { describe, expect, it } from 'vitest';
import { CatalogLoadingService } from './services.js';
import type { CatalogRepository } from './ports.js';
import { createTestCatalog } from '../test-helpers.js';

function abortedError(): Error {
	const error = new Error('Aborted');
	error.name = 'AbortError';
	return error;
}

describe('catalog loading service', () => {
	it('retains stale data when a reload fails after a successful load', async () => {
		const catalogA = createTestCatalog({
			baseScript: [{ id: '_meta', name: 'A' }, 'washerwoman'],
		});
		let callCount = 0;
		const repository: CatalogRepository = {
			async load(): Promise<ReturnType<typeof createTestCatalog>> {
				callCount += 1;
				if (callCount === 1) {
					return catalogA;
				}
				throw new Error('Network down');
			},
		};
		let nowValue = 100;
		const service = new CatalogLoadingService(repository, () => {
			const value = nowValue;
			nowValue += 100;
			return value;
		});

		const first = await service.reload();
		expect(first.kind).toBe('success');

		const second = await service.reload();
		expect(second.kind).toBe('stale');
		if (second.kind === 'stale') {
			expect(second.catalog).toBe(catalogA);
			expect(second.loadedAt).toBe(100);
			expect(second.error.code).toBe('load_failed');
		}
	});

	it('aborts a previous in-flight load when a new reload starts', async () => {
		const catalogB = createTestCatalog({
			baseScript: [{ id: '_meta', name: 'B' }, 'librarian'],
		});
		let callCount = 0;
		const repository: CatalogRepository = {
			load(signal?: AbortSignal): Promise<ReturnType<typeof createTestCatalog>> {
				callCount += 1;
				if (callCount === 1) {
					return new Promise((resolve, reject) => {
						if (!signal) {
							reject(new Error('signal was required for cancellation test'));
							return;
						}
						signal.addEventListener(
							'abort',
							() => reject(abortedError()),
							{ once: true },
						);
					});
				}

				return Promise.resolve(catalogB);
			},
		};
		const service = new CatalogLoadingService(repository);

		const firstLoad = service.reload();
		const secondLoad = service.reload();

		const second = await secondLoad;
		expect(second.kind).toBe('success');
		if (second.kind === 'success') {
			expect(second.catalog).toBe(catalogB);
		}

		const first = await firstLoad;
		expect(first.kind).toBe('aborted');
	});
});
