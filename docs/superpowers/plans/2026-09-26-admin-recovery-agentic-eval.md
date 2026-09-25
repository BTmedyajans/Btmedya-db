# Admin Recovery Authentication Agentic-Eval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate and refine the temporary admin recovery login using explicit criteria, deterministic tests, and a bounded reflection loop without weakening normal authentication.

**Architecture:** Keep primary authentication in Cloudflare Worker Secrets. Add an optional, time-limited `ADMIN_RECOVERY_SECRET` in the format `UNIX_SECONDS:code`; it is accepted only with the canonical username and never replaces the primary secret. Evaluate the implementation with a rubric and deterministic tests before any deployment.

**Tech Stack:** Cloudflare Worker JavaScript, Wrangler, Node.js test scripts, GitHub Actions/Cloudflare Workers Builds.

**Spec:** `/home/ubuntu/skills/agentic-eval/SKILL.md` and the current login contract in `src/worker.js`.

## Global Constraints

- Never hard-code a production password or recovery code in source control.
- Recovery access is optional and disabled when `ADMIN_RECOVERY_SECRET` is absent.
- Recovery access must expire based on a Unix timestamp.
- The canonical username must be `BTmedyaajans`.
- Primary Secret authentication must continue to work unchanged.
- No deployment is considered complete until syntax, deterministic tests, dry-run, and live smoke checks pass.
- GitHub and Cloudflare credentials must not be printed or committed.

## Review Focus

1. Wrong username with the right password must be rejected.
2. Expired recovery code must be rejected.
3. Malformed recovery configuration must be rejected.
4. Valid recovery code must be accepted only before expiry.
5. Missing recovery Secret must not change normal login behavior.

---

### Task 1: Expose and test the recovery validator

**Files:**
- Modify: `src/worker.js`
- Create: `tools/test-admin-recovery.mjs`

**Interfaces:**
- Produces named export `recoveryPasswordValid(value, configured)` for deterministic unit testing.

- [ ] Export the pure validator without changing the Worker default export.
- [ ] Add tests for valid, expired, malformed, missing, and wrong-code inputs.
- [ ] Run `node tools/test-admin-recovery.mjs` and require all assertions to pass.

### Task 2: Evaluator rubric and reflection loop

**Files:**
- Create: `tools/evaluate-admin-recovery.mjs`
- Modify: `docs/superpowers/plans/2026-09-26-admin-recovery-agentic-eval.md`

**Interfaces:**
- Consumes deterministic test results and source checks.
- Produces JSON with `overall_score`, per-dimension status, failures, and a convergence decision.

- [ ] Score security isolation, expiry correctness, malformed-input handling, username binding, and test coverage from 0 to 1.
- [ ] Fail the evaluator below 0.9 overall or on any critical security dimension.
- [ ] Run at most three evaluation/refinement iterations and stop when the score no longer improves.
- [ ] Save the evaluation JSON outside the repository or under an ignored diagnostics path.

### Task 3: Code-specific refinement

**Files:**
- Modify: `src/worker.js`
- Modify: `wrangler.toml`
- Test: `tools/test-admin-recovery.mjs`

- [ ] Run syntax, diff, deterministic tests, and Wrangler dry-run.
- [ ] Fix only failures identified by the rubric; do not add bypasses or hard-coded credentials.
- [ ] Re-run the complete evaluator after each fix.

### Task 4: Publication gate

**Files:**
- No source change unless a prior task fails.

- [ ] Commit only after the evaluator passes.
- [ ] Push to GitHub `main` only with an authenticated session.
- [ ] Add `ADMIN_RECOVERY_SECRET` only through Cloudflare Secret management, using a short expiry and a random code.
- [ ] After deployment, verify `/api/health`, `/admin/`, primary login, recovery login, and expired recovery rejection.
- [ ] Delete or rotate the recovery Secret immediately after normal password access is restored.
