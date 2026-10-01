#!/usr/bin/env bash
set -euo pipefail

BASE_DOMAIN="${BASE_DOMAIN:-btmedya.com.tr}"
WWW_DOMAIN="${WWW_DOMAIN:-www.btmedya.com.tr}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
TOKEN="${CLOUDFLARE_API_TOKEN:-}"
API="https://api.cloudflare.com/client/v4"
REPORT="${REPORT_FILE:-btmedya-production-report.txt}"

: > "$REPORT"
exec > >(tee -a "$REPORT") 2>&1

section() { printf "\n===== %s =====\n" "$1"; }
ok() { printf "[OK] %s\n" "$1"; }
warn() { printf "[WARN] %s\n" "$1"; }
fail() { printf "[FAIL] %s\n" "$1"; }

section "BTMEDYA PRODUCTION DIAGNOSTIC"
printf "Time: %s\nDomain: %s\nWWW: %s\n" "$(date -u +%FT%TZ)" "$BASE_DOMAIN" "$WWW_DOMAIN"

if [[ -z "$ACCOUNT_ID" || -z "$TOKEN" ]]; then
  fail "CLOUDFLARE_ACCOUNT_ID veya CLOUDFLARE_API_TOKEN eksik"
  exit 2
fi

auth=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

section "CLOUDFLARE ZONE"
if ! zones="$(curl -fsS "$API/zones?name=$BASE_DOMAIN&per_page=50" "${auth[@]}")"; then
  warn "Cloudflare zone API HTTP 403/erişim hatası verdi; token zone-scope taşımıyor olabilir. Zone-dependent kontroller atlanıyor."
  zone_id=""
  zone_status=""
  required_ns=""
else
  zone_id="$(jq -r '.result[] | select(.name=="'"$BASE_DOMAIN"'") | .id' <<<"$zones" | head -n1)"
  zone_status="$(jq -r '.result[] | select(.name=="'"$BASE_DOMAIN"'") | .status' <<<"$zones" | head -n1)"
  required_ns="$(jq -r '.result[] | select(.name=="'"$BASE_DOMAIN"'") | .name_servers[]?' <<<"$zones" | sort -u)"
  if [[ -n "$zone_id" && "$zone_id" != "null" ]]; then ok "Zone bulundu: $zone_id"; else warn "Zone Cloudflare API üzerinden görünmüyor"; zone_id=""; fi
  if [[ -n "$zone_id" ]]; then
    [[ "$zone_status" == "active" ]] && ok "Zone active" || warn "Zone status: $zone_status"
    printf "Cloudflare assigned nameservers:\n%s\n" "$required_ns"
  fi
fi

section "AUTHORITATIVE DNS DELEGATION"
actual_ns="$(dig +short NS "$BASE_DOMAIN" @1.1.1.1 | sed 's/\.$//' | sort -u || true)"
printf "Public NS:\n%s\n" "$actual_ns"
if [[ -n "$required_ns" && -n "$actual_ns" ]] && diff -q <(printf '%s\n' "$required_ns") <(printf '%s\n' "$actual_ns") >/dev/null 2>&1; then
  ok "Registrar delegation Cloudflare nameserver'ları ile eşleşiyor"
else
  warn "Public NS ile Cloudflare assigned NS eşleşmiyor veya henüz yayılmamış"
fi

section "DNS SAFETY CHECK"
if [[ -z "$zone_id" ]]; then
  warn "Zone ID yok; Cloudflare DNS record safety check atlandı."
else
  records_http="$(curl -sS -o /tmp/btmedya-dns-records.json -w '%{http_code}' "$API/zones/$zone_id/dns_records?per_page=5000" "${auth[@]}" || true)"
  if [[ "$records_http" == "200" ]]; then
    records="$(cat /tmp/btmedya-dns-records.json)"
    jq -r '.result[] | select(
      (.name=="chatgpt.'"$BASE_DOMAIN"'" and .type=="A" and .content=="192.0.2.1")
      or (.name=="'"$WWW_DOMAIN"'" and .type=="CNAME" and .content=="public.r2.dev")
    ) | [.type,.name,.content] | @tsv' <<<"$records" > /tmp/btmedya-conflicts
    if [[ ! -s /tmp/btmedya-conflicts ]]; then
      ok "Bilinen eski/placeholder web DNS çakışması yok"
    else
      warn "Bilinen eski/placeholder kayıt bulundu:"
      cat /tmp/btmedya-conflicts
    fi
    printf "Web DNS kayıt özeti:\n"
    jq -r '.result[] | select(.name=="'"$BASE_DOMAIN"'" or .name=="'"$WWW_DOMAIN"'" or .name=="chatgpt.'"$BASE_DOMAIN"'") | [.type,.name,.content,(.proxied|tostring)] | @tsv' <<<"$records" || true
  else
    warn "DNS kayıt listesi Cloudflare API tarafından HTTP $records_http ile okunamadı; diagnostic DNS'i değiştirmeden devam ediyor."
  fi
