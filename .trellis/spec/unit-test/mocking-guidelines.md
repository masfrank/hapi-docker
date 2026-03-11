# Mocking Guidelines

> Define when and how dependencies should be mocked.

---

## Boundary of This Guide

This guide covers only dependency replacement strategy:

- Network / FS / process / clock / randomness boundaries
- Mock lifecycle and isolation

This guide does **not** define:

- Fixture data builders (see `fixtures-and-data.md`)
- Assertion details (see `assertion-style.md`)

---

## Mocking Rules (Baseline)

- Mock at external boundaries, not inside pure domain logic
- Do not mock the function under test
- Keep mocks explicit and minimal per test case
- Reset/restore mocks between tests

---

## Preferred Patterns

- Test doubles with clear intent
- Per-test setup over global hidden behavior
- Explicit mock behavior tied to scenario

---

## Discouraged Patterns

- Global mocks leaking across test cases
- Over-mocking that hides integration assumptions
- Shared mutable mock state between tests

---

## Examples from Codebase

- `cli/src/claude/utils/startHookServer.test.ts` (process/boundary mocking scenarios)
- `cli/src/codex/codexRemoteLauncher.test.ts` (launcher dependency isolation)
- `hub/src/socket/handlers/terminal.test.ts` (socket/handler boundary tests)
