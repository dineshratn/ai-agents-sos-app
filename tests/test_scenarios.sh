#!/bin/bash
# Test scenarios for Phase 5 validation
# Tests medical, security, disaster, and low-severity emergencies

API_URL="http://localhost:8000/assess-multi"

echo "============================================"
echo "Phase 5: Multi-Agent System Test Suite"
echo "============================================"
echo ""

# Test 1: Medical Emergency (High Severity)
echo "Test 1: Medical Emergency (High Severity)"
echo "Expected: All agents activate, hospital resources provided"
echo "---"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Severe chest pain and difficulty breathing",
    "location": "Home"
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"Emergency Type: {data['assessment']['emergency_type']}\")
print(f\"Severity: {data['assessment']['severity']}/5\")
print(f\"Confidence: {data['assessment'].get('confidence', 'N/A')}/5\")
print(f\"Response: {data['assessment']['recommended_response']}\")
print(f\"Agents Called: {', '.join(data['orchestration']['agents_called'])}\")
print(f\"Total Time: {data['orchestration']['total_time']:.2f}s\")
print(f\"Workflow ID: {data['orchestration'].get('workflow_id', 'N/A')}\")
print('')
"
echo ""

# Test 2: Security Emergency
echo "Test 2: Security Emergency"
echo "Expected: Police resources prioritized, safety instructions first"
echo "---"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Someone trying to break into my house",
    "location": "123 Main St"
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"Emergency Type: {data['assessment']['emergency_type']}\")
print(f\"Severity: {data['assessment']['severity']}/5\")
print(f\"Confidence: {data['assessment'].get('confidence', 'N/A')}/5\")
print(f\"Response: {data['assessment']['recommended_response']}\")
print(f\"Guidance Steps: {len(data['guidance']['steps'])} steps\")
print(f\"Total Time: {data['orchestration']['total_time']:.2f}s\")
print('')
"
echo ""

# Test 3: Natural Disaster
echo "Test 3: Natural Disaster"
echo "Expected: Evacuation guidance, shelter locations"
echo "---"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Earthquake - building is shaking violently",
    "location": "Downtown office building"
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"Emergency Type: {data['assessment']['emergency_type']}\")
print(f\"Severity: {data['assessment']['severity']}/5\")
print(f\"Immediate Risks: {', '.join(data['assessment']['immediate_risks'][:2])}\")
print(f\"Response: {data['assessment']['recommended_response']}\")
print(f\"Total Time: {data['orchestration']['total_time']:.2f}s\")
print('')
"
echo ""

# Test 4: Low-Severity Issue (Test Dynamic Routing)
echo "Test 4: Low-Severity Issue (Dynamic Routing Test)"
echo "Expected: May skip resource agent for very low severity"
echo "---"
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Small paper cut on finger",
    "location": "Office"
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"Emergency Type: {data['assessment']['emergency_type']}\")
print(f\"Severity: {data['assessment']['severity']}/5\")
print(f\"Response: {data['assessment']['recommended_response']}\")
print(f\"Agents Called: {', '.join(data['orchestration']['agents_called'])}\")
print(f\"Resource Agent Called: {'resource_agent' in data['orchestration']['agents_called']}\")
print(f\"Total Time: {data['orchestration']['total_time']:.2f}s\")
print('')
"
echo ""

# Test 5: Conversation History (Thread ID Test)
echo "Test 5: Conversation History with Thread ID"
echo "Expected: Same thread_id preserves conversation context"
echo "---"
THREAD_ID="test-thread-$(date +%s)"
echo "Using Thread ID: $THREAD_ID"

curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"I twisted my ankle\",
    \"location\": \"Park\",
    \"thread_id\": \"$THREAD_ID\"
  }" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f\"First Request - Thread ID: $THREAD_ID\")
print(f\"Emergency Type: {data['assessment']['emergency_type']}\")
print(f\"Workflow ID: {data['orchestration'].get('workflow_id', 'N/A')}\")
print('')
"
echo ""

echo "============================================"
echo "Test Suite Complete"
echo "============================================"
