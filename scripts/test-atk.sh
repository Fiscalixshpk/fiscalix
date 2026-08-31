#!/bin/bash
# Test ATK API direkt

NUI="812445890"
FISCALIZATION_NO="013243794194"
APPLICATION_ID="857345132322"
BASE_URL="https://fiskalizimi-test.atk-ks.org"

echo "=== TESTING ATK VERIFY ==="
curl -s -X POST "${BASE_URL}/ca/verify/${NUI}" \
  -H "Content-Type: application/json" \
  -d "{
    \"fiscalization_no\": \"${FISCALIZATION_NO}\",
    \"pos_id\": 1,
    \"branch_id\": 1,
    \"application_id\": ${APPLICATION_ID}
  }" | python3 -m json.tool 2>/dev/null || echo "Response not JSON"

echo ""
echo "=== TESTING WITH DIFFERENT FIELDS ==="
curl -s -X POST "${BASE_URL}/ca/verify/${NUI}" \
  -H "Content-Type: application/json" \
  -d "{
    \"FiscalizationNo\": \"${FISCALIZATION_NO}\",
    \"PosId\": 1,
    \"BranchId\": 1,
    \"ApplicationId\": ${APPLICATION_ID}
  }" | python3 -m json.tool 2>/dev/null || echo "Response not JSON"
