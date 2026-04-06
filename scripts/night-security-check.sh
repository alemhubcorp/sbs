#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${RUFLO_BASE_URL:-http://localhost:3000}"
KC_URL="${RUFLO_KEYCLOAK_URL:-http://localhost:8080}"

tmpdir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

request() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  local auth="${4:-}"
  local outfile="${5:-$tmpdir/out.json}"

  local args=(
    -sS
    --retry 2
    --retry-connrefused
    -X "$method"
    -o "$outfile"
    -w "%{http_code}"
  )

  if [[ -n "$auth" ]]; then
    args+=(-H "Authorization: Bearer $auth")
  fi

  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" --data "$body")
  fi

  curl "${args[@]}" "$url"
}

token_for() {
  local username="$1"
  local password="$2"
  local outfile="$tmpdir/token.json"
  curl -sS --retry 2 --retry-connrefused \
    -X POST "$KC_URL/realms/ruflo/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=password" \
    --data-urlencode "client_id=ruflo-admin-ui" \
    --data-urlencode "client_secret=change-me-admin-client" \
    --data-urlencode "username=$username" \
    --data-urlencode "password=$password" >"$outfile"
  node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(j.access_token||'')" "$outfile"
}

json_get() {
  node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const p=process.argv[2].split('.');let v=j;for(const k of p){v=v?.[k]}if(v===undefined||v===null){process.exit(1)}process.stdout.write(String(v))" "$1" "$2"
}

admin_token="$(token_for "admin@ruflo.local" "change-me-admin")"
buyer_token="$(token_for "buyer@ruflo.local" "change-me-buyer")"

results="$tmpdir/results.jsonl"

record() {
  printf '%s\n' "$1" >>"$results"
}

json_stringify_file() {
  node -e 'const fs=require("fs");const s=fs.readFileSync(process.argv[1],"utf8");process.stdout.write(JSON.stringify(s||""))' "$1"
}

out="$tmpdir/no-token.json"
status="$(request GET "$BASE_URL/api/identity/context" "" "" "$out")"
record "{\"name\":\"no_token_identity_context\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

out="$tmpdir/fake-token.json"
status="$(request GET "$BASE_URL/api/identity/context" "" "fake.token.value" "$out")"
record "{\"name\":\"fake_token_identity_context\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

out="$tmpdir/buyer-context.json"
status="$(request GET "$BASE_URL/api/identity/context" "" "$buyer_token" "$out")"
record "{\"name\":\"buyer_identity_context\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

out="$tmpdir/buyer-admin.json"
status="$(request GET "$BASE_URL/api/admin/approvals" "" "$buyer_token" "$out")"
record "{\"name\":\"buyer_admin_approvals\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

out="$tmpdir/buyer-create-tenant.json"
status="$(request POST "$BASE_URL/api/tenants" '{"name":"evil-tenant","slug":"evil-tenant"}' "$buyer_token" "$out")"
record "{\"name\":\"buyer_create_tenant\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

out="$tmpdir/admin-create-tenant2.json"
status="$(request POST "$BASE_URL/api/tenants" '{"name":"tenant-two","slug":"tenant-two"}' "$admin_token" "$out")"
tenant2_id=""
if [[ "$status" == "201" || "$status" == "200" ]]; then
  tenant2_id="$(json_get "$out" id || true)"
fi
record "{\"name\":\"admin_create_tenant_two\",\"status\":$status,\"tenantId\":$(printf '%s' "$tenant2_id" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify(s||"")))' )}"

if [[ -n "$tenant2_id" ]]; then
  out="$tmpdir/admin-rfq-tenant2.json"
  status="$(request POST "$BASE_URL/api/wholesale/rfqs" "{\"tenantId\":\"$tenant2_id\",\"title\":\"Tenant2 RFQ\",\"currency\":\"USD\"}" "$admin_token" "$out")"
  rfq2_id="$(json_get "$out" id || true)"
  record "{\"name\":\"admin_create_rfq_tenant_two\",\"status\":$status,\"rfqId\":$(printf '%s' "$rfq2_id" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.stringify(s||"")))' )}"

  out="$tmpdir/buyer-list-rfqs.json"
  status="$(request GET "$BASE_URL/api/wholesale/rfqs" "" "$buyer_token" "$out")"
  record "{\"name\":\"buyer_list_rfqs\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

  out="$tmpdir/buyer-tenant2-quotes.json"
  status="$(request GET "$BASE_URL/api/wholesale/rfqs/$rfq2_id/quotes" "" "$buyer_token" "$out")"
  record "{\"name\":\"buyer_access_other_tenant_rfq_quotes\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"
fi

out="$tmpdir/invalid-product.json"
status="$(request POST "$BASE_URL/api/catalog/products" '{"name":"","price":-1}' "$admin_token" "$out")"
record "{\"name\":\"invalid_payload_product\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

out="$tmpdir/invalid-contract-id.json"
status="$(request GET "$BASE_URL/api/contracts/not-a-real-id" "" "$admin_token" "$out")"
record "{\"name\":\"invalid_contract_id_read\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

e2e_out="$tmpdir/e2e.json"
node scripts/e2e-runtime-validate.mjs >"$e2e_out"
payment_id="$(json_get "$e2e_out" paymentId)"
contract_id="$(json_get "$e2e_out" contractId)"

out="$tmpdir/release-twice.json"
status="$(request POST "$BASE_URL/api/payments/transactions/$payment_id/release" '{"amountMinor":125000,"note":"Repeat release attempt"}' "$admin_token" "$out")"
record "{\"name\":\"payment_release_replay\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

out="$tmpdir/refund-no-approval.json"
status="$(request POST "$BASE_URL/api/payments/transactions/$payment_id/refund" '{"amountMinor":1000,"note":"Refund attempt"}' "$admin_token" "$out")"
record "{\"name\":\"payment_refund_requires_approval\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

out="$tmpdir/contract-activate.json"
status="$(request PUT "$BASE_URL/api/contracts/$contract_id/status" '{"status":"active"}' "$admin_token" "$out")"
record "{\"name\":\"contract_activate_requires_approval\",\"status\":$status,\"body\":$(json_stringify_file "$out")}"

node - "$results" <<'NODE'
const fs=require('fs');
const lines=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').filter(Boolean).map((l)=>JSON.parse(l));
console.log(JSON.stringify(lines,null,2));
NODE
