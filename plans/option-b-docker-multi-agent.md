# Option B: Docker + Multi-Agent AI System - Implementation Plan

## Overview

Build a containerized multi-agent AI system using Docker and LangGraph, demonstrating agent orchestration patterns and production-ready deployment.

**What You'll Build:**
- Multi-agent AI system with supervisor pattern
- 4 specialized agents (Supervisor, Situation, Guidance, Resource)
- Dockerized Python backend with LangGraph
- Agent-to-agent communication
- Production-ready deployment with Docker Compose

**Timeline:** 3-5 days
**Difficulty:** Medium (builds on Option A)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Existing)                        │
│                  http://localhost:3000                       │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Gateway (Existing)                      │
│                    Port 3000                                 │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP to Python
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Python Multi-Agent Service (NEW)                   │
│                    Port 8000                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         LangGraph Supervisor Pattern                │   │
│  │                                                      │   │
│  │  ┌──────────────┐                                  │   │
│  │  │  Supervisor  │ ◄─── Routes to appropriate       │   │
│  │  │    Agent     │      agent based on context      │   │
│  │  └──────┬───────┘                                  │   │
│  │         │                                            │   │
│  │         ├────────────┬──────────────┬──────────────┐│   │
│  │         ▼            ▼              ▼              ││   │
│  │  ┌──────────┐ ┌──────────┐  ┌──────────────────┐ ││   │
│  │  │Situation │ │ Guidance │  │    Resource      │ ││   │
│  │  │  Agent   │ │  Agent   │  │  Coordination    │ ││   │
│  │  │          │ │          │  │     Agent        │ ││   │
│  │  └──────────┘ └──────────┘  └──────────────────┘ ││   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│               OpenRouter API (DeepSeek)                      │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
              Docker Container Environment
```

## Technology Stack

**New Components:**
- **Python 3.11+** - Multi-agent backend
- **LangGraph** - Agent orchestration framework
- **LangChain** - LLM tooling and utilities
- **FastAPI** - Python REST API framework
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

**Existing Components:**
- Node.js + Express (gateway)
- Frontend (HTML/CSS/JS)
- OpenRouter + DeepSeek

## Implementation Phases

### Phase 1: Python Backend Setup (Day 1)

**Goals:**
- Create Python FastAPI service
- Integrate with OpenRouter
- Test single-agent response
- Connect to Node.js gateway

**Tasks:**
1. Create Python project structure
2. Install dependencies (LangGraph, LangChain, FastAPI)
3. Create simple emergency assessment endpoint
4. Test with OpenRouter DeepSeek
5. Update Node.js to call Python service

**Files to Create:**
```
agents/
├── main.py              # FastAPI server
├── requirements.txt     # Python dependencies
├── config.py           # Configuration
└── simple_agent.py     # Single agent for testing
```

### Phase 2: LangGraph Multi-Agent System (Day 2-3)

**Goals:**
- Implement supervisor pattern
- Create specialized agents
- Set up agent communication
- Test agent orchestration

**Agents to Build:**

**1. Supervisor Agent**
- Routes incoming emergencies to appropriate specialist
- Aggregates responses from multiple agents
- Decides when to call which agent
- Returns unified assessment

**2. Situation Assessment Agent**
- Analyzes emergency type (medical, security, disaster, accident)
- Determines severity level (1-5)
- Identifies immediate risks
- Provides classification

**3. Guidance Agent**
- Provides step-by-step instructions
- Tailored to emergency type
- Prioritizes safety
- Clear, actionable steps

**4. Resource Coordination Agent**
- Suggests nearby resources (hospitals, police, shelters)
- Coordinates appropriate response
- Recommends emergency services
- Provides contact information

**Files to Create:**
```
agents/
├── supervisor.py        # Supervisor agent
├── situation_agent.py   # Situation assessment
├── guidance_agent.py    # Step-by-step guidance
├── resource_agent.py    # Resource coordination
└── graph_builder.py     # LangGraph graph construction
```

### Phase 3: Docker Containerization (Day 3-4)

**Goals:**
- Dockerize Python service
- Dockerize Node.js service
- Create Docker Compose setup
- Test containerized deployment

**Containers to Create:**

**1. Python Multi-Agent Service**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**2. Node.js Gateway**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

**3. Docker Compose**
```yaml
version: '3.8'
services:
  python-agents:
    build: ./agents
    ports:
      - "8000:8000"
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}

  node-gateway:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - python-agents
    environment:
      - PYTHON_SERVICE_URL=http://python-agents:8000
```

**Files to Create:**
```
agents/Dockerfile
backend/Dockerfile
docker-compose.yml
.dockerignore
```

### Phase 4: Enhanced Features (Day 4-5)

**Goals:**
- Add agent state management
- Implement conversation history
- Add agent handoffs
- Improve error handling

**Features to Add:**

1. **Stateful Agents**
   - Remember previous interactions
   - Build context across agent calls
   - LangGraph checkpointing

2. **Agent Handoffs**
   - Supervisor → Situation → Guidance → Resource
   - Dynamic routing based on emergency type
   - Parallel execution when possible

3. **Enhanced Responses**
   - Combine insights from multiple agents
   - Show which agent provided which information
   - Agent confidence scores

4. **Monitoring & Logging**
   - Agent execution traces
   - Performance metrics
   - Error tracking

### Phase 5: Testing & Documentation (Day 5)

**Goals:**
- Test complete system
- Document architecture
- Create deployment guide
- Performance benchmarking

**Testing Scenarios:**

1. **Medical Emergency**
   - All agents should activate
   - Medical guidance prioritized
   - Hospital resources provided

2. **Security Emergency**
   - Police resources prioritized
   - Safety instructions first
   - Escape routes suggested

3. **Natural Disaster**
   - Evacuation guidance
   - Shelter locations
   - Emergency services coordination

4. **Multi-Step Conversations**
   - Follow-up questions
   - Clarification requests
   - Agent handoffs

## Key Learning Objectives

### Docker & Containerization
- Understanding Docker images and containers
- Multi-stage builds
- Docker networking
- Environment variable management
- Container orchestration with Docker Compose

### Multi-Agent AI Systems
- Supervisor pattern architecture
- Agent specialization and delegation
- Inter-agent communication
- State management in agents
- Graph-based workflows with LangGraph

### Production Deployment
- Containerized microservices
- Service-to-service communication
- Health checks and monitoring
- Scaling considerations
- Environment configuration

## LangGraph Concepts

### 1. State Graph
```python
from langgraph.graph import StateGraph, MessagesState

