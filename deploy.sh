#!/usr/bin/env bash
# BTMEDYA production deploy
# Gereksinim: Wrangler kimlik doğrulaması veya CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

command -v npx >/dev/null 2>&1 || { echo "npx bulunamadı." >&2; exit 1; }
test -s wrangler.toml || { echo "wrangler.toml bulunamadı." >&2; exit 1; }
test -s src/worker.js || { echo "src/worker.js bulunamadı." >&2; exit 1; }
test -d public || { echo "public dizini bulunamadı." >&2; exit 1; }

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && -z "${CLOUDFLARE_API_KEY:-}" ]]; then
  npx wrangler whoami >/dev/null
fi

printf '%s\n' '=== BTMEDYA deploy ön kontrolü ==='
node --check src/worker.js
npx wrangler deploy --dry-run --config wrangler.toml
printf '%s\n' '=== BTMEDYA Worker deploy ==='
npx wrangler deploy --config wrangler.toml
printf '%s\n' '=== Health check ==='
for url in https://btmedya.com.tr/api/health https://btmedya-db.workers.dev/api/health; do
  if curl -fsS --max-time 20 "$url" | python3 -m json.tool; then
    exit 0
  fi
done
echo 'Health check başarısız.' >&2
exit 1
