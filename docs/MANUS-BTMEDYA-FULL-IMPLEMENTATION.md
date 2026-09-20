# BTMEDYA Manus + GitHub + Cloudflare Full Implementation Handoff

## 0. Deployment lock
- This is a handoff/design implementation document.
- DO NOT merge PR #47.
- DO NOT deploy the Worker.
- DO NOT change production DNS, Custom Domains, Access policies, secrets, D1 production data, or R2 production media without explicit owner approval.
- Work only on the draft branch unless the owner explicitly authorizes another branch.

## 1. Product target
BTMEDYA is a professional media/news + AI media production site for Balikesir, Türkiye and international audiences.
The full version must use real BTMEDYA photographs and videos from the existing media archive/R2. AI-generated visuals are restricted to the clearly marked AI LAB area. Never invent media URLs.

Primary site:
- https://btmedya.com.tr/
- https://www.btmedya.com.tr/

Admin:
- /admin/

Core stack:
- Cloudflare Worker: btmedya-db
- D1: btmedya-media
- R2: btmedya-media
- GitHub: BTmedyajans/Btmedya-db
- Existing draft: draft/newsroom-ulusal-v2
- Existing PR: #47

## 2. Editorial product
Build the newsroom as a real operational CMS, not a static mockup.

Main modules:
1. Haber Merkezi
2. Yeni Haber
3. Yayın kuyruğu
4. Arşiv
5. Medya Kasası
6. Gerçek Medyayı Eşleştir
7. SEO/AEO kontrol
8. Video yönetimi
9. Sosyal İçerik
10. AI Haber Planlayıcı
11. Site Durumu
12. Gelen Mesajlar

News workflow:
source -> verification -> draft -> real media selection -> SEO/AEO -> editor preview -> human approval -> publish -> social draft.

AI content must never auto-publish. Human approval is mandatory.

## 3. Existing data and APIs
D1 news table:
- id
- slug
- title
- excerpt
- body
- category
- author
- cover_url
- video_url
- status
- published_at
- created_at
- updated_at

D1 media table:
- id
- key
- original_name
- mime
- size
- category
- tags
- title
- description
- alt_text
- published
- slot
- sort_order
- created_at
- updated_at

Existing public/admin endpoints include:
- GET /api/news
- GET /api/public/media
- admin news endpoints under /api/admin/news
- media endpoints under /api/media
- published media under /pub/<key>
- signed media under /media/<key>
- admin social provider status under /api/admin/social/providers

## 4. Required media architecture
Do NOT make editors paste arbitrary image/video URLs as the primary workflow.

Implement:
news.cover_media_id -> media.id
news.video_media_id -> media.id

If migration is needed, preserve existing cover_url/video_url as backwards-compatible fallback.

Media selector requirements:
- filter by photo/video
- search title/name/tag
- show thumbnail/preview
- show original filename
- show alt text
- show published status
- prevent unpublished media from public rendering
- save selected media IDs
- generate stable public media URL through existing /pub/<key> mechanism

Use real archive media already present in R2/D1. Do not create fake placeholders for production content.

## 5. Public news requirements
- /haberler/ newsroom landing
- /haberler/<slug> detail pages
- responsive mobile-first layout
- NewsArticle JSON-LD
- VideoObject when video exists
- canonical URLs
- Open Graph/Twitter metadata
- source attribution
- publication/update timestamps
- author
- category
- reading time/word count
- clear archive label for historical material
- never present historical prices, forecasts, events or claims as current

## 6. Editorial source rules
Priority:
1. official primary sources
2. licensed news agencies/APIs/RSS
3. direct statements/interviews
4. reputable secondary reporting with attribution
5. social posts only as leads, not automatic proof

Every AI/news draft should retain:
- source URL
- source publisher
- source publication time
- verification status
- what is confirmed vs allegation/claim
- editor approval state

Do not fabricate sources or quotes.

## 7. AI News Planner
Existing draft files:
- src/news-planner.js
- docs/AI-HABER-PLANNER.md

Target schedule:
- 08:00 Europe/Istanbul
- 13:00 Europe/Istanbul
- 19:00 Europe/Istanbul

