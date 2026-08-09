# Layout

In rough order of officialness and data flow:

- [static/data_sources_manifest.json](data_sources_manifest.json): Manifest of all external data sources used to generate the script. Each source is a JSON file with a schema and a URL. The manifest is used to validate that all sources are present, well-formed, and up-to-date.
- [static/roles.json](roles.json): Snapshot of base characters as specified by TPI. Exact copy of roles.json in TPI's [botc-release](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/roles.json). Used to:
  - Inflate a character from a simple ID reference for custom modification.
  - List changes made to official characters on the front page.
- [static/nightsheet.json](nightsheet.json): Snapshot of night order as specified by TPI. Exact copy of nightsheet.json in TPI's [botc-release](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/nightsheet.json). Used to:
  - Specify night order in-record when inflating characters, rather than being implicit from a night order array. TPI's schema sets a hard limit on the number of characters which can be in a night order array, and it is much lower than what we need for a buffet script.
- [static/jinxes.json](jinxes.json): Snapshot of jinxes as specified by TPI. Exact copy of jinxes.json in TPI's [botc-release](https://github.com/ThePandemoniumInstitute/botc-release/blob/main/resources/data/jinxes.json). Used to:
  - Validate custom jinxes between characters match upstream order.
  - List changes made to official jinxes on the front page.
- [static/id_mappings.json](id_mappings.json): Map custom greedy character IDs to their official TPI counterparts.
- [static/greedy.json](greedy.json): Greedy character definitions. Includes custom modifications to official characters. Does not include jinxes, or Greedier homebrew characters. Usable as a standalone script file.
- [static/greedy_jinxes.json](greedy_jinxes.json): Greedy jinx definitions. All custom jinxes which do not include Greedier homebrew characters. Empty reasons denote removal of an upstream jinx.
- [static/greedier_jinxes.json](greedier_jinxes.json): Greedier jinx definitions. All custom jinxes which involve Greedier homebrew characters.
- [static/greedier/*.json](greedier): Greedier homebrew character definitions. Each file is a collection of homebrew characters for a given Greedier week/set. Best efforts have been made to incorporate changes made in later Greediest collections where applicable. Not usable as standalone script files.