# Define state that flows between agents
class EmergencyState(MessagesState):
    emergency_type: str
    severity: int
    location: str
    assessed_by: list[str]
```

### 2. Nodes (Agents)
```python
# Each agent is a node in the graph
def situation_agent(state: EmergencyState):
    # Assess the situation
    response = llm.invoke(...)
    return {"emergency_type": ..., "severity": ...}
```

### 3. Edges (Routing)
```python
# Supervisor decides which agent to call next
def route_to_next_agent(state: EmergencyState):
    if state.emergency_type == "medical":
        return "guidance_agent"
    elif state.emergency_type == "security":
        return "resource_agent"
```

### 4. Graph Compilation
```python
graph = StateGraph(EmergencyState)
graph.add_node("supervisor", supervisor_agent)
graph.add_node("situation", situation_agent)
graph.add_node("guidance", guidance_agent)
graph.add_conditional_edges("supervisor", route_to_next_agent)
app = graph.compile()
```

## Expected Results

### Before (Option A)
- Single AI call
- Generic response
- ~2-3 seconds
- Limited context

**Example Response:**
```json
{
  "emergencyType": "medical",
  "severity": 4,
  "guidance": ["Call 911", "Stay calm", "Wait for help"]
}
```

### After (Option B)
- Multi-agent orchestration
- Specialized responses
- ~4-6 seconds
- Rich context from multiple experts

**Example Response:**
```json
{
  "assessment": {
    "type": "medical",
    "severity": 4,
    "assessedBy": "situation_agent"
  },
  "guidance": {
    "steps": [
      "Call 911 immediately",
      "Do not move if spinal injury suspected",
      "Keep patient warm and comfortable",
      "Monitor breathing and pulse",
      "Stay on line with 911 dispatcher"
    ],
    "providedBy": "guidance_agent"
  },
  "resources": {
    "nearbyHospitals": [
      "St. Mary's Hospital - 2.3 miles",
      "City Medical Center - 3.1 miles"
    ],
    "emergencyServices": "911",
    "providedBy": "resource_agent"
  },
  "orchestration": {
    "agentsCalled": ["supervisor", "situation", "guidance", "resource"],
    "totalTime": "4.2s",
    "model": "deepseek-chat"
  }
}
```

## Cost Estimation

**Option A (Single Agent):**
- 1 API call per emergency
- ~$0.0004 per emergency

**Option B (Multi-Agent):**
- 3-4 API calls per emergency (supervisor + specialists)
- ~$0.0012-0.0016 per emergency
- Still less than a penny!

**For 1,000 emergencies:**
- Option A: ~$0.40
- Option B: ~$1.20
- Extra cost: ~$0.80 for much better responses

## Success Criteria

- [ ] Python FastAPI service running
- [ ] LangGraph multi-agent system working
- [ ] All 4 agents (supervisor + 3 specialists) operational
- [ ] Docker containers building successfully
- [ ] Docker Compose orchestrating all services
- [ ] Frontend connecting to multi-agent backend
- [ ] Agent responses clearly labeled
- [ ] Execution traces visible
- [ ] Documentation complete
- [ ] System deployed and tested

## File Structure (Final)

```
week1-basics/
├── agents/                    # NEW Python multi-agent service
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py               # FastAPI server
│   ├── config.py             # Configuration
│   ├── supervisor.py         # Supervisor agent
│   ├── situation_agent.py    # Situation assessment
│   ├── guidance_agent.py     # Guidance provider
│   ├── resource_agent.py     # Resource coordinator
│   ├── graph_builder.py      # LangGraph setup
│   └── models.py             # Pydantic models
├── backend/                   # UPDATED Node.js gateway
│   ├── Dockerfile            # NEW
│   ├── server.js             # UPDATED to call Python
│   └── package.json
├── frontend/                  # UPDATED UI
│   ├── index.html            # UPDATED to show agents
│   ├── app.js                # UPDATED agent visualization
│   └── styles.css
├── docker-compose.yml         # NEW
├── .env.example
├── README.md                  # UPDATED
└── plans/
    ├── ai-agents-sos-app.md
    └── option-b-docker-multi-agent.md  # This file
```

## Next Steps

1. **Confirm Docker Installation**
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Start Implementation**
   - Create Python project structure
   - Install Python dependencies
   - Build first agent
   - Test locally before containerizing

3. **Incremental Approach**
   - Day 1: Get single Python agent working
   - Day 2: Add LangGraph multi-agent
   - Day 3: Dockerize everything
   - Day 4: Add advanced features
   - Day 5: Test and document

---

**Ready to start?** Let's begin with Phase 1: Python Backend Setup!
