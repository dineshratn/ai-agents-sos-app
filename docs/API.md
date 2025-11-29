# API Documentation - SOS Multi-Agent System

Complete API reference for the Multi-Agent Emergency Assessment System.

**Base URL**: `http://localhost:8000`
**Version**: 3.0.0
**Interactive Docs**: `http://localhost:8000/docs`

---

## Table of Contents

1. [Endpoints](#endpoints)
2. [Request/Response Models](#requestresponse-models)
3. [Phase 4 Features](#phase-4-features)
4. [Examples](#examples)
5. [Error Handling](#error-handling)

---

## Endpoints

### GET /

Get API information and feature list.

**Response:**
```json
{
  "message": "SOS Multi-Agent Emergency Assessment System",
  "version": "3.0.0",
  "endpoints": {
    "health": "/health (GET)",
    "assess": "/assess (POST) - Single agent",
    "assess_multi": "/assess-multi (POST) - Multi-agent orchestration with Phase 4 enhancements",
    "docs": "/docs"
  },
  "phase": "Phase 4: Enhanced Features ✅",
  "features": [...],
  "phase_4_enhancements": {...}
}
```

---

### GET /health

Health check endpoint for monitoring and load balancers.

**Response 200 OK:**
```json
{
  "status": "healthy",
  "service": "SOS Multi-Agent System",
  "version": "3.0.0",
  "model": "deepseek/deepseek-chat",
  "provider": "OpenRouter"
}
```

**Example:**
```bash
curl http://localhost:8000/health
```

---

### POST /assess

**Single-agent emergency assessment** (Phase 1 compatibility endpoint).

**Request Body:**
```json
{
  "description": "string (required)",
  "location": "string (optional)"
}
```

**Response 200 OK:**
```json
{
  "emergency_type": "medical",
  "severity": 5,
  "immediate_risks": ["Cardiac arrest", "Respiratory failure"],
  "recommended_response": "call_911",
  "guidance": ["Call 911 immediately", "Start CPR if needed", ...],
  "ai_model": "deepseek/deepseek-chat",
  "ai_provider": "OpenRouter",
  "tokens_used": 850,
  "generated_at": "2025-11-29T07:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:8000/assess \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Severe chest pain and difficulty breathing",
    "location": "Home"
  }'
```

---

### POST /assess-multi ⭐

**Multi-agent emergency assessment with Phase 4 enhancements**.

This is the primary endpoint featuring:
- Multi-agent orchestration (Supervisor → Situation → Guidance → Resource)
- Agent confidence scores
- Conversation history with thread_id
- Detailed execution metrics
- Dynamic routing

**Request Body:**
```json
{
  "description": "string (required) - Description of the emergency",
  "location": "string (optional) - Location of the emergency",
  "thread_id": "string (optional) - Thread ID for conversation continuity"
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | ✅ Yes | Detailed description of the emergency situation |
| `location` | string | ❌ No | Location where emergency is occurring |
| `thread_id` | string | ❌ No | Session ID for multi-turn conversations (Phase 4) |

**Response 200 OK:**

```json
{
  "assessment": {
    "emergency_type": "medical",
    "severity": 5,
    "immediate_risks": ["Cardiac arrest", "Respiratory failure", "Loss of consciousness"],
    "recommended_response": "call_911",
    "confidence": 4.8
  },
  "guidance": {
    "steps": [
      "Call 911 immediately and request ambulance",
      "Keep the person calm and seated or lying down",
      "Loosen tight clothing around neck and chest",
      "Monitor breathing and pulse continuously",
      "Be prepared to perform CPR if breathing stops"
    ],
    "provided_by": "guidance_agent",
    "confidence": 5.0
  },
  "resources": {
    "nearby_hospitals": [
      "City General Hospital Emergency - 2.3 miles",
      "St. Mary's Medical Center - 3.5 miles",
      "Regional Trauma Center - 5.1 miles"
    ],
    "emergency_services": "911",
    "provided_by": "resource_agent",
    "confidence": 4.2
  },
  "orchestration": {
    "agents_called": ["supervisor", "situation_agent", "guidance_agent", "resource_agent"],
    "total_time": 6.45,
    "model": "deepseek/deepseek-chat",
    "provider": "OpenRouter",
    "total_tokens": 1150,
    "workflow_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "metrics": {
    "execution_trace": [
      {
        "agent": "supervisor",
        "action": "routing_decision",
        "next_agent": "situation_agent",
        "reason": "Initial situation assessment required",
        "timestamp": 1764403200.123,
        "execution_time": 0.0001
      },
      {
        "agent": "situation_agent",
        "action": "situation_assessment",
        "emergency_type": "medical",
        "severity": 5,
        "confidence": 4.8,
        "tokens": 380,
        "timestamp": 1764403202.456,
        "execution_time": 2.31
      },
      ...
    ],
    "agent_timings": {
      "supervisor": 0.0003,
      "situation_agent": 2.31,
      "guidance_agent": 1.89,
      "resource_agent": 2.25
    },
    "routing_decisions": [
      "supervisor → situation_agent: Initial situation assessment required",
      "supervisor → guidance_agent: Guidance needed for medical emergency (severity 5)",
      "supervisor → resource_agent: Resource coordination needed (severity 5)"
    ]
  },
  "success": true,
  "message": "Emergency assessment completed successfully"
}
```

**Example - Basic Request:**
```bash
curl -X POST http://localhost:8000/assess-multi \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Severe chest pain and difficulty breathing",
    "location": "Home"
  }'
```

**Example - With Thread ID (Conversation Continuity):**
```bash
# First request
curl -X POST http://localhost:8000/assess-multi \
  -H "Content-Type: application/json" \
  -d '{
    "description": "I twisted my ankle while running",
    "location": "Park",
    "thread_id": "user-session-12345"
  }'

# Follow-up request (same thread_id preserves context)
curl -X POST http://localhost:8000/assess-multi \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Its swelling now, should I continue walking?",
    "thread_id": "user-session-12345"
  }'
```

---

## Request/Response Models

### EmergencyRequest

**Schema:**
```python
{
  "description": str,      # Required
  "location": str | None,  # Optional
  "thread_id": str | None  # Optional (Phase 4)
}
```

**Validation:**
- `description`: Non-empty string
- `location`: Optional string
- `thread_id`: Optional UUID string for session continuity

### Assessment

**Schema:**
```python
{
  "emergency_type": str,           # medical, security, disaster, accident, other
  "severity": int,                 # 1 (minor) to 5 (life-threatening)
  "immediate_risks": List[str],    # List of specific risks
  "recommended_response": str,     # self-help, contact_help, call_911
  "confidence": float | None       # 1.0-5.0 (Phase 4)
}
```

**Emergency Types:**
- `medical`: Health-related emergencies
- `security`: Safety/crime-related
- `natural_disaster`: Earthquakes, floods, storms
- `accident`: Vehicle accidents, falls, injuries
- `other`: Miscellaneous emergencies

**Severity Levels:**
- `1`: Minor issue, self-manageable
- `2`: Minor, may need help
- `3`: Moderate, assistance recommended
- `4`: Serious, help needed soon
- `5`: Critical, call 911 immediately

**Recommended Responses:**
- `self-help`: Manageable with first aid
- `contact_help`: Call non-emergency help
- `call_911`: Emergency services needed

### Guidance

**Schema:**
```python
{
  "steps": List[str],          # 5 actionable steps
  "provided_by": str,          # "guidance_agent"
  "confidence": float | None   # 1.0-5.0 (Phase 4)
}
```

**Guidance Steps:**
- Prioritized by urgency
- Clear and actionable
- Safety-focused
- Context-specific

### Resource

**Schema:**
```python
{
  "nearby_hospitals": List[str] | None,  # Hospital names with distances
  "emergency_services": str,             # Phone number (usually "911")
  "provided_by": str,                    # "resource_agent"
  "confidence": float | None             # 1.0-5.0 (Phase 4)
}
```

### AgentOrchestration

**Schema:**
```python
{
  "agents_called": List[str],     # List of agents invoked
  "total_time": float,            # Total execution time (seconds)
  "model": str,                   # AI model used
  "provider": str,                # "OpenRouter"
  "total_tokens": int | None,     # Total tokens used (Phase 4)
  "workflow_id": str | None       # Unique workflow ID (Phase 4)
}
```

### ExecutionMetrics (Phase 4)

**Schema:**
```python
{
  "execution_trace": List[Dict],      # Detailed execution steps
  "agent_timings": Dict[str, float],  # Time per agent
  "routing_decisions": List[str]      # Routing history
}
```

**Execution Trace Entry:**
```python
{
  "agent": str,              # Agent name
  "action": str,             # Action type
  "timestamp": float,        # Unix timestamp
  "execution_time": float,   # Seconds
  # Additional fields based on action type
}
```

---

## Phase 4 Features

### 1. Conversation History

**Usage:**
```python
import requests

session_id = "user-abc-123"

# First request
response1 = requests.post("http://localhost:8000/assess-multi", json={
    "description": "I fell and hurt my knee",
    "thread_id": session_id
})

# Follow-up (context preserved)
response2 = requests.post("http://localhost:8000/assess-multi", json={
    "description": "Should I put ice on it?",
    "thread_id": session_id
})
```

**Benefits:**
- Maintains conversation context
- Enables clarifying questions
- Thread-isolated sessions

### 2. Confidence Scores

**Interpretation:**

| Score | Meaning |
|-------|---------|
| 1.0-2.0 | Low confidence - uncertain assessment |
| 2.1-3.5 | Moderate confidence - reasonable assessment |
| 3.6-4.5 | High confidence - strong assessment |
| 4.6-5.0 | Very high confidence - certain assessment |

**Usage:**
```python
response = requests.post("http://localhost:8000/assess-multi", ...)
data = response.json()

# Check confidence
situation_conf = data['assessment']['confidence']
guidance_conf = data['guidance']['confidence']

if situation_conf < 2.0:
    print("⚠️ Situation assessment has low confidence")
    print("Consider providing more details")
```

### 3. Execution Metrics

**Performance Analysis:**
```python
metrics = response.json()['metrics']

# Agent timing analysis
for agent, time in metrics['agent_timings'].items():
    print(f"{agent}: {time:.2f}s")

# Routing decisions
for decision in metrics['routing_decisions']:
    print(decision)

# Execution trace
for trace in metrics['execution_trace']:
    if trace['action'] == 'error':
        print(f"Error in {trace['agent']}: {trace['error']}")
```

### 4. Dynamic Routing

**Low-Severity Skip:**

For very low severity issues (severity 1-2), the resource agent may be skipped:

```json
{
  "assessment": {
    "severity": 1
  },
  "orchestration": {
    "agents_called": ["supervisor", "situation_agent", "guidance_agent"]
    // resource_agent skipped for low severity
  }
}
```

---

## Examples

### Example 1: Medical Emergency

**Request:**
```bash
curl -X POST http://localhost:8000/assess-multi \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Severe chest pain, shortness of breath, sweating",
    "location": "123 Main Street"
  }'
```

**Response (truncated):**
```json
{
  "assessment": {
    "emergency_type": "medical",
    "severity": 5,
    "recommended_response": "call_911",
    "confidence": 5.0
  },
  "guidance": {
    "steps": ["Call 911 immediately", "Stay calm", ...],
    "confidence": 5.0
  },
  "orchestration": {
    "total_time": 6.2
  }
}
```

### Example 2: Security Emergency

**Request:**
```bash
curl -X POST http://localhost:8000/assess-multi \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Hearing glass breaking downstairs, suspect intruder",
    "location": "Home"
  }'
