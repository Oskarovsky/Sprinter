# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Always print test coverage in console

- **Context**: `@package.json` test scripts (`npm test`, `npm run test:coverage`) and the CI test step in `@.github/workflows/ci.yml`.
- **Problem**: Without coverage printed to the console during each run, build, or test, there is no visibility into coverage percentage in the logs.
- **Rule**: Use vitest with `@vitest/coverage-v8` per `@vitest.config.ts`. `npm run test:coverage` must print a text summary table with Statements, Branches, Functions, and Lines percentages to stdout. Wire `npm run test:coverage` into CI alongside lint and build.
- **Applies to**: implement, impl-review