Coverage:
- Balikesir
- Türkiye
- Dünya

Topics:
- local government
- economy
- public services
- transport
- business
- technology
- artificial intelligence
- culture
- sports

Required pipeline:
source discovery -> dedupe -> source verification -> AI draft -> real media matching -> SEO/AEO -> human editor approval -> publish.

Required secret:
OPENAI_API_KEY
Optional model override:
OPENAI_NEWS_MODEL

Important: verify the currently supported OpenAI API model before configuring production. Do not assume a model name is valid.

## 8. Social publishing
Provider configuration is already documented in src/social-platforms.js and docs/SOCIAL-API-SECRETS.md.

Required environment names:
Instagram:
- META_ACCESS_TOKEN
- META_IG_USER_ID

Facebook:
- META_ACCESS_TOKEN
- META_PAGE_ID

TikTok:
- TIKTOK_ACCESS_TOKEN
- TIKTOK_OPEN_ID

YouTube:
- YOUTUBE_CLIENT_ID
- YOUTUBE_CLIENT_SECRET
- YOUTUBE_REFRESH_TOKEN

Never commit secret values to GitHub.

## 9. Cloudflare
Keep existing bindings unless verified otherwise:
- Assets: VARLIKLAR
- D1: btmedya-medya / btmedya-media
- R2: btmedya-medya / btmedya-media

Worker:
- btmedya-db

Before production deployment verify:
- ADMIN_USERNAME
- ADMIN_PASSWORD
- ADMIN_SESSION_SECRET
- MEDIA_SIGNING_SECRET

Optional:
- OPENAI_API_KEY
- OPENAI_NEWS_MODEL
- AI_READ_TOKEN
- RESEND_API_KEY
- RESEND_TO
- RESEND_FROM
- social provider secrets

Do not replace Worker custom-domain architecture with an unrelated static-hosting DNS setup. Verify current custom domains before DNS changes.

## 10. Admin authentication
Website /admin/ authentication is independent of GitHub 2FA.

Required:
- username
- password
- secure Worker session
- ADMIN_SESSION_SECRET

Do not disable GitHub 2FA.

## 11. Real content population
Use existing BTMEDYA archive/news material already present in repository and existing R2/D1 media records.
Known archive source material includes the existing 2024 news set and current BTMEDYA media archive.

Before publishing any historical article:
- preserve original date
- label as archive/historical
- preserve source attribution
- do not rewrite old facts as today's facts

Do not invent current news, prices, events, quotes, photos, videos, source links or social credentials.

## 12. UI target
Dark, premium editorial control room.
Desktop + mobile.
Fast scanning.
Clear states:
- draft
- source verification
- media missing
- SEO ready
- editor approval
- published
- archived

Primary actions:
- Yeni Haber
- Önizle
- Gerçek Medya Seç
- Editöre Gönder
- Yayınla

Dangerous actions must require confirmation.

## 13. Implementation order
1. Review existing public/admin code and PR #47.
2. Fix newsroom tab duplication and JS scope issues.
3. Implement news-media relational fields and migration.
4. Build real R2/D1 media selector.
5. Integrate selector into new/edit news form.
6. Build preview and editorial checklist.
7. Finish public newsroom/detail rendering.
8. Complete SEO/AEO metadata.
9. Complete archive separation.
10. Complete AI planner scheduling/source ingestion only after source contracts are verified.
11. Complete social draft/publishing integration.
12. Run mobile/accessibility/security tests.
13. Run deployment readiness audit.
14. STOP and request owner approval.
15. Only after explicit approval: merge/deploy.

## 14. GitHub workflow
Current PR #47 is draft and must remain draft.
Do not merge it.
Do not push to main.
Keep all implementation changes on the draft branch unless owner explicitly says otherwise.

## 15. Definition of done
The site is considered full-version ready only when:
- real BTMEDYA media is selectable from the admin
- news records reference media correctly
- public news pages render real media
- archive/current distinction is explicit
- SEO/AEO data is valid
- mobile UI works
- AI drafts require human approval
- social credentials are configured only through secrets
- Cloudflare bindings and Worker secrets are verified
- no fake placeholder production content remains
- deployment readiness checks pass

Then stop for owner approval.