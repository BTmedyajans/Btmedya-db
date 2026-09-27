#!/usr/bin/env bash
set -euo pipefail

API="https://api.cloudflare.com/client/v4"
ZONE_NAME="${ZONE_NAME:-btmedya.com.tr}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID gerekli}"
TOKEN="${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN gerekli}"
MODE="${MODE:-audit}"
DEST_EMAIL="${DEST_EMAIL:-busetuncay74@gmail.com}"
APPLY_DMARC="${APPLY_DMARC:-0}"
REMOVE_RESEND_RECORDS="${REMOVE_RESEND_RECORDS:-0}"

cf() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS --retry 2 --connect-timeout 15 --max-time 45 \
      -X "$method" "$API$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      --data "$body"
  else
    curl -sS --retry 2 --connect-timeout 15 --max-time 45 \
      -X "$method" "$API$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json"
  fi
}

require_success() {
  local label="$1"
  local response="$2"
  if [[ "$(jq -r '.success // false' <<<"$response")" != "true" ]]; then
    echo "ERROR: $label"
    jq -c '{success,errors,messages}' <<<"$response" || true
    return 1
  fi
}

echo "BTMEDYA Cloudflare control-plane"
echo "zone=$ZONE_NAME mode=$MODE"

zone=$(cf GET "/zones?name=$ZONE_NAME&status=active")
zone_success=$(jq -r '.success // false' <<<"$zone")
if [[ "$zone_success" != "true" ]]; then
  echo "WARNING: Cloudflare zone API okunamadı (token scope/izin olabilir)."
  jq -c '{errors,messages}' <<<"$zone" || true
  if [[ "$MODE" == "audit" ]]; then
    echo "AUDIT ONLY: zone erişimi olmayan token ile mutasyon yapılmadan çıkılıyor."
    exit 0
  fi
  exit 1
fi
zone_id=$(jq -r '.result[0].id // empty' <<<"$zone")
[[ -n "$zone_id" ]] || { echo "ERROR: Cloudflare zone bulunamadı: $ZONE_NAME"; exit 1; }

echo "zone_id=$zone_id"

dns=$(cf GET "/zones/$zone_id/dns_records?per_page=100")
require_success "DNS kayıtları okunamadı" "$dns"

page_rules=$(cf GET "/zones/$zone_id/pagerules?per_page=100")
# Page Rules uc noktasi hesaba ait (account-owned) token'lari kabul etmiyor
# (hata 1011). Onceden bu okuma betigi burada durduruyordu ve e-posta
# bolumune hic gelinmiyordu. Page Rules yalniz eski bir kurali silmek icin
# okunuyor; okunamazsa o adim atlanir, gerisi calisir.
if [[ "$(jq -r '.success // false' <<<"$page_rules")" != "true" ]]; then
  echo "WARNING: Page Rules okunamadı; eski kural temizliği atlanıyor."
  jq -c '{errors}' <<<"$page_rules" || true
  page_rules='{"success":true,"result":[]}'
fi

routing=$(cf GET "/zones/$zone_id/email/routing")
routing_dns=$(cf GET "/zones/$zone_id/email/routing/dns")
routing_rules=$(cf GET "/zones/$zone_id/email/routing/rules?per_page=100")
addresses=$(cf GET "/accounts/$ACCOUNT_ID/email/routing/addresses?per_page=100")

echo ""
echo "=== PAGE RULES ==="
jq -r '.result[]? | [(.id // ""), ((.targets[0].constraint.request_uri.value // "") | tostring), (.status // "")] | @tsv' <<<"$page_rules" || true

echo ""
echo "=== DNS ==="
jq -r '.result[]? | [.type,.name,.content,(.priority // ""),(.proxied // false)] | @tsv' <<<"$dns" | sed 's/	/ | /g' || true

echo ""
echo "=== EMAIL ROUTING ==="
jq -c '{success,enabled:(.result.enabled // null),status:(.result.status // null),name:(.result.name // null)}' <<<"$routing"
jq -c '{success,records:(.result // [])}' <<<"$routing_dns" 2>/dev/null || true

