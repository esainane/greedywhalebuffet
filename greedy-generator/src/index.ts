const DUPLICATE_LINE = 'Duplicate characters might be in play.';
const REMOVED_CHARACTERS_PREFIX = 'The following characters are not available: ';
const GREEDY_JSON_URL = './greedy.json';
const ROLES_JSON_URL = './roles.json';
const FILTERABLE_TEAMS = new Set(['townsfolk', 'outsider', 'minion', 'demon']);
const COMMON_BANS = [
    'atheist',
    'bountyhunter',
    'cultleader_popppp',
    'heretic_popppp',
    'goon',
    'pithag_ultimate',
    'wizard_popppp',
    'legion_popppp',
    'leviathan_popppp',
    'zombuul'
];

type IdMappings = Record<string, string>;

type MetaEntry = {
	id?: string;
	name?: string;
	bootlegger?: string[];
};

type CharacterEntry = {
	id: string;
	name: string;
	image?: string[];
	team?: string;
	[key: string]: unknown;
};

type ScriptData = (MetaEntry | CharacterEntry | string)[];

type Character = {
	id: string;
	name: string;
	imageUrl?: string | Array<string>;
};

type GenerationOptions = {
	appendDuplicateLine: boolean;
	alejoRules: boolean;
	listOfficialJinxes: boolean;
	revertRecluseMarionetteJinx: boolean;
	revertMathematicianJinxes: boolean;
	listGreedyJinxes: boolean;
};

function requireElement<T extends Element>(selector: string, ctor: { new (): T }): T {
	const element = document.querySelector(selector);

	if (!(element instanceof ctor)) {
		throw new Error(`Expected element ${selector} to be a ${ctor.name}.`);
	}

	return element;
}

const form = requireElement('#copy-form', HTMLFormElement);
const appendDuplicateLineInput = requireElement('#append-duplicate-line', HTMLInputElement);
const alejoRulesInput = requireElement('#alejo-rules', HTMLInputElement);
const listOfficialJinxesInput = requireElement('#list-official-jinxes', HTMLInputElement);
const revertRecluseMarionetteJinxInput = requireElement('#revert-recluse-marionette-jinx', HTMLInputElement);
const revertMathematicianJinxesInput = requireElement('#revert-mathematician-jinxes', HTMLInputElement);
const listGreedyJinxesInput = requireElement('#list-greedy-jinxes', HTMLInputElement);
const reloadButton = requireElement('#reload-button', HTMLButtonElement);
const statusElement = requireElement('#status', HTMLParagraphElement);
const scriptName = requireElement('#script-name', HTMLElement);
const characterCount = requireElement('#character-count', HTMLElement);
const quickRemoveList = requireElement('#quick-remove-list', HTMLDivElement);
const characterList = requireElement('#character-list', HTMLDivElement);

const allOptionInputs = [
	appendDuplicateLineInput,
	alejoRulesInput,
	listOfficialJinxesInput,
	revertRecluseMarionetteJinxInput,
	revertMathematicianJinxesInput,
	listGreedyJinxesInput,
];

const officialJinxDependentInputs = [
	revertRecluseMarionetteJinxInput,
	revertMathematicianJinxesInput,
];

let latestJson: ScriptData | null = null;
let rolesData: CharacterEntry[] | null = null;
const selectedCharacterIds = new Set<string>();

function setStatus(message: string, tone: 'info' | 'success' | 'error' = 'info'): void {
	statusElement.textContent = message;
	statusElement.dataset.tone = tone;
}

function cloneJson(value: ScriptData): ScriptData {
	return structuredClone(value);
}

function getMetaEntry(data: ScriptData): MetaEntry | null {
	return Array.isArray(data) ? data[0] as MetaEntry ?? null : null;
}

function getCharacters(data: ScriptData, roles: CharacterEntry[] | null): Character[] {
	const characters: Character[] = [];

	for (let i = 1; i < data.length; i++) {
		const entry = data[i];

		if (typeof entry === 'string') {
			// Simple string ID - look up in roles.json
			const roleEntry = roles?.find(r => r.id === entry);
			const team = roleEntry?.team as string | undefined;
			
			// Only include if team is valid
			if (!team || !FILTERABLE_TEAMS.has(team)) {
				continue;
			}

			const name = roleEntry?.name || (entry.charAt(0).toUpperCase() + entry.slice(1));
			const roleImage = roleEntry?.image;
			let imageUrl: string | undefined;
			if (typeof roleImage === 'string') {
				imageUrl = roleImage;
			} else if (Array.isArray(roleImage)) {
				imageUrl = roleImage[0];
			} else {
				// Fallback to Klutzbanana URL
                // Work out whether to ask for g or e as the standard image
                const team_id = ['townsfolk', 'outsider'].includes(team) ? 'g' : 'e';
				imageUrl = `https://images.klutzbanana.com/characters_official/${entry}_${team_id}.png`;
			}

			characters.push({
				id: entry,
				name,
				imageUrl,
			});
		} else if (typeof entry === 'object' && entry !== null && 'id' in entry) {
			const charEntry = entry as CharacterEntry;
			
			// Skip the "Choose your characters" pseudo-character
			if (charEntry.id === 'choose_your_chars') {
				continue;
			}

			// Only include characters with valid team types
			if (!charEntry.team || !FILTERABLE_TEAMS.has(charEntry.team)) {
				continue;
			}

			const imageUrl = Array.isArray(charEntry.image) ? charEntry.image[0] : undefined;
			characters.push({
				id: charEntry.id,
				name: charEntry.name || charEntry.id,
				imageUrl,
			});
		}
	}

	return characters;
}

