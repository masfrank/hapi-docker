# Unit Test Guidelines

> Best practices for unit testing in this project.

---

## Overview

This directory defines unit-test conventions for this repository.

Use this index as the single entry point.

---

## Reading Order

1. Read all **Core** guides first
2. Read **Optional** guides only when your change needs them

---

## Guidelines Index

| Guide | Tier | Responsibility Boundary | Status |
|-------|------|-------------------------|--------|
| [Test Structure](./test-structure.md) | Core | File placement, naming, and test organization only | Baseline |
| [Assertion Style](./assertion-style.md) | Core | Assertion quality and failure readability only | Baseline |
| [Mocking Guidelines](./mocking-guidelines.md) | Core | Dependency-boundary mocking only | Baseline |
| [CI Test Contract](./ci-test-contract.md) | Core | CI gates and local parity only | Baseline |
| [Coverage Policy](./coverage-policy.md) | Optional | Coverage scope/threshold/exclusions only | Baseline |
| [Fixtures & Data](./fixtures-and-data.md) | Optional | Test data factories, fixtures, determinism only | Baseline |

---

## Project Reality (Current Snapshot)

Observed from repository scripts and workflow:

- Root test command: `bun run test`
- Root typecheck command: `bun run typecheck`
- CI runs typecheck and tests on push/PR in `.github/workflows/test.yml`
- Existing Vitest configs include:
  - `cli/vitest.config.ts`
  - `web/vitest.config.ts`

---

## Anti-Redundancy Rule (Important)

When updating docs, keep each guide within its own boundary:

- **Structure** must not define assertion rules
- **Assertion** must not define file layout
- **Mocking** must not define fixture factory design
- **Fixtures** must not redefine mocking policy
- **Coverage** must not redefine CI gates
- **CI Contract** may reference coverage policy, but must not duplicate thresholds

---

## Minimum Quality Bar

Before merging test-related changes:

- [ ] Tests are deterministic
- [ ] Assertions are behavior-focused
- [ ] New/changed logic has tests or justified exceptions
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes

---

**Language**: Documentation in this folder should be written in **English**.