echo ""
echo "=== ROUTING DESTINATION ==="
jq -r --arg email "$DEST_EMAIL" '.result[]? | select(.email == $email) | [.id,.email,(.verified // "")] | @tsv' <<<"$addresses" || true

echo ""
echo "=== ROUTING RULES ==="
jq -r '.result[]? | [(.id // ""),(.name // ""),(.enabled // false),((.matchers // [])|tostring),((.actions // [])|tostring)] | @tsv' <<<"$routing_rules" || true

if [[ "$MODE" != "apply" ]]; then
  echo ""
  echo "AUDIT ONLY: no Cloudflare mutation performed."
  exit 0
fi

echo ""
echo "=== APPLY ==="

# 1) Page Rule: delete only the explicit legacy root rule requested for BTMEDYA.
while IFS= read -r rule_id; do
  [[ -z "$rule_id" ]] && continue
  rule=$(jq -c --arg id "$rule_id" '.result[]? | select(.id == $id)' <<<"$page_rules")
  target=$(jq -r '.targets[0].constraint.request_uri.value // ""' <<<"$rule")
  if [[ "$target" == "https://btmedya.com.tr/*" || "$target" == "http://btmedya.com.tr/*" || "$target" == "btmedya.com.tr/*" ]]; then
    echo "Deleting legacy Page Rule: $target ($rule_id)"
    out=$(cf DELETE "/zones/$zone_id/pagerules/$rule_id")
    require_success "Page Rule silinemedi: $target" "$out"
  fi
done < <(jq -r '.result[]?.id // empty' <<<"$page_rules")

# 2) Merge the Cloudflare Email Routing SPF include into the single root SPF record.
#    Existing includes such as Resend/Amazon SES are preserved.
# Cloudflare TXT icerigini tirnakli ("v=spf1 ...") dondurebiliyor; tirnak
# soyulmadan bakilinca mevcut SPF gorunmuyor ve ikinci bir SPF aciliyordu.
# Iki SPF kaydi RFC 7208'e gore permerror: tum giden posta dogrulamasi bozulur.
spf_records=$(jq -c '[.result[]? | select(.type == "TXT" and .name == $ARGS.positional[0] and (.content | ltrimstr("\"") | startswith("v=spf1")))]' --args "$ZONE_NAME" <<<"$dns")
spf_count=$(jq 'length' <<<"$spf_records")

if [[ "$spf_count" -eq 0 ]]; then
  echo "Creating root SPF with Cloudflare Email Routing include."
  out=$(cf POST "/zones/$zone_id/dns_records" "$(jq -n --arg name "$ZONE_NAME" '{type:"TXT",name:$name,content:"v=spf1 include:_spf.mx.cloudflare.net ~all",ttl:1}')")
  require_success "SPF oluşturulamadı" "$out"
else
  first_id=$(jq -r '.[0].id' <<<"$spf_records")
  # Preserve every existing SPF mechanism from the first record, remove only terminal
  # all-mechanisms, and add Cloudflare's Email Routing include exactly once.
  first_content=$(jq -r '.[0].content' <<<"$spf_records")
  merged=$(awk '{
    for (i=1;i<=NF;i++) {
      t=$i
      gsub(/^["\047]+|["\047]+$/, "", t)
      if (t=="v=spf1" || t=="~all" || t=="-all" || t=="+all" || t=="?all") continue
      if (t=="include:_spf.mx.cloudflare.net") continue
      if (!seen[t]++) order[++n]=t
    }
  }
  END {
    printf "v=spf1 include:_spf.mx.cloudflare.net"
    for (i=1;i<=n;i++) printf " %s", order[i]
    printf " ~all"
  }' <<<"$first_content")
  echo "Updating root SPF to a merged single policy: $merged"
  # Cloudflare DNS records do not expose a separate content SHA, so update by record id.
  out=$(cf PUT "/zones/$zone_id/dns_records/$first_id" "$(jq -n --arg name "$ZONE_NAME" --arg content "$merged" '{type:"TXT",name:$name,content:$content,ttl:1}')")
  require_success "SPF güncellenemedi" "$out"
  if [[ "$spf_count" -gt 1 ]]; then
    echo "WARNING: multiple root SPF records existed. Extra records are left untouched for audit safety."
  fi
