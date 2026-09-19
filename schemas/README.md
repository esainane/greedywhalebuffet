# Schema sources

- [schemas/script-schema.json](script-schema.json): Snapshot of script schema as specified by TPI. Used for files intended to be usable as full scripts. Exact copy of [script-schema.json](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/script-schema.json) in TPI's repository.
- [schemas/roles-schema.json](roles-schema.json): Schema for supplementary data files not intended to be used as standalone scripts, but instead to serve as a list of character definitions. Upstream script-schema.json, but with `_meta`, bare ID references, and legacy character definitions removed.
- [schemas/jinx-schema.json](jinx-schema.json): Schema for jinx definitions. The jinx array typing and examples are as inline character jinx definitions in script-schema.json, but listed on `jinx` instead of `jinxes` to match TPI's supplied jinxes.json.
- [schemas/almanac-schema.json](almanac-schema.json): Schema for on-site character almanacs.

Regenerate derived schemas with:

- `pnpm tool:generate-schema`