fi
printf "Not: MX/TXT/SPF/DKIM/DMARC kayıtları bu diagnostic tarafından değiştirilmez.\n"

section "PUBLIC HTTPS"
for host in "$BASE_DOMAIN" "$WWW_DOMAIN"; do
  echo "--- https://$host/ ---"
  curl -sSIL --max-time 20 "https://$host/" | sed -n '1,18p' || true
done

section "APPLICATION HEALTH"
health_headers="$(mktemp)"
health_body="$(mktemp)"
health_code="$(curl -sS -o "$health_body" -D "$health_headers" -w '%{http_code}' --max-time 20 "https://$BASE_DOMAIN/api/health" || true)"
printf "HTTP: %s\n" "$health_code"
sed -n '1,20p' "$health_headers" || true
cat "$health_body" || true
echo
if [[ "$health_code" == "200" ]]; then ok "/api/health HTTP 200"; elif [[ "$health_code" == "403" ]]; then warn "/api/health 403: katman kaynağı ayrıca incelenmeli"; else warn "/api/health beklenmeyen durum: $health_code"; fi

section "WWW REDIRECT"
redirect_headers="$(mktemp)"
redirect_code="$(curl -sS -o /dev/null -D "$redirect_headers" -w '%{http_code}' --max-time 20 "https://$WWW_DOMAIN/" || true)"
printf "HTTP: %s\n" "$redirect_code"
grep -iE '^(HTTP/|location:|server:|cf-ray:|cf-cache-status:)' "$redirect_headers" || true
if [[ "$redirect_code" == "301" || "$redirect_code" == "308" ]]; then ok "WWW yönlendirme yanıtı mevcut"; else warn "WWW yönlendirmesi beklenen 301/308 değil"; fi

section "LIVE WORKER VERSION"
live_version="$(jq -r '.surum.id // empty' "$health_body" 2>/dev/null || true)"
live_loaded="$(jq -r '.surum.yuklendi // empty' "$health_body" 2>/dev/null || true)"
if [[ "$health_code" == "200" && -n "$live_version" && -n "$live_loaded" ]]; then
  ok "Canlı Worker sürümü /api/health üzerinden doğrulandı: id=$live_version yuklendi=$live_loaded"
else
  warn "Canlı Worker sürüm metadata'sı /api/health üzerinden doğrulanamadı"
fi

section "R2 / D1 LIVE BINDINGS"
r2_ok="$(jq -r '.r2 // false' "$health_body" 2>/dev/null || echo false)"
cms_ok="$(jq -r '.cms // false' "$health_body" 2>/dev/null || echo false)"
r2_objects="$(jq -r '.r2Objects // false' "$health_body" 2>/dev/null || echo false)"
if [[ "$r2_ok" == "true" && "$r2_objects" == "true" ]]; then
  ok "R2 canlı Worker üzerinden doğrulandı"
else
  warn "R2 canlı Worker üzerinden doğrulanamadı"
fi
if [[ "$cms_ok" == "true" ]]; then
  ok "CMS/D1 canlı Worker üzerinden doğrulandı"
else
  warn "CMS/D1 canlı Worker üzerinden doğrulanamadı"
fi
echo "Not: Wrangler account-list endpointleri token kapsamına bağlıdır; canlı sağlık kontrolü başarılıysa bu listeleme endpointleri diagnostic sonucu bozmaz."

section "CONFIG CONSISTENCY"
grep -nE '^(name|main|compatibility_date)|custom_domain|bucket_name|database_name|database_id|run_worker_first' wrangler.toml || true
grep -RniE 'dimitris\.ns\.cloudflare\.com|katja\.ns\.cloudflare\.com|dax\.ns\.cloudflare\.com|emerie\.ns\.cloudflare\.com|e3b0c442|btmedyajans\.com|public\.r2\.dev|100::|192\.0\.2\.1' --exclude-dir=.git . || true

section "RESULT"
echo "Diagnostic tamamlandı. WARN/FAIL satırları manuel veya güvenli repair gerektirebilir."