fi
# 3) Optional DMARC change requested by the project brief. Off by default.
if [[ "$APPLY_DMARC" == "1" ]]; then
  dmarc=$(jq -c '[.result[]? | select(.type == "TXT" and .name == ("_dmarc." + $ARGS.positional[0]))]' --args "$ZONE_NAME" <<<"$dns")
  dmarc_value='v=DMARC1; p=quarantine; rua=mailto:busetuncay74@gmail.com; ruf=mailto:busetuncay74@gmail.com; fo=1'
  if [[ "$(jq 'length' <<<"$dmarc")" -gt 0 ]]; then
    dmarc_id=$(jq -r '.[0].id' <<<"$dmarc")
    out=$(cf PUT "/zones/$zone_id/dns_records/$dmarc_id" "$(jq -n --arg name "_dmarc.$ZONE_NAME" --arg content "$dmarc_value" '{type:"TXT",name:$name,content:$content,ttl:1}')")
  else
    out=$(cf POST "/zones/$zone_id/dns_records" "$(jq -n --arg name "_dmarc.$ZONE_NAME" --arg content "$dmarc_value" '{type:"TXT",name:$name,content:$content,ttl:1}')")
  fi
  require_success "DMARC güncellenemedi" "$out"
fi

# 4) Destination address is safe to create automatically, but must be verified by the owner.
address_id=$(jq -r --arg email "$DEST_EMAIL" '.result[]? | select(.email == $email) | .id' <<<"$addresses" | head -n1)
address_verified=$(jq -r --arg email "$DEST_EMAIL" '.result[]? | select(.email == $email) | .verified // ""' <<<"$addresses" | head -n1)

if [[ -z "$address_id" ]]; then
  echo "Creating Email Routing destination: $DEST_EMAIL"
  out=$(cf POST "/accounts/$ACCOUNT_ID/email/routing/addresses" "$(jq -n --arg email "$DEST_EMAIL" '{email:$email}')")
  if [[ "$(jq -r '.success // false' <<<"$out")" != "true" ]]; then
    code="$(jq -r '.errors[0].code // ""' <<<"$out")"
    message="$(jq -r '.errors[0].message // ""' <<<"$out")"
    if [[ "$code" == "10000" && "$message" == "Authentication error" ]]; then
      echo "ACTION REQUIRED: Cloudflare API tokenında Account > Email Routing Addresses > Write (Email Routing Addresses Write) yetkisi gerekli."
      echo "Bu yetki /accounts/$ACCOUNT_ID/email/routing/addresses hedef adres oluşturma API'si içindir."
    fi
    require_success "Email Routing hedef adresi oluşturulamadı" "$out"
  fi
  address_id=$(jq -r '.result.id // empty' <<<"$out")
  address_verified=$(jq -r '.result.verified // ""' <<<"$out")
  echo "Verification email sent to $DEST_EMAIL."
fi

if [[ -z "$address_verified" ]]; then
  echo ""
  echo "ACTION REQUIRED: $DEST_EMAIL adresindeki Cloudflare doğrulama e-postasını onaylayın."
  echo "Doğrulama tamamlanmadan Email Routing kuralları oluşturulmadı; DNS/MX yönlendirmesi değiştirilmedi."
  exit 0
fi

# 5) Enable Email Routing DNS. Cloudflare adds/locks the service's required MX/SPF/DKIM records.
echo "Enabling Cloudflare Email Routing for $ZONE_NAME"
enable_out=$(cf POST "/zones/$zone_id/email/routing/dns" "$(jq -n --arg name "$ZONE_NAME" '{name:$name}')")
if [[ "$(jq -r '.success // false' <<<"$enable_out")" != "true" ]]; then
  echo "Email Routing enable returned an error; no speculative MX deletion will be attempted."
  jq -c '{success,errors,messages}' <<<"$enable_out"
  exit 1
fi

