# BTMEDYA technical roadmap — 13 October 2026

## Current source of truth
- Production repository: `BTmedyajans/Btmedya-db`, default branch `main`.
- Production hostname: `https://btmedya.com.tr`.
- Cloudflare Worker: `btmedya-db`.
- Cloudflare zone: `btmedya.com.tr` (active, Free Website plan).
- Main deployment workflow: `.github/workflows/deploy-production.yml`.
- R2 reconciliation workflow: `.github/workflows/r2-sync.yml`.
- Current hero assets are published as immutable GitHub Release assets and referenced by the homepage through the `releases/latest/download/` URLs.

## Verified / completed
- GitHub connection can read and write the production repository.
- Cloudflare connection is authenticated; the `btmedya-db` Worker exists and is deployed.
- Cloudflare Worker has a bound R2 bucket named `MEDIA`, D1 binding `DB`, KV binding `KV`, and static `ASSETS` binding.
- Cloudflare zone for `btmedya.com.tr` is active.
- On 13 October, the production deploy and UX/SEO contract checks succeeded for commit `622e8dd`.
- The latest Google Search Console and SEO daily sync workflows passed for commit `a9f349e`.
- Homepage public navigation links to `/admin/` were removed; admin login remains directly addressable and must remain protected.
- Responsive smoke test expectations were updated to match the current release-based mobile video and poster URLs.

## In progress — verify before calling complete
- GitHub Actions triggered after commit `a9f349e`: production deploy, responsive/a11y smoke and live SEO health.
- Confirm the latest responsive/a11y workflow passes all 3 viewports and the mobile intro selects the dedicated vertical film/poster.
- Confirm the latest production deploy passes `/api/health`, homepage HTTP 200 and `www` -> canonical-host HTTP 301.
- Check public homepage navigation no longer exposes a management link after cache revalidation.

## Remaining priority work
1. **P0 — production verification:** read the latest deploy and responsive/a11y workflow results; resolve any actual failing checks rather than suppressing them.
2. **P1 — mobile hero:** verify vertical video and poster load, film-end category links work, menu opens/closes, and no horizontal overflow occurs at 390px.
3. **P1 — security:** verify anonymous admin pages redirect to login and admin APIs return 401/403. Do not expose management links in public navigation.
4. **P1 — media archive:** inspect the latest R2 sync run summary. The Worker already has an R2 `MEDIA` binding; a separate R2 S3 key is only needed by the GitHub upload workflow if it must sync local files to the bucket.
5. **P2 — SEO:** retain the existing title/description, canonical host, robots, sitemap, RSS and structured data; fix only issues found by the live audit.
6. **P2 — social publishing:** prefer direct, platform-supported publishing routes and free options. Each platform may require its own user-authorized access; do not assume Metricool or Buffer tokens exist.
7. **P3 — performance/editorial:** once production is stable, audit oversized media, broken internal links, stale dated content and real-source/date attribution on news cards.

## Unneeded for the current route
- Do not create another Cloudflare API token or change DNS unless a failing workflow proves it is necessary.
- Do not add `METRICOOL_USER_TOKEN` or a Buffer token just to make the site work; the current route is to avoid a paid Metricool dependency.
- Do not create a new R2 token for Worker access: the Worker already has the `MEDIA` R2 binding. Only configure `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` GitHub secrets if the R2 sync workflow reports they are missing and automated S3-compatible uploads are required.
- Do not delete old assets, workflows, repositories or secrets as a cleanup guess. Remove only after usage and dependency checks prove they are unused.

## Change log
- 2026-10-13: fixed stale mobile hero smoke-test expectations to accept the current release-based mobile film/poster.
- 2026-10-13: removed public homepage header/footer links to the admin area.
