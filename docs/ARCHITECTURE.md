# Multi-Agent Emergency Assessment System - Architecture

## Overview

The SOS Multi-Agent System is a production-ready emergency assessment platform built with LangGraph, featuring intelligent agent orchestration, conversation history, and comprehensive observability.

**Version**: 3.0.0 (Phase 4 Complete)
**Technology**: Python 3.11, LangGraph, FastAPI, Docker

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Client Applications                        │
│              (Frontend, Mobile, API Consumers)               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Server (Port 8000)                      │
│                                                              │
│  Endpoints:                                                  │
│  - GET  /health          Health check                        │
│  - GET  /                API information                     │
│  - POST /assess          Single-agent assessment             │
│  - POST /assess-multi    Multi-agent orchestration ✨        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           LangGraph Multi-Agent Workflow Engine              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Supervisor Pattern Orchestration             │   │
│  │                                                       │   │
│  │  ┌────────────────────────────────────────────┐     │   │
│  │  │         SUPERVISOR AGENT                   │     │   │
│  │  │  • Routes to appropriate specialists       │     │   │
│  │  │  • Dynamic routing (emergency type/severity)│     │   │
│  │  │  • Execution trace tracking                │     │   │
│  │  │  • Structured logging                      │     │   │
│  │  └────────────┬───────────────────────────────┘     │   │
│  │               │                                      │   │
│  │               ├────────────┬──────────────┬─────────┤│   │
│  │               ▼            ▼              ▼         ││   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐││   │
│  │  │  SITUATION   │ │   GUIDANCE   │ │  RESOURCE   │││   │
│  │  │    AGENT     │ │    AGENT     │ │    AGENT    │││   │
│  │  │              │ │              │ │             │││   │
│  │  │ • Type       │ │ • Steps      │ │ • Hospitals │││   │
│  │  │ • Severity   │ │ • Actions    │ │ • Services  │││   │
│  │  │ • Risks      │ │ • Priority   │ │ • Hotlines  │││   │
│  │  │ • Confidence │ │ • Confidence │ │ • Confidence│││   │
│  │  └──────────────┘ └──────────────┘ └─────────────┘││   │
│  │                                                      │   │
│  │  Phase 4 Features:                                  │   │
│  │  ✓ Conversation history (MemorySaver checkpointing) │   │
│  │  ✓ Agent confidence scores (1.0-5.0)                │   │
│  │  ✓ Dynamic routing based on context                 │   │
│  │  ✓ Execution traces & performance metrics           │   │
│  │  ✓ Structured logging with AgentLogger              │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            OpenRouter API (DeepSeek Chat)                    │
│                                                              │
│  • Model: deepseek/deepseek-chat                            │
│  • Cost: ~$0.0012 per emergency assessment                  │
│  • Avg Response Time: 5-7 seconds                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Agent Workflow

### 1. Request Flow

```
Client Request
    ↓
FastAPI Endpoint (/assess-multi)
    ↓
Generate workflow_id + thread_id
    ↓
Initialize State (EmergencyState)
    ↓
LangGraph Workflow Execution
    ↓
    ├─→ Supervisor Agent (Routing)
    │       ↓
    ├─→ Situation Agent (Assessment)
    │       ↓
    ├─→ Supervisor Agent (Re-routing)
    │       ↓
    ├─→ Guidance Agent (Instructions)
    │       ↓
    ├─→ Supervisor Agent (Re-routing)
    │       ↓
    ├─→ Resource Agent (Coordination)
    │       ↓
    └─→ Supervisor Agent (End)
    ↓
Extract Metrics & Build Response
    ↓
Return MultiAgentResponse
```

### 2. Supervisor Routing Logic

**Dynamic Routing Decision Tree:**

```python
if situation_agent not called:
    route_to = "situation_agent"
    reason = "Initial situation assessment required"

elif guidance_agent not called:
    route_to = "guidance_agent"
    reason = "Guidance needed for {type} emergency (severity {severity})"

elif resource_agent not called:
    if severity >= 3 OR type in ['medical', 'security', 'disaster']:
        route_to = "resource_agent"
        reason = "Resource coordination needed (severity {severity})"
    else:
        route_to = "end"
        reason = "Low severity - resources not needed"

else:
    route_to = "end"
    reason = "All specialist agents consulted"
```

---

## State Management

### EmergencyState Schema