# 6) Remove only the old apex MX that is explicitly known to point at btmedyajans.com.
dns_after=$(cf GET "/zones/$zone_id/dns_records?per_page=100&type=MX")
legacy_ids=$(jq -r '.result[]? | select(.name == "'$ZONE_NAME'" and .content == "btmedyajans.com") | .id' <<<"$dns_after")
while IFS= read -r legacy_id; do
  [[ -z "$legacy_id" ]] && continue
  echo "Deleting legacy apex MX: btmedyajans.com ($legacy_id)"
  out=$(cf DELETE "/zones/$zone_id/dns_records/$legacy_id")
  require_success "Legacy MX silinemedi" "$out"
done <<<"$legacy_ids"

# 7) The send.* MX is intentionally preserved by default because the repository uses Resend.
#    It is removed only when REMOVE_RESEND_RECORDS=1 is explicitly supplied.
if [[ "$REMOVE_RESEND_RECORDS" == "1" ]]; then
  send_dns=$(cf GET "/zones/$zone_id/dns_records?per_page=100&type=MX&name=send.$ZONE_NAME")
  while IFS= read -r send_id; do
    [[ -z "$send_id" ]] && continue
    send_content=$(jq -r --arg id "$send_id" '.result[] | select(.id == $id) | .content' <<<"$send_dns")
    if [[ "$send_content" == feedback-smtp.*.amazonses.com || "$send_content" == feedback-smtp.*.amazon.com ]]; then
      echo "Removing explicit Resend/Amazon SES send MX because REMOVE_RESEND_RECORDS=1"
      out=$(cf DELETE "/zones/$zone_id/dns_records/$send_id")
      require_success "send MX silinemedi" "$out"
    fi
  done < <(jq -r '.result[]?.id // empty' <<<"$send_dns")
else
  echo "Preserving send.* MX: Resend uses a send subdomain MX for its return path."
fi

# 8) Create missing routing rules.
rules_now=$(cf GET "/zones/$zone_id/email/routing/rules?per_page=100")
create_rule() {
  local name="$1"
  local matcher_type="$2"
  local matcher_value="$3"
  local body
  body=$(jq -n --arg name "$name" --arg value "$matcher_value" --arg dest "$DEST_EMAIL" '{name:$name,enabled:true,matchers:[{type:"literal",field:"to",value:$value}],actions:[{type:"forward",value:[$dest]}]}')
  out=$(cf POST "/zones/$zone_id/email/routing/rules" "$body")
  require_success "Routing rule oluşturulamadı: $name" "$out"
}
ensure_literal_rule() {
  local localpart="$1"
  local name="BTMEDYA $localpart"
  local address="$localpart@$ZONE_NAME"
  exists=$(jq -r --arg address "$address" '[.result[]? | select(any(.matchers[]?; .type=="literal" and .field=="to" and .value==$address))] | length' <<<"$rules_now")
  if [[ "$exists" == "0" ]]; then
    echo "Creating routing rule: $address -> $DEST_EMAIL"
    create_rule "$name" "literal" "$address"
  fi
}
ensure_literal_rule "info"
ensure_literal_rule "admin"

# Catch-all normal kural listesinde degil, kendi uc noktasinda tutuluyor;
# POST /rules ile "all" eslestiricisi reddedilir.
catchall=$(cf GET "/zones/$zone_id/email/routing/rules/catch_all")
catchall_ok=$(jq -r --arg dest "$DEST_EMAIL" '(.result.enabled // false) and any(.result.actions[]?; .type=="forward" and ((.value // []) | index($dest)))' <<<"$catchall" 2>/dev/null || echo false)
if [[ "$catchall_ok" != "true" ]]; then
  echo "Setting catch-all routing rule -> $DEST_EMAIL"
  out=$(cf PUT "/zones/$zone_id/email/routing/rules/catch_all" "$(jq -n --arg dest "$DEST_EMAIL" '{name:"BTMEDYA Catch-all",enabled:true,matchers:[{type:"all"}],actions:[{type:"forward",value:[$dest]}]}')")
  require_success "Catch-all kuralı ayarlanamadı" "$out"
fi

echo ""
echo "APPLY completed."
echo "NOT: send.* Resend MX korundu; yalnızca REMOVE_RESEND_RECORDS=1 verilirse silinir."
