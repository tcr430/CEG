# AGENTS.md

## Repository expectations

- Read `README.md`, `ARCHITECTURE.md`, and `DATA_STRATEGY.md` before making changes.
- Follow the monorepo structure and service-style boundaries defined in `ARCHITECTURE.md`.
- Keep diffs scoped to the requested task.
- Prefer `pnpm`.
- Use TypeScript everywhere.
- Use Zod for validation contracts.
- Do not place business logic in React components.
- Do not call model providers directly from UI code.
- Do not access the database directly from UI code.
- All AI outputs must be schema-validated before persistence.
- Add or update tests for critical paths.
- Update docs when architecture, schema, or workflows change.

## Definition of done

- Code builds
- Lint passes
- Relevant tests pass
- Types pass
- New env vars are documented in `.env.examples`
- New architectural decisions are reflected in docs if needed