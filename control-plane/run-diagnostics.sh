#!/usr/bin/env bash
# control-plane/run-diagnostics.sh
# Local diagnostic script to check btmedya Worker health, www redirect,
# R2/D1 bindings and common route issues. Run from any machine with curl & jq.

set -euo pipefail
WWW_DOMAIN="www.btmedya.com.tr"
APEX_DOMAIN="btmedya.com.tr"
HEALTH_URL="https://${APEX_DOMAIN}/api/health"
ROOT_URL="https://${APEX_DOMAIN}/"
WWW_URL="https://${WWW_DOMAIN}/"

command -v curl >/dev/null 2>&1 || { echo "curl not found. Install curl and retry."; exit 2; }
command -v jq >/dev/null 2>&1 || { echo "jq not found. Install jq (apt/yum/brew) and retry."; exit 2; }

echo "== BTMEDYA Remote Diagnostics =="

echo "\n1) /api/health"
health_code=$(curl -sS -o health.json -w '%{http_code}' "${HEALTH_URL}" || true)
if [[ "${health_code}" != "200" ]]; then
  echo "- /api/health returned HTTP ${health_code}. Save health.json for debugging."
else
  echo "- /api/health OK (200). Contents:" 
  cat health.json | jq '.' || cat health.json
fi

# Extract some common fields if present
if [[ -f health.json ]]; then
  ok=$(jq -r '.ok // empty' health.json 2>/dev/null || true)
  cms=$(jq -r '.cms // empty' health.json 2>/dev/null || true)
  r2=$(jq -r '.r2 // empty' health.json 2>/dev/null || true)
  r2Objects=$(jq -r '.r2Objects // empty' health.json 2>/dev/null || true)
  surum_id=$(jq -r '.surum.id // empty' health.json 2>/dev/null || true)
  surum_loaded=$(jq -r '.surum.yuklendi // empty' health.json 2>/dev/null || true)
  echo "  ok: ${ok}, cms: ${cms}, r2: ${r2}, r2Objects: ${r2Objects}"
  echo "  surum.id=${surum_id}, surum.yuklendi=${surum_loaded}"
fi


echo "\n2) Root page and www redirect"
root_code=$(curl -sS -o /dev/null -D root_headers.txt -w '%{http_code}' --max-time 20 "${ROOT_URL}" || true)
www_code=$(curl -sS -o /dev/null -D www_headers.txt -w '%{http_code}' --max-time 20 "${WWW_URL}" || true)

echo "- ${APEX_DOMAIN} HTTP: ${root_code}"
grep -iE '^(HTTP/|location:|server:|cf-ray:|cf-cache-status:)' root_headers.txt || true

echo "- ${WWW_DOMAIN} HTTP: ${www_code}"
grep -iE '^(HTTP/|location:|server:|cf-ray:|cf-cache-status:)' www_headers.txt || true

# Check whether www redirects to apex in a single step
redirect_url=$(awk '/^location:/ {print $2}' www_headers.txt | tr -d '\r' | head -n1 || true)
if [[ -n "${redirect_url}" ]]; then
  echo "  www redirects to: ${redirect_url}"
  if [[ "${redirect_url}" =~ ${APEX_DOMAIN} ]]; then
    echo "  -> Redirect target contains ${APEX_DOMAIN} (expected)."
  else
    echo "  -> Redirect target does not contain ${APEX_DOMAIN}. Review Cloudflare DNS/Redirect rules and wrangler routes."
  fi
else
  echo "  -> No Location header on www response. If you expect a 301 from www, check Cloudflare zone redirect rules or Worker routing/run_worker_first."
fi


echo "\n3) Static asset sample (ASSETS binding)"
# Try a known static asset path from public/ (adjust if necessary)
sample_asset="https://${APEX_DOMAIN}/assets/styles.css"
asset_code=$(curl -sS -o /dev/null -D asset_headers.txt -w '%{http_code}' --max-time 20 "${sample_asset}" || true)

echo "- Sample asset ${sample_asset} HTTP: ${asset_code}"
grep -iE '^(HTTP/|content-type:|cache-control:|cf-cache-status:|server:)' asset_headers.txt || true


echo "\n4) Suggestions (based on common failures)"
if [[ "${health_code}" != "200" ]]; then
  echo "- /api/health is failing: check Cloudflare Worker runtime logs, confirm D1/R2 bindings in Cloudflare dashboard and that database_id/bucket_name match wrangler.toml."
else
  echo "- /api/health OK: backend binding likely healthy. If public pages are wrong, check run_worker_first and routes in wrangler.toml and Cloudflare zone redirect rules."
fi

if [[ "${www_code}" != "301" && "${www_code}" != "308" ]]; then
  echo "- www redirect not present or not a single 301/308. Verify Cloudflare zone Redirect Rule for www -> apex OR ensure Worker route handles it and run_worker_first includes root/index paths."
fi

if [[ -f health.json ]]; then
  cms=$(jq -r '.cms // false' health.json)
  r2=$(jq -r '.r2 // false' health.json)
  if [[ "${cms}" != "true" || "${r2}" != "true" ]]; then
    echo "- One or more bindings reported false in /api/health. Confirm Worker bindings in Cloudflare: DB, MEDIA (R2), KV, WORKFLOW."
  fi
fi


echo "\nDiagnostics complete. Upload health.json, root_headers.txt and www_headers.txt to a support ticket or paste them here for further analysis."
exit 0
