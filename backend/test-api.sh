#!/bin/bash

# API Test Script for SOS App Backend v4.0.0
# Tests all major endpoints with Supabase integration

BASE_URL="http://localhost:3000/api"
PYTHON_URL="http://localhost:8000"

echo "======================================================================"
echo "🧪 SOS App Backend API Tests - v4.0.0 (Supabase Edition)"
echo "======================================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}❌ FAILED${NC}: $2"
    ((TESTS_FAILED++))
  fi
}

# 1. Health Check
echo -e "${YELLOW}[1/10] Testing Health Check${NC}"
HEALTH=$(curl -s "$BASE_URL/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  test_result 0 "Health check endpoint"
  echo "$HEALTH" | python3 -m json.tool | head -15
else
  test_result 1 "Health check endpoint"
fi
echo ""

# 2. User Signup
echo -e "${YELLOW}[2/10] Testing User Signup${NC}"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="SecurePass123!"

SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"full_name\": \"Test User\",
    \"phone\": \"+1234567890\"
  }")

if echo "$SIGNUP_RESPONSE" | grep -q '"message":"User created successfully"'; then
  test_result 0 "User signup"
  ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['access_token'])" 2>/dev/null)
  REFRESH_TOKEN=$(echo "$SIGNUP_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['session']['refresh_token'])" 2>/dev/null)
  USER_ID=$(echo "$SIGNUP_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
  echo "   Email: $TEST_EMAIL"
  echo "   User ID: $USER_ID"
  echo "   Token: ${ACCESS_TOKEN:0:30}..."
else
  test_result 1 "User signup"
  echo "$SIGNUP_RESPONSE" | python3 -m json.tool
fi
echo ""

# 3. User Login
echo -e "${YELLOW}[3/10] Testing User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

if echo "$LOGIN_RESPONSE" | grep -q '"message":"Login successful"'; then
  test_result 0 "User login"
  echo "   Logged in as: $TEST_EMAIL"
else
  test_result 1 "User login"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool
fi
echo ""

# 4. Get Current User
echo -e "${YELLOW}[4/10] Testing Get Current User${NC}"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$ME_RESPONSE" | grep -q "$TEST_EMAIL"; then
  test_result 0 "Get current user"
  echo "$ME_RESPONSE" | python3 -m json.tool
else
  test_result 1 "Get current user"
fi
echo ""

# 5. Get User Profile
echo -e "${YELLOW}[5/10] Testing Get User Profile${NC}"
PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/user/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$PROFILE_RESPONSE" | grep -q "$TEST_EMAIL"; then
  test_result 0 "Get user profile"
  echo "$PROFILE_RESPONSE" | python3 -m json.tool
else
  test_result 1 "Get user profile"
fi
echo ""

# 6. Create Emergency Contact
echo -e "${YELLOW}[6/10] Testing Create Emergency Contact${NC}"
CONTACT_RESPONSE=$(curl -s -X POST "$BASE_URL/contacts" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+1987654321",
    "email": "john@example.com",
    "relationship": "Brother",
    "priority": 1
  }')

if echo "$CONTACT_RESPONSE" | grep -q '"message":"Contact created successfully"'; then
  test_result 0 "Create emergency contact"
  CONTACT_ID=$(echo "$CONTACT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['contact']['id'])" 2>/dev/null)
  echo "   Contact ID: $CONTACT_ID"
  echo "   Name: John Doe"
else
  test_result 1 "Create emergency contact"
  echo "$CONTACT_RESPONSE" | python3 -m json.tool
fi
echo ""

# 7. Get Emergency Contacts
echo -e "${YELLOW}[7/10] Testing Get Emergency Contacts${NC}"
CONTACTS_RESPONSE=$(curl -s -X GET "$BASE_URL/contacts" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$CONTACTS_RESPONSE" | grep -q "John Doe"; then
  test_result 0 "Get emergency contacts"
  echo "$CONTACTS_RESPONSE" | python3 -m json.tool
else
  test_result 1 "Get emergency contacts"
fi
echo ""

# 8. Trigger Emergency
echo -e "${YELLOW}[8/10] Testing Trigger Emergency${NC}"
EMERGENCY_RESPONSE=$(curl -s -X POST "$BASE_URL/emergency/trigger" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Severe chest pain and difficulty breathing",
    "location": "Home",
    "latitude": 37.7749,
    "longitude": -122.4194
  }')

if echo "$EMERGENCY_RESPONSE" | grep -q '"message":"Emergency triggered successfully"'; then
  test_result 0 "Trigger emergency with AI assessment"
  EMERGENCY_ID=$(echo "$EMERGENCY_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['emergency']['id'])" 2>/dev/null)
  EMERGENCY_TYPE=$(echo "$EMERGENCY_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['emergency']['emergency_type'])" 2>/dev/null)
  SEVERITY=$(echo "$EMERGENCY_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['emergency']['severity'])" 2>/dev/null)
  echo "   Emergency ID: $EMERGENCY_ID"
  echo "   Type: $EMERGENCY_TYPE"
  echo "   Severity: $SEVERITY/5"
  echo "$EMERGENCY_RESPONSE" | python3 -m json.tool | head -30
else
  test_result 1 "Trigger emergency"
  echo "$EMERGENCY_RESPONSE" | python3 -m json.tool
fi
echo ""

# 9. Get Emergencies
echo -e "${YELLOW}[9/10] Testing Get Emergencies${NC}"
EMERGENCIES_RESPONSE=$(curl -s -X GET "$BASE_URL/emergency" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$EMERGENCIES_RESPONSE" | grep -q "$EMERGENCY_ID"; then
  test_result 0 "Get emergencies list"
  COUNT=$(echo "$EMERGENCIES_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['count'])" 2>/dev/null)
  echo "   Total emergencies: $COUNT"
else
  test_result 1 "Get emergencies list"
fi
echo ""

# 10. Send Message to Emergency
echo -e "${YELLOW}[10/10] Testing Send Message${NC}"
MESSAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/messages/emergency/$EMERGENCY_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Patient is stable, waiting for ambulance"
  }')

if echo "$MESSAGE_RESPONSE" | grep -q '"message":"Message sent successfully"'; then
  test_result 0 "Send message to emergency"
  echo "   Message sent to emergency $EMERGENCY_ID"
else
  test_result 1 "Send message to emergency"
  echo "$MESSAGE_RESPONSE" | python3 -m json.tool
fi
echo ""

# 11. Get User Stats
echo -e "${YELLOW}[BONUS] Testing Get User Stats${NC}"
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/user/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

if echo "$STATS_RESPONSE" | grep -q "total_emergencies"; then
  test_result 0 "Get user statistics"
  echo "$STATS_RESPONSE" | python3 -m json.tool
else
  test_result 1 "Get user statistics"
fi
echo ""

# Summary
echo "======================================================================"
echo "📊 Test Summary"
echo "======================================================================"
echo -e "${GREEN}✅ Passed: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed${NC}"
  exit 1
fi
