# Development

## Validation and build

Common commands:

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run type-check`

The validation workflow also runs the schema, manifest, and end-to-end data checks used by CI.

Test categories can also be run distinctly:

- `npm run test:data-sources`: Validate data files against schemas and appropriate ID ranges.
- `npm run test:unit`: General purpose unit testing.
- `npm run test:e2e`: Check exported scripts are fully schema compliant.

## Notes

- The raw script remains directly downloadable as a standalone JSON artifact. The raw script is as intentioanlly compatible with the BotC app as the generated script.