```python
class EmergencyState(TypedDict):
    # Session Management (Phase 4)
    thread_id: Optional[str]              # For conversation continuity
    workflow_id: Optional[str]            # Unique execution ID
    messages: Annotated[List[dict], operator.add]

    # Input
    description: str
    location: Optional[str]

    # Routing
    next_agent: Optional[str]
    agents_called: List[str]
    assessment_complete: bool

    # Situation Agent Outputs
    emergency_type: Optional[str]         # medical, security, disaster, etc.
    severity: Optional[int]               # 1-5
    immediate_risks: Optional[List[str]]
    situation_confidence: Optional[float] # Phase 4: 1.0-5.0

    # Guidance Agent Outputs
    recommended_response: Optional[str]   # self-help, contact_help, call_911
    guidance_steps: Optional[List[str]]
    guidance_confidence: Optional[float]  # Phase 4: 1.0-5.0

    # Resource Agent Outputs
    nearby_hospitals: Optional[List[str]]
    emergency_services: Optional[str]
    additional_resources: Optional[List[str]]
    resource_confidence: Optional[float]  # Phase 4: 1.0-5.0

    # Metrics & Monitoring (Phase 4)
    total_tokens: int
    execution_trace: List[Dict[str, Any]]
    performance_metrics: Dict[str, Any]
```

---

## Phase 4 Enhancements

### 1. Conversation History with Checkpointing

**Implementation:**
```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
workflow.compile(checkpointer=checkpointer)

# Use with thread_id for session continuity
config = {"configurable": {"thread_id": thread_id}}
final_state = emergency_graph.invoke(initial_state, config)
```

**Benefits:**
- Preserves conversation context across requests
- Enables multi-turn conversations
- Thread-based session isolation

### 2. Agent Confidence Scores

Each agent now returns a confidence score (1.0-5.0):

- **Situation Agent**: Confidence in emergency type/severity classification
- **Guidance Agent**: Confidence in safety instructions appropriateness
- **Resource Agent**: Confidence in resource recommendations

**Usage:**
```json
{
  "assessment": {
    "confidence": 4.5
  },
  "guidance": {
    "confidence": 5.0
  },
  "resources": {
    "confidence": 3.0
  }
}
```

### 3. Structured Logging

**AgentLogger Features:**
- Emoji-based visual log levels
- Agent lifecycle tracking (start/complete/error)
- LLM call monitoring
- Routing decision logging
- Performance metrics
- JSON-formatted structured logs

**Example Logs:**
```
2025-11-29 07:47:22 | INFO | sos-agents | 🤖 situation_agent STARTED | Input: {"description": "chest pain", ...}
2025-11-29 07:47:24 | INFO | sos-agents | 💯 CONFIDENCE | situation_agent: 4.50/5.0 | medical severity 5
2025-11-29 07:47:24 | INFO | sos-agents | ✅ situation_agent COMPLETED | Time: 2.31s
2025-11-29 07:47:24 | INFO | sos-agents | 🔀 ROUTING | supervisor → guidance_agent | Reason: Medical emergency
```

### 4. Execution Metrics

**Captured Metrics:**
- Per-agent execution times
- Routing decision history
- LLM token usage
- Complete execution trace
- Workflow timings

**Example Metrics:**
```json
{
  "metrics": {
    "execution_trace": [
      {
        "agent": "supervisor",
        "action": "routing_decision",
        "next_agent": "situation_agent",
        "reason": "Initial situation assessment required",
        "execution_time": 0.0001
      }
    ],
    "agent_timings": {
      "supervisor": 0.0003,
      "situation_agent": 2.31,
      "guidance_agent": 1.89,
      "resource_agent": 1.75
    },
    "routing_decisions": [
      "supervisor → situation_agent: Initial assessment",
      "supervisor → guidance_agent: Medical emergency",
      "supervisor → resource_agent: High severity"
    ]
  }
}
```

---

## Error Handling & Resilience

### 1. Fallback Mechanisms

Each agent has comprehensive error handling with fallback values:

**Situation Agent Fallback:**
```python
except Exception as e:
    log_agent_error(AgentNames.SITUATION, e)
    state['emergency_type'] = 'unknown'
    state['severity'] = 3
    state['immediate_risks'] = ['Unable to assess - proceed with caution']
    state['situation_confidence'] = 1.0  # Low confidence
```

### 2. Execution Trace on Errors

Errors are captured in execution trace:
```python
execution_trace.append({
    "agent": AgentNames.SITUATION,
    "action": "error",
    "error": str(e),
    "timestamp": time.time(),
    "execution_time": execution_time
})
```

### 3. Graceful Degradation

