#!/bin/bash
BASE="https://fiskalizimi-test.atk-ks.org"
NUI="812445890"
FISC_NO="013243794194"

echo "=== Test me pos_id=2 (arka jonë) ==="
curl -s -w "\nHTTP: %{http_code}\n" -X POST "${BASE}/ca/verify/${NUI}" \
  -H "Content-Type: application/json" \
  -d "{\"fiscalization_no\":\"${FISC_NO}\",\"pos_id\":2,\"branch_id\":1,\"application_id\":857345132322}"

echo ""
echo "=== Test pa application_id ==="
curl -s -w "\nHTTP: %{http_code}\n" -X POST "${BASE}/ca/verify/${NUI}" \
  -H "Content-Type: application/json" \
  -d "{\"fiscalization_no\":\"${FISC_NO}\",\"pos_id\":2,\"branch_id\":1}"
