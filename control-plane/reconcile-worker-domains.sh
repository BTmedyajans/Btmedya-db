#!/usr/bin/env bash
set -euo pipefail

# 2026-10-01 production repair: reconcile missing apex/www Worker custom-domain DNS.
# Read access to the Worker-domain list is preferred but not required: when the
# public hostname has no A/AAAA/CNAME answer, a token with Workers Scripts Write
# can safely attempt the idempotent custom-domain attach.
API="https://api.cloudflare.com/client/v4"
ZONE_NAME="${ZONE_NAME:-btmedya.com.tr}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID gerekli}"
TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN gerekli}"
WORKER="${WORKER_NAME:-btmedya-db}"

cf() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local args=(-sS --retry 2 --connect-timeout 15 --max-time 45
    -X "$method" "$API$path"
    -H "Authorization: Bearer $TOKEN"
    -H "Content-Type: application/json")
  if [[ -n "$body" ]]; then args+=(--data "$body"); fi
  curl "${args[@]}"
}

echo "BTMEDYA Worker Custom Domain reconcile"
echo "zone=$ZONE_NAME worker=$WORKER"

zone="$(cf GET "/zones?name=$ZONE_NAME&status=active&per_page=10")"
if [[ "$(jq -r '.success // false' <<<"$zone")" != "true" ]]; then
  echo "ACTION REQUIRED: Cloudflare zone sorgusu başarısız."
  jq -c '{success,errors,messages}' <<<"$zone" || true
  exit 1
fi
zone_id="$(jq -r '.result[] | select(.name=="'"$ZONE_NAME"'") | .id' <<<"$zone" | head -n1)"
if [[ -z "$zone_id" ]]; then
  echo "ACTION REQUIRED: $ZONE_NAME zone bulunamadı."
  exit 1
fi

list_ok="false"
domains="$(cf GET "/accounts/$ACCOUNT_ID/workers/domains?zone_id=$zone_id&service=$WORKER&zone_name=$ZONE_NAME")" || domains=""
if [[ -n "$domains" && "$(jq -r '.success // false' <<<"$domains")" == "true" ]]; then
  list_ok="true"
  echo "Worker domain listesi okundu."
  jq -r '.result[]? | "DOMAIN: \(.hostname) -> \(.service)"' <<<"$domains" || true
else
  echo "WARN: Worker Custom Domain listesi okunamadı; read yetkisi yok olabilir."
  [[ -n "$domains" ]] && jq -c '{success,errors,messages}' <<<"$domains" || true
  echo "SAFE WRITE MODE: Public DNS kaydı olmayan hostname için idempotent attach yine denenecek."
fi

attach_if_dns_missing() {
  local hostname="$1"
  local a aaaa cname body out

  a="$(dig +short A "$hostname" @1.1.1.1 | sed '/^$/d' | head -n1 || true)"
  aaaa="$(dig +short AAAA "$hostname" @1.1.1.1 | sed '/^$/d' | head -n1 || true)"
  cname="$(dig +short CNAME "$hostname" @1.1.1.1 | sed '/^$/d' | head -n1 || true)"

  if [[ -n "$a" || -n "$aaaa" || -n "$cname" ]]; then
    echo "OK/REVIEW: $hostname public DNS kayıt döndürüyor. Var olan DNS'e dokunulmadı (A=$a AAAA=$aaaa CNAME=$cname)."
    return 0
  fi

  if [[ "$list_ok" == "true" ]] && jq -e --arg hostname "$hostname" '.result[]? | select(.hostname == $hostname)' <<<"$domains" >/dev/null; then
    echo "OK: $hostname zaten Worker custom domain olarak bağlı."
    return 0
  fi

  echo "ATTACH: $hostname -> $WORKER (public DNS kaydı yok)"
  body="$(jq -n --arg hostname "$hostname" --arg service "$WORKER" --arg zone_id "$zone_id" --arg zone_name "$ZONE_NAME" '{hostname:$hostname,service:$service,zone_id:$zone_id,zone_name:$zone_name}')"
  out="$(cf PUT "/accounts/$ACCOUNT_ID/workers/domains" "$body")"

  if [[ "$(jq -r '.success // false' <<<"$out")" != "true" ]]; then
    if jq -e '
      [.errors[]?.message // ""]
      | any(test("already.*(exist|attach|configured)|already attached|duplicate"; "i"))
    ' <<<"$out" >/dev/null; then
      echo "OK: $hostname için Cloudflare mevcut bağlantıyı bildirdi; değişiklik yapılmadı."
      return 0
    fi
    echo "ACTION REQUIRED: $hostname bağlanamadı. Cloudflare tokenında Workers Scripts Write yetkisi gerekli olabilir."
    jq -c '{success,errors,messages}' <<<"$out" || true
    return 1
  fi
  echo "ATTACHED: $hostname -> $WORKER"
}

failed=0
attach_if_dns_missing "$ZONE_NAME" || failed=1
attach_if_dns_missing "www.$ZONE_NAME" || failed=1

if [[ "$failed" -ne 0 ]]; then
  echo "RECONCILE FAILED"
  exit 1
fi

echo "RECONCILE COMPLETE"
