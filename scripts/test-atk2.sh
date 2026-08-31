#!/bin/bash
BASE="https://fiskalizimi-test.atk-ks.org"
NUI="812445890"
FISC_NO="013243794194"
APP_ID=857345132322

echo "=== Test 1: POST /ca/verify/{nui} ==="
curl -s -w "\nHTTP: %{http_code}\n" -X POST "${BASE}/ca/verify/${NUI}" \
  -H "Content-Type: application/json" \
  -d "{\"fiscalization_no\":\"${FISC_NO}\",\"pos_id\":1,\"branch_id\":1,\"application_id\":${APP_ID}}"

echo ""
echo "=== Test 2: Swagger docs ==="
curl -s -w "\nHTTP: %{http_code}\n" "${BASE}/swagger/index.html" | head -20

echo ""
echo "=== Test 3: GET endpoints ==="
curl -s -w "\nHTTP: %{http_code}\n" "${BASE}/"
