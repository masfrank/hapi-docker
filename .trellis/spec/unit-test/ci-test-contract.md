# CI Test Contract

> Define CI requirements for type safety and test gates.

---

## Boundary of This Guide

This guide covers only:

- Which checks CI runs
- Required local parity before PR
- Failure triage expectations

This guide does **not** define coverage thresholds (see `coverage-policy.md`).

---

## Current CI Facts

From `.github/workflows/test.yml`:

- Trigger: push and pull_request
- Core checks include:
  - `bun install`
  - `bun typecheck`
  - setup integration test env file for CLI
  - `bun run test`

---

## Contributor Contract

- Run local checks that match CI entry points when possible
- Test-related changes must pass both typecheck and tests before merge
- Required env setup must be documented and reproducible

---

## Failure Handling

- Classify failure first: typecheck vs test vs environment
- Fix root cause; do not bypass checks

---

## Coverage Integration

If CI adds coverage gating, reference policy from `coverage-policy.md` (single source of truth).

---

## Reference Files in This Repo

- `.github/workflows/test.yml`
- `package.json`
- `cli/vitest.config.ts`
- `web/vitest.config.ts`
