---
name: btmedya-production-web
version: 1
description: BTMEDYA production web development and publishing workflow.
---

# BTMEDYA Production Web

## Canonical architecture
- Repository: BTmedyajans/Btmedya-db
- Branch: main
- Worker: btmedya-db
- D1: btmedya-media
- R2: btmedya-media
- Legacy R2: btmedya-r2, read-only fallback
- Public site: https://btmedya.com.tr/

## Design rules
- Preserve the cinematic scroll/storybeat/parallax language already implemented.
- Use real BTMEDYA media first for documentary, portfolio and newsroom content.
- AI-generated media belongs only in AI LAB and must be labeled AI ÜRETİMİ.
- Never invent testimonials, prices, statistics, references, dates or media provenance.
- Preserve natural identity in supplied portraits and do not alter facial structure.
- Mobile and reduced-motion paths must remain usable without pointer or mouse interaction.

## Editorial rules
- Keep source URL, original date and archive note for sourced stories.
- Do not copy third-party articles wholesale.
- Do not publish media with unclear rights or provenance.
- Do not present historical prices or historical reporting as current without verification.

## Production rules
- Do not introduce Manus, Hostinger, FastAPI, Convex or a second production database.
- Adobe, CloudConvert and Morphix are optional workbench tools, not runtime dependencies.
- Deploy through .github/workflows/deploy.yml.
- After changes, verify home, Source Desk, robots, sitemap, health, public media and real/AI labels.
- Do not create a second production deploy workflow unless the canonical one is deliberately replaced.