```

**Response:**
```json
{
  "assessment": {
    "emergency_type": "security",
    "severity": 4,
    "recommended_response": "call_911"
  },
  "resources": {
    "emergency_services": "911"
  }
}
```

### Example 3: Low-Severity Issue

**Request:**
```bash
curl -X POST http://localhost:8000/assess-multi \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Small paper cut on finger",
    "location": "Office"
  }'
```

**Response:**
```json
{
  "assessment": {
    "emergency_type": "accident",
    "severity": 1,
    "recommended_response": "self-help"
  },
  "orchestration": {
    "agents_called": ["supervisor", "situation_agent", "guidance_agent"]
    // Note: resource_agent may be skipped
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 422 | Validation Error - Schema mismatch |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Errors

**1. Missing Required Field:**
```json
{
  "detail": [
    {
      "loc": ["body", "description"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**2. Connection Error (Fallback Response):**
```json
{
  "assessment": {
    "emergency_type": "unknown",
    "severity": 3,
    "immediate_risks": ["Unable to assess - proceed with caution"],
    "confidence": 1.0
  }
}
```
*System provides safe fallback values when API calls fail*

**3. Internal Server Error:**
```json
{
  "detail": "Failed to assess emergency with multi-agent system: Connection timeout"
}
```

---

## Rate Limiting

**Default Limits:**
- 60 requests per minute per IP (configurable)

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1764403800
```

**429 Response:**
```json
{
  "detail": "Rate limit exceeded. Try again in 30 seconds."
}
```

---

## Authentication

**Current Version:** No authentication required (development)

**Production Recommendation:**
- Implement API key authentication
- Use OAuth 2.0 for user access
- Add JWT tokens for session management

---

## Interactive API Documentation

**Swagger UI:** `http://localhost:8000/docs`
**ReDoc:** `http://localhost:8000/redoc`

Features:
- Try API calls directly
- See request/response schemas
- Generate code samples
- Test authentication

---

## Client Libraries

### Python

```python
import requests

class SOSClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url

    def assess_emergency(self, description, location=None, thread_id=None):
        response = requests.post(
            f"{self.base_url}/assess-multi",
            json={
                "description": description,
                "location": location,
                "thread_id": thread_id
            }
        )
        response.raise_for_status()
        return response.json()

# Usage
client = SOSClient()
result = client.assess_emergency(
    description="Severe chest pain",
    location="Home"
)
print(f"Emergency Type: {result['assessment']['emergency_type']}")
print(f"Severity: {result['assessment']['severity']}")
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

class SOSClient {
  constructor(baseURL = 'http://localhost:8000') {
    this.client = axios.create({ baseURL });
  }

  async assessEmergency(description, location = null, threadId = null) {
    const response = await this.client.post('/assess-multi', {
      description,
      location,
      thread_id: threadId
    });
    return response.data;
  }
}

// Usage
const client = new SOSClient();
const result = await client.assessEmergency(
  'Severe chest pain',
  'Home'
);
console.log(`Emergency Type: ${result.assessment.emergency_type}`);
console.log(`Severity: ${result.assessment.severity}`);
```

---

## Best Practices

1. **Provide Detailed Descriptions**
   - Include symptoms, severity indicators
   - Mention duration and progression
   - Add relevant context

2. **Use Thread IDs for Conversations**
   - Generate unique ID per session
   - Reuse for follow-up questions
   - Maintain context

3. **Check Confidence Scores**
   - Low confidence → ask for clarification
   - High confidence → proceed with guidance

4. **Monitor Performance**
   - Track execution_time
   - Review agent_timings
   - Optimize slow requests

5. **Handle Errors Gracefully**
   - Always check HTTP status
   - Handle fallback responses
   - Log errors for debugging

---

## Changelog

### Version 3.0.0 (Phase 4)
- ✅ Added conversation history with thread_id
- ✅ Agent confidence scores (1.0-5.0)
- ✅ Execution metrics and traces
- ✅ Dynamic routing based on severity
- ✅ Structured logging

### Version 2.0.0 (Phase 2)
- Multi-agent orchestration
- LangGraph workflow
- Supervisor pattern

### Version 1.0.0 (Phase 1)
- Single-agent assessment
- Basic emergency classification

---

## Support

- **Documentation**: `/docs` directory
- **API Playground**: `http://localhost:8000/docs`
- **Issues**: GitHub repository
- **Email**: support@yourproject.com
