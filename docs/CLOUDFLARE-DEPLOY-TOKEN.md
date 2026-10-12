# Cloudflare production deploy token

The production deploy and Worker secret-sync workflows use exactly one GitHub Actions secret:

`CLOUDFLARE_DEPLOY_TOKEN`

Do not configure the deployment workflow to fall back to generic API, D1, or R2 tokens. Those credentials can be valid for reading or managing a different resource while lacking permission to deploy the production Worker.

## Required Cloudflare scope

Create a new API token for the BTMEDYA Cloudflare account, then save it as the repository secret `CLOUDFLARE_DEPLOY_TOKEN` at:

GitHub → Settings → Secrets and variables → Actions.

Scope the token to account ID `b239acae17aebe894ea76309fe32cdce` and grant:

- **Workers: Editor** for the existing Worker `btmedya-db`, or product-level Workers Editor for the account.
- **Workers Routes: Write** for the `btmedya.com.tr` zone because `wrangler.toml` declares the apex and www custom domains and a deploy may reconcile them.

On legacy permission screens, the comparable permissions are **Workers Scripts: Edit/Write** at account scope and **Workers Routes: Edit/Write** for the zone.

The Worker already exists, so do not grant account-wide Admin solely to deploy it. Bound D1/R2/KV resources do not need separate write permission just to upload a Worker version. Grant D1 or R2 permissions separately only to workflows that directly manage those resources.

## Verify the deployment chain

1. Replace the value of `CLOUDFLARE_DEPLOY_TOKEN` privately in GitHub Actions secrets. Do not paste it into issues, chat, logs, or source code.
2. Open Actions → **BTMEDYA Production Deploy** and run it on `main`.
3. The workflow verifies the token is active and can access `btmedya-db`, runs validation, deploys with pinned Wrangler, and smoke-tests the live home page, `/api/health`, and the www-to-apex redirect.
4. If the preflight passes but deploy fails, inspect the exact permission error. A successful read check does not prove the token has Editor/write access.

The Worker bindings, DNS records, D1 data, and R2 objects are not changed by this token setup.
