# BTMEDYA Canonical Resource Map

Tarih: 24 Eylül 2026

## Production source of truth

- GitHub: BTmedyajans/Btmedya-db
- Production branch: main
- Worker: btmedya-db
- Domain: https://btmedya.com.tr
- Data: Cloudflare D1 `btmedya-media`
- Media: Cloudflare R2 `btmedya-media`
- Admin: `/admin/`

GitHub -> Cloudflare Worker -> D1/R2 -> btmedya.com.tr is the canonical production chain. Cloudflare is designed for the site's edge, storage and application layer, so the project should not be split into another production backend merely to accommodate a prototype.

## Archive and media policy

Google Drive is the master/original archive when account access is available.
R2 stores only web-ready/selected media.
D1 stores metadata, usage and editorial state.
AI-generated material stays isolated under AI LAB and is explicitly labeled.
Real photography/video remains the default public portfolio/news source.

## Sources adopted from prior work

### Adopt into production
- V11/V12 visual language: cinematic hero, editorial typography, responsive/mobile behavior.
- Media Vault: R2 + D1 metadata, category and platform suitability.
- Social Studio concepts: account registry, content queue, trend records, run logs, media requests.
- News Finder: source discovery -> draft -> editorial approval -> publication.
- AI Draft: source-grounded draft generation, never automatic publication.
- Kaynak Masası: official/local sources, source URL, date, license/provenance.
- SEO/AEO: sitemap, schema, metadata, Core Web Vitals and mobile hardening.

### Reference only, not production runtime
- Macaly BTMedya V12 Preview and BTMedya Web are visual/staging references. Their TanStack/Convex stack must not replace the canonical Worker/D1/R2 stack.
- Macaly BTMedya Sosyal Medya Ajanı contains useful workflow ideas, but its Convex backend remains a reference. Equivalent concepts belong in the canonical Worker/D1 admin system.
- Manus/Hostinger/Güzelhosting are not part of the production application chain according to AGENTS.md.

### Specialist tools
- Adobe: batch image/video preparation, brand asset work and social-format exports.
- CloudConvert: one-off archive conversion, PDF/image/video conversion, metadata extraction and compression. Not a runtime dependency.
- Morphix: optional AI LAB image/video generation or upscaling. Outputs remain isolated from real-media/news content.
- Consensus: research support for technical/editorial background when peer-reviewed evidence is needed. It is not a content publisher.
- Midpage Legal Research: only for legal research when a story or site policy needs US primary-law research. It is not part of the public site's runtime.
- Google Drive: master media/archive source when connected. Do not make Drive the public serving layer.
- FastAPI: not needed for the current production architecture. Adding a Python API would duplicate Worker responsibilities.
- Macaly Cloud: staging/reference/prototyping only unless a future migration is explicitly chosen.
- CloudConvert/Adobe/Morphix should be invoked as production-workbench tools, not embedded as mandatory site dependencies.

## Cleanup policy

Keep:
- original media
- current production source
- V11/V12 design decisions
- Media Vault/R2 structure
- Kaynak Masası canonical copy
- SEO/AEO material
- deploy/health/control-center evidence that documents current production

Archive:
- duplicate PDFs/Markdown copies
- old build logs
- duplicate deploy scripts
- duplicate Social Studio ZIPs
- generic skill ZIPs that are not part of the BTMEDYA runtime

Do not delete raw media merely because it is not currently used on the homepage. It belongs in the master/archive layer until provenance and reuse are checked.

## Next implementation order

1. Verify live deployment of current main.
2. Verify /api/health, /api/news, /api/public/media and /admin/.
3. Complete Cloudflare Worker secrets for admin, media signing, OpenAI and social OAuth.
4. Connect Google Drive master archive when authorized.
5. Build Media Vault import -> classify -> crop/thumbnail -> metadata -> R2 flow.
6. Add social account status and content queue to Control Center.
7. Add trend/rival/source monitoring as draft-only intelligence.
8. Add editor approval gates before every external publication.
