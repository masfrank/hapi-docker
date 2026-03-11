# Coverage Policy

> Define coverage expectations for this repository.

---

## Boundary of This Guide

This guide covers only:

- What logic should be covered
- Exclusion policy
- Coverage thresholds (if used)

This guide does **not** define CI gate order or contributor workflow (see `ci-test-contract.md`).

---

## Policy Baseline

- New or changed business logic should include/adjust tests
- Critical paths should have behavior-focused coverage
- Type-only or generated artifacts may be excluded with justification

---

## Allowed Exclusions (Examples)

- Generated code
- Thin re-export files
- Platform wrappers validated by dedicated integration tests

---

## Threshold Strategy (If Enabled)

- Start with realistic module-level thresholds
- Tighten gradually as flaky/legacy areas are improved
- Optimize for meaningful coverage, not percentage gaming

---

## Link to CI

If coverage checks are enforced in CI, `ci-test-contract.md` should reference this file instead of duplicating thresholds.

---

## Reference Files in This Repo

- `cli/vitest.config.ts`
- `web/vitest.config.ts`
- `.github/workflows/test.yml`
