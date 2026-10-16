# BTMEDYA GitHub ruleset correction runbook

## Verified state (16 October 2026)
Repository: `BTmedyajans/Btmedya-db`
Active ruleset: [Bağlantılar](https://github.com/BTmedyajans/Btmedya-db/rules/22512704)

The ruleset currently targets all branches (`~ALL`) and has these rules:
- branch creation, update and deletion restrictions
- linear history and signed commits
- pull request required with 4 approving reviews
- code quality and CodeQL code scanning required
- Copilot code review on push, including draft PRs

This scope is blocking scheduled automation updates to pre-created automation branches. Latest confirmed example: [run 38900067435](https://github.com/BTmedyajans/Btmedya-db/actions/runs/38900067435), where generating/validating media succeeds and the final signed-commit update is rejected with `Repository rule violations found / Cannot update this protected ref`.

## Intended end state
Keep production `main` protected. Do not remove signing, required pull requests, or security scanning from production.

Use separate ruleset scopes:
1. `main`: production branch with PR reviews, required checks, code scanning and signed commits.
2. `develop`: PR required and relevant CI checks; review thresholds should be intentionally selected for an integration branch rather than blindly inheriting four approvals.
3. `automation/*`: restrict who can write, require signed commits, and allow PR-based automation. Prefer a narrow, auditable bypass actor for the single automation GitHub App or a carefully scoped rule exception. Do not grant broad bypass to all Actions or user tokens.
4. Keep `fix/*`, `feat/*`, and `chore/*` branches usable for normal PR validation and do not deploy them to production.

## Operator procedure
1. Open the ruleset page above while signed into the repository owner account.
2. Duplicate or edit ruleset scope so production requirements remain on `main`.
3. Remove the catch-all `~ALL` scope from the production-only ruleset and explicitly select `refs/heads/main`.
4. Add a separate `develop` ruleset requiring PRs and the relevant validation workflows.
5. For `automation/*`, keep signed commit and PR review requirements where possible, but configure a narrowly scoped GitHub App bypass or an automation-specific path that allows the action to open/update a PR without directly changing a protected ref.
6. Save the ruleset and re-run the scheduled workflow only after verifying its exact current branch/commit and branch protections.
7. Confirm `main` protection was not weakened, the automation opens/updates a PR rather than bypassing review, and the deploy workflow still triggers only from `main`.

## Safety limits
- Do not delete or force-reset any branch.
- Do not disable production branch protection.
- Do not put secrets in workflow files or repository content.
- Do not claim this ruleset is changed until the UI/API confirms the saved rules and an actual automation PR succeeds.
- The Cloudflare Worker `btmedya-db`, D1 `btmedya-media`, R2 `btmedya-media`, and domain bindings were verified independently and should not be edited to solve this GitHub ruleset problem.
