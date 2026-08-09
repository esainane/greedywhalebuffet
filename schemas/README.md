# Schema sources

- [schemas/script-schema.json](script-schema.json): Snapshot of script schema as specified by TPI. Exact copy of [script-schema.json](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/script-schema.json) in TPI's repository.
- [schemas/script-extra-schema.json](script-extra-schema.json): Schema for supplementary data files not intended to be used as standalone scripts, but instead to serve as a list of character definitions. Upstream script-schema.json, but with `_meta`, bare ID references, and legacy character definitions removed.
- [schemas/jinx-schema.json](jinx-schema.json): Schema for jinx definitions. The jinx array typing and examples are as inline character jinx definitions in script-schema.json, but listed on `jinx` instead of `jinxes` to match TPI's supplied jinxes.json.
