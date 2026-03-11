# Fixtures & Data

> Define how test data and fixtures are created and reused.

---

## Boundary of This Guide

This guide covers only:

- Fixture organization
- Data factory/builder patterns
- Determinism of test inputs

This guide does **not** define mocking boundaries (see `mocking-guidelines.md`).

---

## Data Rules (Baseline)

- Prefer factories/builders over large inline objects
- Keep fixtures minimal and scenario-specific
- Avoid hidden shared mutable fixture objects

---

## Determinism Rules

- Freeze time for time-sensitive behavior
- Seed randomness or avoid random inputs
- Avoid dependence on mutable external state

---

## Discouraged Patterns

- One giant shared fixture for many unrelated tests
- Implicit defaults that hide important fields
- Environment-dependent fixture assumptions

---

## Examples from Codebase

- `web/src/chat/reducer.equivalence.test.ts` (scenario-based input matrix)
- `cli/src/runner/runner.integration.test.ts` (integration-oriented test data setup)
- `hub/src/sync/teams.test.ts` (sync event test data cases)
