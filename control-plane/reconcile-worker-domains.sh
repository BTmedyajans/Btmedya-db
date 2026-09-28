#!/usr/bin/env bash
set -euo pipefail

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

domains="$(cf GET "/accounts/$ACCOUNT_ID/workers/domains?zone_id=$zone_id&per_page=100")"
if [[ "$(jq -r '.success // false' <<<"$domains")" != "true" ]]; then
  echo "ACTION REQUIRED: Worker Custom Domain listesi okunamadı. Workers Scripts Read yetkisini kontrol edin."
  jq -c '{success,errors,messages}' <<<"$domains" || true
  exit 1
fi

attach_if_missing() {
  local hostname="$1"
  local existing service status body out
  existing="$(jq -c --arg h "$hostname" '.result[]? | select(.hostname==$h)' <<<"$domains" | head -n1)"

  if [[ -n "$existing" ]]; then
    service="$(jq -r '.service // ""' <<<"$existing")"
    status="$(jq -r '.status // ""' <<<"$existing")"
    if [[ "$service" == "$WORKER" ]]; then
      echo "OK: $hostname -> $WORKER (status=$status)"
      return 0
    fi
    echo "ACTION REQUIRED: $hostname başka bir Worker'a bağlı (service=$service). Mevcut domain değiştirilmedi."
    return 2
  fi

  echo "ATTACH: $hostname -> $WORKER"
  body="$(jq -n --arg hostname "$hostname" --arg service "$WORKER" --arg zone_id "$zone_id" --arg zone_name "$ZONE_NAME"     '{hostname:$hostname,service:$service,zone_id:$zone_id,zone_name:$zone_name}')"
  out="$(cf PUT "/accounts/$ACCOUNT_ID/workers/domains" "$body")"

  if [[ "$(jq -r '.success // false' <<<"$out")" != "true" ]]; then
    echo "ACTION REQUIRED: $hostname bağlanamadı. Cloudflare tokenında Workers Scripts Write yetkisi gerekli olabilir."
    jq -c '{success,errors,messages}' <<<"$out" || true
    return 1
  fi
  echo "ATTACHED: $hostname -> $WORKER"
}

failed=0
attach_if_missing "$ZONE_NAME" || failed=1
attach_if_missing "www.$ZONE_NAME" || failed=1

if [[ "$failed" -ne 0 ]]; then
  echo "RECONCILE FAILED"
  exit 1
fi

echo "RECONCILE COMPLETE"
