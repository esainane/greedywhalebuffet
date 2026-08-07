# Layout and architecture

Key layers, in rough order of the data flow:

- [src/data](data): Data loading and validation. The main external interface is `Catalog`. This is an immutable store which can be trusted to provide consistent data. `loadLatestJson` constructs a `Catalog` from all data files, performing validation.
- [src/characterPolicy.ts](characterPolicy.ts): High level policy and constants, like preset collections of popular character bans.
- [src/generation.ts](generation.ts): Main transformation pipeline.
  - [GenerationWorkspace](generation-workspace.ts): Mutable state as transformations are applied.
  - [src/generation-rules](generation-rules): Individual rules for applying options.
- [src/application](application): Application-facing query layer. Derives UI-facing lists and summaries from the catalog. Separates logic from presentation.
- [src/react](react): All React code.
  - [App](react/App.tsx) is the root composing feature panels.
  - [src/react/context](react/context): React context providers and selectors for application state.
  - [src/react/features](react/features): Feature folders own their own components and local state concerns.
  - [src/react/components](react/components): Feature agnostic reusable UI primitives.

## Test convention

- `data.<what>.test.ts`: Tests run against data files.
  -`data.schema-validation.test.ts` validates all data files against their shape or schema. All other tests may assume schema compliance.
- `e2e.<what>.test.ts`: End-to-end tests run against exported script output.
- `<testee>.<what>.test.ts`: Local unit tests.