- System continues working even if agents fail
- Provides safe fallback recommendations
- Maintains workflow integrity
- Logs all errors for debugging

---

## Performance Characteristics

### Typical Request Metrics

| Metric | Value |
|--------|-------|
| **Total Response Time** | 5-7 seconds |
| **Situation Agent** | 2-3 seconds |
| **Guidance Agent** | 1.5-2 seconds |
| **Resource Agent** | 1.5-2 seconds |
| **Supervisor Overhead** | <0.001 seconds |
| **Tokens per Request** | 800-1200 |
| **Cost per Request** | ~$0.0012 |

### Scalability

- **Stateless Design**: Each request is independent (unless using thread_id)
- **Docker Ready**: Easy horizontal scaling
- **LLM Pooling**: Can configure multiple LLM providers
- **Checkpointing**: Memory-based (suitable for low-medium traffic)

**For Production:**
- Use Redis/PostgreSQL checkpointer for high-traffic scenarios
- Implement rate limiting
- Add request queuing
- Monitor token usage

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Language** | Python | 3.11+ |
| **Web Framework** | FastAPI | 0.104.1 |
| **Orchestration** | LangGraph | 0.0.20 |
| **LLM Framework** | LangChain | 0.1.0 |
| **LLM Provider** | OpenRouter | - |
| **Model** | DeepSeek Chat | Latest |
| **HTTP Client** | httpx | 0.25.2 |
| **Server** | Uvicorn | 0.24.0 |
| **Containerization** | Docker | - |
| **Data Validation** | Pydantic | 2.5.0 |

---

## Design Patterns

### 1. Supervisor Pattern
- Central coordinator routes to specialists
- Maintains workflow state
- Makes dynamic routing decisions

### 2. State Machine
- LangGraph manages state transitions
- Conditional edges for routing
- Checkpointing for persistence

### 3. Agent Specialization
- Each agent has single responsibility
- Clear input/output contracts
- Composable and testable

### 4. Structured Logging
- Centralized logging via AgentLogger
- Consistent log format
- Searchable and parseable logs

### 5. Error Handling
- Fail-safe defaults
- Comprehensive error tracking
- Graceful degradation

---

## Future Enhancements

### Potential Improvements

1. **Database Integration**
   - PostgreSQL for session persistence
   - Emergency history tracking
   - Analytics and reporting

2. **Real-Time Features**
   - WebSocket support
   - Live status updates
   - Push notifications

3. **Advanced Routing**
   - ML-based routing decisions
   - Priority queuing
   - Load balancing

4. **Multi-LLM Support**
   - Provider fallbacks
   - Cost optimization
   - Quality comparison

5. **Enhanced Context**
   - User profiles
   - Historical context
   - Location-based resources

---

## Security Considerations

1. **API Key Management**
   - Environment variables only
   - Never commit secrets
   - Rotate keys regularly

2. **Input Validation**
   - Pydantic models enforce schema
   - Type checking
   - Length limits

3. **Rate Limiting**
   - Prevent abuse
   - Cost control
   - DDoS protection

4. **Logging**
   - No PII in logs
   - Sanitized error messages
   - Secure log storage

---

## Monitoring & Observability

### Key Metrics to Track

1. **Performance**
   - Response times per agent
   - Total workflow duration
   - LLM latency

2. **Usage**
   - Requests per minute
   - Token consumption
   - Cost per request

3. **Quality**
   - Confidence scores distribution
   - Error rates
   - Fallback frequency

4. **Business**
   - Emergency types distribution
   - Severity levels
   - Peak usage times

### Log Analysis

Search patterns for debugging:
```bash
# Find all errors
docker logs sos-agents-phase4 | grep "❌"

# Track routing decisions
docker logs sos-agents-phase4 | grep "🔀 ROUTING"

# Monitor workflow completions
docker logs sos-agents-phase4 | grep "WORKFLOW COMPLETED"

# Check confidence scores
docker logs sos-agents-phase4 | grep "💯 CONFIDENCE"
```

---

## Conclusion

This architecture provides a robust, scalable foundation for multi-agent emergency assessment with production-grade observability, state management, and intelligent routing.

**Key Strengths:**
- ✅ Modular agent design
- ✅ Comprehensive error handling
- ✅ Rich observability
- ✅ Conversation continuity
- ✅ Dynamic routing
- ✅ Production-ready

**Documentation:**
- [Deployment Guide](DEPLOYMENT.md)
- [API Documentation](API.md)
- [Testing Guide](../tests/README.md)