function splitCharactersByCommonBans(characters: Character[]): { quickRemove: Character[]; remaining: Character[] } {
	const quickRemove: Character[] = [];
	const remaining: Character[] = [];

	for (const character of characters) {
		if (COMMON_BANS.includes(character.id)) {
			quickRemove.push(character);
		} else {
			remaining.push(character);
		}
	}

	return { quickRemove, remaining };
}


function getGenerationOptions(): GenerationOptions {
	return {
		appendDuplicateLine: appendDuplicateLineInput.checked,
		alejoRules: alejoRulesInput.checked,
		listOfficialJinxes: listOfficialJinxesInput.checked,
		revertRecluseMarionetteJinx: revertRecluseMarionetteJinxInput.checked,
		revertMathematicianJinxes: revertMathematicianJinxesInput.checked,
		listGreedyJinxes: listGreedyJinxesInput.checked,
	};
}

function syncOfficialJinxDependencies(): void {
	const isEnabled = listOfficialJinxesInput.checked;

	for (const input of officialJinxDependentInputs) {
		input.disabled = !isEnabled;
		if (!isEnabled) {
			input.checked = false;
		}

		const toggle = input.closest('.toggle');
		if (toggle) {
			toggle.classList.toggle('is-disabled', !isEnabled);
		}
	}
}

function applyDuplicateLine(data: ScriptData): void {
	const metaEntry = getMetaEntry(data);
	if (!metaEntry) {
		return;
	}

	metaEntry.bootlegger = [...metaEntry.bootlegger ?? [], DUPLICATE_LINE];
}

function applyAlejoRules(_data: ScriptData): void {
	// TODO: Implement Alejo first-night ordering adjustments.
}

function applyOfficialJinxes(_data: ScriptData): void {
	// TODO: Implement official vanilla BotC jinx injection.
}

function revertRecluseMarionetteJinx(_data: ScriptData): void {
	// TODO: Implement Recluse-Marionette jinx revert.
}

function revertMathematicianJinxes(_data: ScriptData): void {
	// TODO: Implement deterministic Mathematician jinx reverts.
}

function applyGreedyJinxes(_data: ScriptData): void {
	// TODO: Implement Greedy Whalebuffet jinx injection.
}

function applyOptions(data: ScriptData, options: GenerationOptions): void {
	if (options.appendDuplicateLine) {
		applyDuplicateLine(data);
	}

	if (options.alejoRules) {
		applyAlejoRules(data);
	}

	if (options.listOfficialJinxes) {
		applyOfficialJinxes(data);

		if (options.revertRecluseMarionetteJinx) {
			revertRecluseMarionetteJinx(data);
		}

		if (options.revertMathematicianJinxes) {
			revertMathematicianJinxes(data);
		}
	}

	if (options.listGreedyJinxes) {
		applyGreedyJinxes(data);
	}
}

function buildCopyPayload(data: ScriptData): string {
	const options = getGenerationOptions();
	const nextData = cloneJson(data);
	const metaEntry = getMetaEntry(nextData);
	const removedCharacterNames: string[] = [];

	// Filter out deselected characters
	const filteredData: ScriptData = [nextData[0] as MetaEntry]; // Keep metadata
	for (let i = 1; i < nextData.length; i++) {
		const entry = nextData[i];
		let entryId: string | undefined;
		let entryName: string | undefined;
		let shouldAlwaysInclude = false;
		let isFilterableCharacter = false;

		if (typeof entry === 'string') {
			entryId = entry;
			entryName = rolesData?.find((role) => role.id === entry)?.name ?? entry;
			const roleTeam = rolesData?.find((role) => role.id === entry)?.team;
			isFilterableCharacter = !!roleTeam && FILTERABLE_TEAMS.has(roleTeam);
		} else if (typeof entry === 'object' && entry !== null && 'id' in entry) {
			entryId = (entry as CharacterEntry).id;
			entryName = (entry as CharacterEntry).name || entryId;
			shouldAlwaysInclude = entryId === 'choose_your_chars';
			const entryTeam = (entry as CharacterEntry).team;
			isFilterableCharacter = !!entryTeam && FILTERABLE_TEAMS.has(entryTeam);
		}

		if (!isFilterableCharacter || shouldAlwaysInclude || (entryId && selectedCharacterIds.has(entryId))) {
			filteredData.push(entry);
		} else if (isFilterableCharacter && entryId && entryName) {
			removedCharacterNames.push(entryName);
		}
	}

	if (metaEntry && removedCharacterNames.length > 0) {
		const bootlegger = Array.isArray(metaEntry.bootlegger) ? metaEntry.bootlegger : [];
		bootlegger.push(`${REMOVED_CHARACTERS_PREFIX}${removedCharacterNames.join(', ')}`);
		metaEntry.bootlegger = bootlegger;
	}

	applyOptions(filteredData, options);

	return JSON.stringify(filteredData, null, 2);
}

