# Test Structure

> Define how unit tests are organized in this repository.

---

## Boundary of This Guide

This guide covers only:

- Where tests live
- How test files are named
- How `describe`/`it` are organized

This guide does **not** define:

- Assertion techniques (see `assertion-style.md`)
- Mocking strategy (see `mocking-guidelines.md`)
- Fixture factories (see `fixtures-and-data.md`)

---

## Structure Rules (Baseline)

- Keep test files close to the unit under test when practical
- Use consistent naming (`*.test.ts` or `*.spec.ts`)
- Group cases by behavior with `describe`
- Keep each `it` focused on one behavioral scenario

---

## Naming Rules

- Prefer behavior-oriented names: `should <behavior> when <condition>`
- Avoid vague names like `works` / `test1`

---

## Discouraged Patterns

- "Mega test" files for unrelated units
- Deeply nested `describe` blocks with unclear purpose
- Test names that omit condition or expected behavior

---

## Examples from Codebase

- `cli/src/agent/backends/acp/AcpMessageHandler.test.ts` (backend adapter unit test structure)
- `hub/src/notifications/notificationHub.test.ts` (service-level behavior grouping)
- `web/src/chat/reducer.equivalence.test.ts` (reducer behavior-focused test organization)
