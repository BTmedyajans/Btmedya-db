#!/usr/bin/env bash
# Aday token'ları dener; değerler hiçbir zaman yazdırılmaz, yalnız secret adları.
set -uo pipefail
HESAP="${CLOUDFLARE_ACCOUNT_ID:-b239acae17aebe894ea76309fe32cdce}"
ALAN="${ZONE_NAME:-btmedya.com.tr}"
API="https://api.cloudflare.com/client/v4"
istek() { curl -sS --retry 2 --connect-timeout 10 --max-time 30 -H "Authorization: Bearer $1" "$API$2" 2>/dev/null || echo '{}'; }
basari() { jq -r '.success // false' <<<"$1" 2>/dev/null; }

gecerli() {  # Kullanıcı ya da hesap token'ı olabilir.
  local y; y="$(istek "$1" /user/tokens/verify)"
  [[ "$(jq -r '.result.status // empty' <<<"$y")" == active ]] && return 0
  y="$(istek "$1" "/accounts/$HESAP/tokens/verify")"
  [[ "$(jq -r '.result.status // empty' <<<"$y")" == active ]]
}
yetkili() {
  local y
  case "$GEREK" in
    zone)    y="$(istek "$1" "/zones?name=$ALAN")"; [[ "$(basari "$y")" == true && -n "$(jq -r '.result[0].id // empty' <<<"$y")" ]] ;;
    workers) y="$(istek "$1" "/accounts/$HESAP/workers/scripts")"; [[ "$(basari "$y")" == true ]] ;;
    d1)      y="$(istek "$1" "/accounts/$HESAP/d1/database?per_page=1")"; [[ "$(basari "$y")" == true ]] ;;
    r2)      y="$(istek "$1" "/accounts/$HESAP/r2/buckets")"; [[ "$(basari "$y")" == true ]] ;;
    any)     return 0 ;;
    *)       echo "::error::Bilinmeyen gerek: $GEREK"; return 1 ;;
  esac
}

secilen=""
{
  echo "### Cloudflare token seçimi (gereken yetki: \`$GEREK\`)"
  echo "| Secret | Durum |"
  echo "|---|---|"
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
for ad in CLOUDFLARE_DEPLOY_TOKEN CLOUDFLARE_API_TOKEN BTMEDYA_DB1 BTMEDYA_D1 CLOUDFLARE_D1_API_TOKEN; do
  degisken="ADAY_$ad"; tok="${!degisken:-}"
  if [[ -z "$tok" ]]; then durum="tanımlı değil"
  elif ! gecerli "$tok"; then durum="❌ geçersiz ya da iptal edilmiş (GitHub'dan silin)"
  elif ! yetkili "$tok"; then durum="⚠️ geçerli ama \`$GEREK\` yetkisi yok"
  elif [[ -z "$secilen" ]]; then durum="✅ seçildi"; secilen="$ad"
    echo "::add-mask::$tok"
    { echo "CLOUDFLARE_API_TOKEN=$tok"; echo "CF_TOKEN_SECILEN=$ad"; } >> "$GITHUB_ENV"
  else durum="✅ uygun (yedek)"; fi
  echo "| \`$ad\` | $durum |" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
  echo "$ad: $durum"
done

if [[ -z "$secilen" ]]; then
  echo "CF_TOKEN_YOK=1" >> "$GITHUB_ENV"
  mesaj="Uygun Cloudflare token yok (gereken: $GEREK). Cloudflare > My Profile > API Tokens'ta bu yetkiyle bir token oluşturup GitHub Secrets'a CLOUDFLARE_API_TOKEN olarak ekleyin; geçersiz görünen secret'ları silin."
  if [[ "${ZORUNLU:-true}" == true ]]; then echo "::error::$mesaj"; exit 1; fi
  echo "::warning::$mesaj"
fi
exit 0