function renderCharacters(characters: Character[]): void {
	const { quickRemove, remaining } = splitCharactersByCommonBans(characters);
	renderCharacterList(quickRemoveList, quickRemove, true);
	renderCharacterList(characterList, remaining, false);
}

function renderCharacterList(container: HTMLDivElement, characters: Character[], isQuickRemove = false): void {
	if (characters.length === 0) {
		container.innerHTML = `<p class="status">${isQuickRemove ? 'No common bans in this script.' : 'No characters available.'}</p>`;
		return;
	}

	container.innerHTML = '';

	for (const character of characters) {
		const label = document.createElement('label');
		label.className = `character-item ${isQuickRemove ? 'quick-remove-item' : ''} ${selectedCharacterIds.has(character.id) ? '' : 'disabled'}`;

		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.value = character.id;
		checkbox.checked = selectedCharacterIds.has(character.id);
		checkbox.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			if (target.checked) {
				selectedCharacterIds.add(character.id);
			} else {
				selectedCharacterIds.delete(character.id);
			}
			label.classList.toggle('disabled', !target.checked);
			updateCharacterCount();
		});

		label.appendChild(checkbox);

		if (character.imageUrl) {
            let src: string;
            const urlDef: string | Array<string> = character.imageUrl;
            if (Array.isArray(urlDef)) {
                src = urlDef[0];
            } else {
                src = urlDef;
            }
			const img = document.createElement('img');
			img.src = src;
			img.alt = character.name;
			img.className = 'character-icon';
			label.appendChild(img);
		}

		const nameEl = document.createElement('span');
		nameEl.className = 'character-name';
		nameEl.textContent = character.name;
		label.appendChild(nameEl);

		container.appendChild(label);
	}
}

function updateCharacterCount(): void {
	characterCount.textContent = String(selectedCharacterIds.size);
}

function renderPreview(): void {
	// TODO
}

async function loadLatestJson(): Promise<void> {
	setStatus('Loading latest script...');

	const [latestResponse, rolesResponse] = await Promise.all([
		fetch(GREEDY_JSON_URL, { cache: 'no-store' }),
		fetch(ROLES_JSON_URL, { cache: 'no-store' }),
	]);

	if (!latestResponse.ok) {
		throw new Error(`Failed to load latest.json (${latestResponse.status})`);
	}

	const latestParsed = (await latestResponse.json()) as unknown;
	if (!Array.isArray(latestParsed)) {
		throw new Error('latest.json has an unexpected shape.');
	}

	latestJson = latestParsed as ScriptData;

	if (!rolesResponse.ok) {
        throw new Error(`Failed to load roles.json (${rolesResponse.status})`);
    }
	const parsedRoles = (await rolesResponse.json()) as unknown;
	if (!Array.isArray(parsedRoles)) {
        throw new Error('roles.json has an unexpected shape.');
    }
	rolesData = parsedRoles as CharacterEntry[];

	const metaEntry = getMetaEntry(latestJson);
	scriptName.textContent = metaEntry?.name ?? 'Unknown script';

	const characters = getCharacters(latestJson, rolesData);
	selectedCharacterIds.clear();
	for (const char of characters) {
		selectedCharacterIds.add(char.id);
	}
	renderCharacters(characters);
	updateCharacterCount();

	renderPreview();
	setStatus('Script loaded.', 'success');
}

async function copyJson(event: SubmitEvent): Promise<void> {
	event.preventDefault();

	if (!latestJson) {
		setStatus('Load latest.json before copying.', 'error');
		return;
	}

	const payload = buildCopyPayload(latestJson);

	await navigator.clipboard.writeText(payload);
	setStatus('Copied!', 'success');
}

for (const input of allOptionInputs) {
	input.addEventListener('change', () => {
		if (input === listOfficialJinxesInput) {
			syncOfficialJinxDependencies();
		}
		renderPreview();
	});
}

syncOfficialJinxDependencies();

reloadButton.addEventListener('click', async () => {
	try {
		await loadLatestJson();
	} catch (error: unknown) {
		setStatus(error instanceof Error ? error.message : 'Unable to reload latest.json.', 'error');
	}
});

form.addEventListener('submit', async (event) => {
	try {
		await copyJson(event as SubmitEvent);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Copy failed.';
		setStatus(message, 'error');
	}
});

async function bootstrap(): Promise<void> {
	try {
		await loadLatestJson();
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : 'Unable to load latest.json.';
		setStatus(message, 'error');
	}
}

void bootstrap();