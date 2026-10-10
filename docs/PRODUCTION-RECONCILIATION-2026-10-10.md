# BTMEDYA Production Reconciliation — 10 October 2026

## Current production baseline

- Repository: `BTmedyajans/Btmedya-db`
- `main` baseline at audit start: `7f4d4bd71c815c4b039207912facaad4dc29dbfd`
- Cloudflare Worker: `btmedya-db`
- Active deployment observed during audit: `e0bd0588-2aa2-4a6b-a906-cbc1c475ba34`
- Active version observed: `3185c231-ddec-4530-95e6-cf923961e408` at 100% traffic
- Deployment model: Cloudflare Workers Builds is the canonical deploy path from `main`.
- Reconciliation lives on branch `fix/production-reconciliation-20261010` and draft PR #326. No merge, production deployment, DNS edit, D1 migration, Supabase migration execution, secret rotation, or social-media publication was performed.

## Live HTTP verification

The read-only production verification workflow confirmed:

- `/`, `/haberler/`, `/hizmetler/`, `/sosyal-medya/`, `/video-produksiyon/`, `/hakkimizda/`, `/iletisim/`: HTTP 200 with titles/descriptions and canonical metadata.
- `/robots.txt`, `/sitemap.xml`, `/news-sitemap.xml`, `/rss.xml`: HTTP 200; sitemap 203 URLs at the observed production baseline, news sitemap 8 recent records.
- `/api/health`: HTTP 200; CMS, R2, and admin checks healthy.
- `/admin/`: HTTP 302 authentication redirect.
- Hero video: HTTP 200, `video/mp4`.
- `/api/news`: HTTP 200, up to 100 items, 8 recent records, news-sitemap count 8.

The source branch adds the cookie-policy page and link. That new route has **not** been production-verified because it is intentionally not deployed yet.

## Reconciled improvements in PR #326

- Make the default deploy command avoid implicit D1 migration execution; keep schema migrations explicit.
- Trigger production diagnostics for Worker source, assets, tools and workflow changes; prefer the correct account-scoped D1 audit secret slot.
- Bound automated news candidates, claim a unique audit row per minute and recover stale unfinished run records.
- Add read-only hourly production-surface checks and consent-first analytics regression checks.
- Replace old public measurement script cache keys, remove tracker preconnects, gate analytics behind explicit opt-in, and link the cookie policy.
- Route the cookie-policy path through Worker-first handling so Worker routing, sitemap and canonical host checks agree.
- Keep the entrance-film video from intercepting clicks to its end-card navigation.
- Add admin-session / Cloudflare Access test improvements.
- Label AI-created R2 media accurately.
- Add a HyperFrames video composition and CI lint. Manual rendering stores an MP4 as a 14-day GitHub artifact only; it does not automatically publish to R2 or deploy the Worker.
- Mirror the already-applied social RLS migration, tests and rationale in GitHub. No migration was executed during this reconciliation.

## Outstanding setup / release gates

### Metricool
Live `/api/health` reports `metricoolToken=false`. Production SEO health currently fails **only** because the Worker secret `METRICOOL_USER_TOKEN` is missing. Without an API credential, automatic publishing is unavailable; the social queue deliberately does not mark unsent posts as scheduled. If the current plan cannot issue an API token, keep the integration in draft/manual mode rather than purchasing an upgrade or faking a connection.

### Cloudflare D1 audit in GitHub Actions
The D1 schema audit previously failed with Cloudflare API 403 / code 7403. A repository administrator should add or correct the GitHub Actions secret `CLOUDFLARE_D1_API_TOKEN` (or the already-supported `BTMEDYA_D1`) with Account > D1 > Read access for the configured account. Never commit or share the secret value in source code or chat.

### Windsor / Search Console / Ads
Windsor's connected-account count exceeds the free-tier account limit observed during the audit; reads are paused. Choose one account within the current plan or review the plan before adding more. Search Console automation also needs its service-account JSON secret; a Google Ads connection was not verified. Do not upgrade or authorize extra spend automatically.

### Supabase
Connected project health and security advisor checks were clean; the social RLS migration is already in the remote migration history and social tables have RLS enabled. GitHub now records the matching migration/tests. Reconcile migration history before any future schema operation; do not re-run an already-applied migration.

## Release gate

1. Resolve or explicitly accept the Metricool/API limitation, and fix the D1 read-only audit credential.
2. Re-run the complete PR checks. Core, automation reliability, the read-only scheduled production verification, and HyperFrames lint passed in the observed run; SEO health remains red until the missing Metricool token/connection issue is resolved.
3. Review the diff and merge PR #326 only when the release owner explicitly approves. Because `main` is the Cloudflare Workers Builds source, merge can trigger a production deployment.
4. After any authorized release, rerun live HTTP checks—including the new cookie-policy route—before scheduling a later release.
