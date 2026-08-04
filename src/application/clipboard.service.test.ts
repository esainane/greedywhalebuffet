import { describe, expect, it, vi } from 'vitest';
import { ClipboardUnavailableError } from './browser-adapters.js';
import { copyGeneratedScript } from './services.js';
import type { ClipboardPort } from './ports.js';
import type { GenerationResult } from '../types.js';

function buildGenerationResult(): GenerationResult {
	return {
		script: [{ id: '_meta', name: 'Test Script' }, 'washerwoman'],
		scriptName: 'Test Script',
		diagnostics: [],
	};
}

describe('clipboard service', () => {
	it('returns missing_generation when there is no generation output', async () => {
		const clipboard: ClipboardPort = {
			writeText: vi.fn(async () => undefined),
		};

		const result = await copyGeneratedScript(clipboard, null);
		expect(result).toEqual({ kind: 'missing_generation' });
		expect(clipboard.writeText).not.toHaveBeenCalled();
	});

	it('writes generated script JSON to clipboard', async () => {
		const clipboard: ClipboardPort = {
			writeText: vi.fn(async () => undefined),
		};

		const result = await copyGeneratedScript(clipboard, buildGenerationResult());
		expect(result).toEqual({ kind: 'copied' });
		expect(clipboard.writeText).toHaveBeenCalledWith(
			JSON.stringify(buildGenerationResult().script, null, 2),
		);
	});

	it('maps clipboard unavailability to a structured error', async () => {
		const clipboard: ClipboardPort = {
			writeText: vi.fn(async () => {
				throw new ClipboardUnavailableError();
			}),
		};

		const result = await copyGeneratedScript(clipboard, buildGenerationResult());
		expect(result.kind).toBe('error');
		if (result.kind === 'error') {
			expect(result.error.code).toBe('clipboard_unavailable');
		}
	});
});
