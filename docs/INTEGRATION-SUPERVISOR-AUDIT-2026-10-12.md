# BTMEDYA Integration Supervisor Audit — 2026-10-12

## Confirmed healthy
- GitHub repository: `BTmedyajans/Btmedya-db`, default branch `main`.
- Production worker: `btmedya-db`; Cloudflare deployment `bdb84891-915f-4678-ae9e-dcf85108cc3e`, version `d01a3e39-b807-410f-9c22-af34135d51a0`, 100% traffic.
- `BTMEDYA Production Deploy` run #287 succeeded, including the production smoke tests.
- `BTMEDYA Sync Worker Secrets` run #147 succeeded after the account-scoped Cloudflare token verification and scripts-collection access check.
- Cloudflare custom domains `btmedya.com.tr` and `www.btmedya.com.tr` both point to `btmedya-db` production.
- Metricool brand metadata is readable for brand 6858384 / user 5278969 / label `busetuncayy10` / timezone `Europe/Istanbul`. Connected account labels shown by Metricool include Instagram, TikTok and YouTube.
- Windsor.ai connector discovery shows Search Console property `https://btmedya.com.tr/` and Instagram account `busetuncayy10`.
- Canva account has a Brand Kit ID `kAGPm6ZyQcw`; no reusable Canva Brand Templates were returned in the template search.
- Native social publishing code exists in `src/direct-social.js` for Facebook Page and Instagram Professional via Meta OAuth; TikTok and YouTube require their own app credentials and user OAuth.

## Confirmed blockers
- Windsor.ai API reads for Search Console and Instagram return a free-plan account-limit notice: 3 accounts are connected, while the current plan permits 1. The returned rows are warning placeholders, not real metrics. Do not use them for SEO or social performance decisions until the account limit is resolved (disconnect two unused accounts or change plan).
- Remote Desktop Commander reports no connected devices. Do not claim access to the user's desktop/browser/terminal.
- Cloudflare Worker secret *names* currently include core admin/session/media secrets and `SOCIAL_TOKEN_ENCRYPTION_KEY`; `META_APP_ID`, `META_APP_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `YOUTUBE_CLIENT_ID`, and `YOUTUBE_CLIENT_SECRET` are not present in the Worker secret listing.
- Metricool has a TikTok test post for 2026-10-12 at 09:00 Europe/Istanbul. It is `draft=true`, `autoPublish=false`, TikTok privacy `SELF_ONLY`; preserve it as a draft and do not publish or rewrite it automatically.
- Brand metadata access does not expose the Metricool API token. Metricool user token must be provided privately as GitHub Actions secret `BTMEDYA_METRICOOL_USER_TOKEN` if the user decides to keep the Metricool handoff.
- Canva Brand Template search returned no templates suitable for autofill; an existing design called "BTMEDYA web içerik paketi" was found in Canva search earlier, but it is not a Brand Template and cannot be assumed to have fillable fields without dataset inspection.

## Remaining steps
1. Choose one path:
   - **Native, no Metricool:** add Meta app ID/secret in GitHub secrets, sync scope `meta`, then authorize Facebook Page/Instagram Professional from the admin Social OS OAuth screen. Add TikTok and YouTube developer app credentials, sync scope `native-social`, then perform each provider's OAuth from the admin panel.
   - **Keep Metricool:** add `BTMEDYA_METRICOOL_USER_TOKEN` privately, run `BTMEDYA Sync Worker Secrets` with `metricool`, verify API + brand access. Keep current scheduled test post as draft until its owner explicitly authorizes a public post.
2. Resolve Windsor.ai free-plan limit before using its Search Console/Instagram figures; connector discovery can still show account identities, but the data read is not valid.
3. For reusable Canva auto-fill, create or select an actual Canva Brand Template with fillable fields; normal existing designs do not automatically qualify.
4. Verify real platform posts only after authorized account connection and explicit user approval. Do not claim publishing success based solely on queue insertion.

## Secret hygiene
- Never store token values in repository files, issues, PRs or chat.
- Keep GitHub secrets separate from Cloudflare Worker secrets; sync workflow owns transfer.
- Do not delete existing D1/R2 or account secrets while repairing publishing.
