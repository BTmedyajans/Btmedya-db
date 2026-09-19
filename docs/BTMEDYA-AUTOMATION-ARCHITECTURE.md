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
source fetch -> deduplicate -> extract facts -> provenance record -> AI draft -> SEO/AEO check -> admin review -> publish

Never auto-publish unverified claims.

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
2. News source polling/AI editorial queue is not yet a scheduled Worker pipeline.
3. Social D1 scheduling exists, but live account publishing is connector-dependent.
4. SEO has production smoke tests, but no unified visual audit dashboard.
5. The existing admin panel should become the single control center without replacing its working media/news APIs.
