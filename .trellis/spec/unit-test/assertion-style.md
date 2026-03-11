# Assertion Style

> Define assertion principles for readable and maintainable tests.

---

## Boundary of This Guide

This guide covers only:

- What to assert
- How specific assertions should be
- How failures should remain diagnosable

This guide does **not** define:

- Test file layout (see `test-structure.md`)
- Mocking boundaries (see `mocking-guidelines.md`)

---

## Assertion Rules (Baseline)

- Assert externally visible behavior, not internals
- Prefer specific assertions over broad truthy/falsy checks
- Keep assertions near the Act step for readability
- Keep failure output actionable

---

## Preferred Patterns

- Clear Arrange / Act / Assert flow
- One primary behavior assertion per case (plus related follow-up checks)
- Explicit expectation values and error context

---

## Discouraged Patterns

- Snapshot overuse without intent
- Assertion blocks so large that root cause is unclear
- Asserting private implementation details when public behavior is enough

---

## Examples from Codebase

- `cli/src/utils/deterministicJson.test.ts` (deterministic output assertions)
- `hub/src/store/namespace.test.ts` (state/namespace behavior assertions)
- `web/src/lib/clipboard.test.ts` (browser utility behavior assertions)
