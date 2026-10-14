## Summary
Restore a single deterministic production deploy path for BTMEDYA.

## Confirmed causes
- The `busetuncay1029-ai/Btmedya-db` fork is not the canonical repo; canonical is `BTmedyajans/Btmedya-db`.
- Canonical repo already contains `.github/workflows/deploy-production.yml` with push-to-main deploy via Wrangler, source validation and smoke tests.
- Cloudflare API for Worker `btmedya-db` has no Workers Builds configuration and its trigger list is empty. The current Worker version was manually uploaded from Dashboard.
- The production deploy workflow requires Actions secret `CLOUDFLARE_DEPLOY_TOKEN`. This secret must be non-empty and scoped to the correct Cloudflare account/Worker and custom domain routes. No secret values should ever be copied into code or chat.
- `deploy.yml` is verification-only; it must not be mistaken for the deploy workflow.

## Canonical chain (recommended)
Use **GitHub Actions + Wrangler** as the sole code deployment owner for now, because the repo already has a robust deploy workflow. Do not simultaneously enable Cloudflare Workers Builds for this Worker unless the project explicitly migrates to that model; two deploy owners risk deployments racing each other.
1. Canonical repo: `BTmedyajans/Btmedya-db`, branch `main`.
2. On relevant `main` changes, `deploy-production.yml` validates source/assets, checks `CLOUDFLARE_DEPLOY_TOKEN`, deploys using `npx wrangler deploy --config wrangler.toml`, then performs production smoke tests.
3. Make sure `CLOUDFLARE_DEPLOY_TOKEN` exists in canonical repo Actions secrets and has required Workers Editor plus Workers Routes Write for the declared custom domains.
4. Only after successful deploy, run production verify and then the live audit against the same commit SHA.
5. Live audit should include `home.js` content-hash comparison using the cache-busted URL actually referenced by live HTML.
6. Do not apply D1 migrations in a routine deploy automatically without separately reviewed/approved migration handling.

## Cloudflare Workers Builds
At the moment the Worker has no build config or triggers. **Do not create a second deployment owner now.** Leave Workers Builds disconnected and use the existing GitHub Actions deploy chain. If choosing Workers Builds later, migrate deliberately: authorize Cloudflare GitHub App, connect the correct canonical repo, configure main/root/deploy command, and disable the other deploy owner.

## Acceptance tests
- Change to a relevant file on `main` starts the canonical deploy workflow.
- Log shows successful token validation, Wrangler deploy, home/health/www/admin/SEO endpoint smoke tests.
- Live `/api/health` responds healthy; assets referenced by live HTML match main.
- Site audit succeeds on same commit.
- Dashboard manual uploads are not used for routine code releases.

## Human-required checkpoint
Verify/add the Cloudflare token secret in the canonical repo if absent. Secret *name* is `CLOUDFLARE_DEPLOY_TOKEN`; do not share the value.
