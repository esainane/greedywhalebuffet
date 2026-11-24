# Development

## Install

- `pnpm ci --dev`: Install dependencies for development.
- `pnpm start`: Start development server with hot reload.

## Validation and build

Common commands:

- `pnpm test`: Run all tests.
- `pnpm build`: Run build and materialization.
- `pnpm lint`: Run linter.
- `pnpm type-check`: Run TypeScript type checking.

The validation workflow also runs the schema, manifest, and end-to-end data checks used by CI.

Test categories can also be run distinctly:

- `pnpm test:data:schema`: Validate data files against schemas.
- `pnpm test:data:sanity`: Validate data files with extended sanity checks.
- `pnpm test:unit`: General purpose unit testing.
- `pnpm test:e2e`: Check exported scripts are fully schema compliant.

## Notes

- The raw script remains directly downloadable as a standalone JSON artifact. The raw script is as intentionally compatible with the BotC app as the generated script.

## Tools

- `pnpm tool:materialize-changelog`: Convert the release headings, sections, and changes in `CHANGELOG.md` into structured JSON. Unsupported Markdown blocks fail the command rather than being omitted.
- `pnpm file-validate <file> [script|roles|jinx]`: Validate a JSON file against a schema. The script schema is used by default.
- `pnpm tool:generate-schema`: Regenerate derived schemas in `schemas/`.
- `pnpm tool:night-order`: Generate legacy `firstNight` and `otherNight` arrays, or print night order.

The changelog materializer accepts `## [vX.Y.Z]` release headings with an optional ISO date or title, `###` section headings, bullet changes, sectionless paragraphs, and `---` separators.
