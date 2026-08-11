# Development

## Install

- `pnpm ci --dev`: Install dependencies for development.
- `pnpm start`: Start development server with hot reload.

## Validation and build

Common commands:

- `pnpm test`: Run all tests.
- `pnpm build`: Check build.
- `pnpm lint`: Run linter.
- `pnpm type-check`: Run TypeScript type checking.

The validation workflow also runs the schema, manifest, and end-to-end data checks used by CI.

Test categories can also be run distinctly:

- `pnpm test:data:schema`: Validate data files against schemas.
- `pnpm test:data:sanity`: Validate data files with extended sanity checks.
- `pnpm test:unit`: General purpose unit testing.
- `pnpm test:e2e`: Check exported scripts are fully schema compliant.

## Notes

- The raw script remains directly downloadable as a standalone JSON artifact. The raw script is as intentioanlly compatible with the BotC app as the generated script.
