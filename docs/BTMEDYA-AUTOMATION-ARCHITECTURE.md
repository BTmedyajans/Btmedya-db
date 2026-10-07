# BTMEDYA Free Automation Architecture

## Product direction

BTMEDYA should behave as a media operation, not only a brochure website.

Core principles:
- Real media first. AI-generated work stays explicitly inside AI LAB.
- Cloudflare D1 is the source of structured site data.
- Cloudflare R2 is the publication media vault.
- GitHub is the source of code and deployment history.
- The admin panel is the single operational interface.
- HubSpot Free is CRM/sales only; the website must remain independent of it.
- External social accounts are integrations, not the site's primary database.
- Every imported editorial asset carries source/provenance metadata.

## Automation layers

### 1. News agent
Inputs:
- approved RSS/news feeds
- official institutional sources
- manually approved source URLs

Pipeline:
source fetch -> Google Trends signal -> deduplicate -> competitor/official-source comparison -> provenance record -> AI draft -> accuracy/risk gate -> SEO/AEO check -> safe auto-publish or admin review -> publish

The continuous discovery layer runs during the day. It watches public RSS/Google News signals from Balıkesir, national publishers and selected competitor visibility queries. Discovery never makes an unverified claim true. Safe automatic publication remains limited to the existing Sabah Masası validation chain, which checks source-grounded numbers, proper names, language quality and sensitive-topic rules before publishing.

### 2. Media agent
Inputs:
- Cloudflare R2 uploads
- Google Drive import when account access is enabled

Pipeline:
import -> MIME/size/dimensions/duration -> source metadata -> AI-generated flag -> category -> platform suitability -> R2/D1 publication

### 3. Social agent
Supported operational targets:
- Instagram
- Facebook
- YouTube
- TikTok

Pipeline:
site/news/media item -> platform adaptation -> approval/schedule -> publish -> record external ID/status

The current repository already contains social_posts scheduling data and platform suitability logic. Real account OAuth remains an external connector concern.

### 4. SEO/AEO agent
Checks:
- title and meta description
- canonical
- robots/indexability
- sitemap
- H1/H2 structure
- image alt text
- Open Graph/Twitter
- JSON-LD/schema
- internal links
- broken links
- duplicate/orphan pages
- FAQ/entity signals
- mobile/performance signals

### 5. CRM agent
Cloudflare Worker -> HubSpot Free:
- Contact
- Company
- Deal
- Task
- Note

HubSpot is not the canonical content database.

## Award-level UX direction

Reference pattern:
- strong editorial typography
- minimal navigation
- work-first presentation
- selected-project storytelling
- controlled motion, not motion everywhere
- obvious contact CTA
- fast mobile fallback
- accessibility and reduced-motion support

BTMEDYA should use a black/editorial canvas, oversized typography, real photography/video, compact metadata, and a single clear action path.

## Admin information architecture

Single operational center:

- Dashboard
- Haber Ajanı
- Kaynaklar
- Medya Kasası
- Sosyal İçerik
- SEO / AEO
- CRM
- Bağlantılar
- Sistem Sağlığı

Keep advanced details collapsed by default. One primary action per screen.

## Free-cost policy

No paid HubSpot marketing/sales features are required for the core architecture.
No CMS lock-in.
No video committed to Git history.
No automatic upgrade or paid API activation.

## Current known gaps

1. Google Drive is not directly wired into the Worker.
2. Live social account publishing remains connector-dependent and only verified Metricool networks are treated as connected.
3. SEO has production smoke tests, but no unified visual audit dashboard.
4. The existing admin panel should become the single control center without replacing its working media/news APIs.

## Continuous News Intelligence

- Cron discovery: every 15 minutes.
- Signals: Google Trends TR, Google News queries, CUMHA, TRT Haber, Anadolu Ajansı and selected Balıkesir competitor visibility queries.
- Ranking signals: freshness, Balıkesir relevance, source tier, trend overlap and commercial intent.
- Risk gate: sensitive/political/crime topics are flagged and are not auto-published by the discovery layer.
- Provenance: source URL, publisher, host, category, score and first-seen/update times are stored in D1.
- Admin API: `/api/admin/news-intelligence` shows the current discovery queue to the authenticated control center.
- Revenue loop: high-interest commercial topics can be connected to BTMEDYA service CTAs, while news integrity remains separate from advertising claims.


## Automatic publishing policy

The admin panel's **Autopilot → Günlük içerik üretim planı** is the single control surface for the daily newsroom. It reads and writes `/api/admin/sabah-masasi`, supports a no-write preview, a manual run, daily enable/disable, maximum daily article count, category selection and the safe auto-publish switch. The scheduled run remains `0 5 * * *` (08:00 Europe/Istanbul); the manual button does not change the schedule.

As of 5 October 2026, BTMEDYA runs a bounded autopilot on the canonical Worker/D1/R2 stack:

- News autopilot: every hour, maximum 2 new stories per run; categories rotate across the eight editorial areas, with Balıkesir and trend signals prioritized by source scoring.
- Safe autonomous output may publish without manual approval when the policy switch is enabled. Source, freshness, duplicate-topic, sensitive-content, promotional-content, numeric, proper-name and language-quality checks remain mandatory; sensitive, political, crime, crisis, promotional, duplicate and failed-quality items remain drafts.
- The 08:00 Europe/Istanbul Sabah Masası remains as the daily full editorial pass.
- Social autopilot: newly published safe news is converted into platform-fit social posts; with Metricool configured, fresh posts can be placed into future queue slots automatically. Drafts never enter the social delivery queue.
- Metricool delivery runs every 5 minutes/15 minutes as a retrying handoff and is limited to explicitly verified networks. Current verified company networks are TikTok and YouTube.
- Agency OS exposes provider status, queue counts, overdue items and Metricool delivery failures.
- No unverified social network receives an automatic fallback publication.
