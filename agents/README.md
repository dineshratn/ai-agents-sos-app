# SOS Multi-Agent System - Python Backend

FastAPI-based emergency assessment service using AI agents and LangGraph.

## Current Status: Phase 1 - Single Agent ✅

**Completed:**
- ✅ FastAPI service running in Docker
- ✅ OpenRouter + DeepSeek integration
- ✅ Emergency situation assessment endpoint
- ✅ Structured JSON responses with Pydantic models
- ✅ SSL verification bypass for corporate proxies (development only)

**Next Phase:**
- 🔄 Phase 2: LangGraph multi-agent orchestration (Supervisor + 3 specialist agents)

## Architecture

```
┌─────────────────────────────────────┐
│    Python FastAPI Service           │
│         (Port 8000)                  │
│                                      │
│  ┌────────────────────────────────┐ │
│  │   Emergency Assessment API     │ │
│  │                                │ │
│  │  - /health (GET)              │ │
│  │  - /assess (POST)             │ │
│  │  - / (GET - API info)         │ │
│  └────────────────────────────────┘ │
│                                      │
│         OpenRouter API               │
│       (DeepSeek Chat Model)          │
└─────────────────────────────────────┘
```

## Quick Start

### 1. Build Docker Image

```bash
docker build -t sos-agents:latest .
```

### 2. Run Container

```bash
# From project root directory
cd /home/dinesh/docker-ai-agents-training/week1-basics

# Run with environment variables
docker run -d \
  --name sos-agents \
  -p 8000:8000 \
  --env-file .env \
  -e VERIFY_SSL=false \
  sos-agents:latest
```

### 3. Test the Service

**Health Check:**
```bash
curl http://localhost:8000/health
```

**Emergency Assessment:**
```bash
curl -X POST http://localhost:8000/assess \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Severe chest pain and difficulty breathing",
    "location": "Home"
  }'
```

**Expected Response:**
```json
{
  "emergency_type": "medical",
  "severity": 5,
  "immediate_risks": [
    "Heart attack",
    "Respiratory failure",
    "Loss of consciousness"
  ],
  "recommended_response": "Call 911",
  "guidance": [
    "Call 911 immediately and describe the symptoms.",
    "Sit or lie down in a comfortable position to reduce strain.",
    "Loosen any tight clothing around the chest and neck.",
    "If prescribed, take nitroglycerin or aspirin as directed.",
    "Stay calm and wait for emergency responders to arrive."
  ],
  "ai_model": "deepseek/deepseek-chat",
  "ai_provider": "OpenRouter",
  "tokens_used": 314,
  "generated_at": "2025-11-28T16:21:57.364689"
}
```

## Environment Variables

Required in `.env` file:

```env
# OpenRouter API Key (required)
OPENROUTER_API_KEY=your_api_key_here

# Site URL for OpenRouter analytics
SITE_URL=http://localhost:3000

# SSL Verification (set to false for corporate proxies/Zscaler)
# WARNING: Only disable in development environments
VERIFY_SSL=false
```

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "SOS Multi-Agent System",
  "version": "1.0.0",
  "model": "deepseek/deepseek-chat",
  "provider": "OpenRouter"
}
```

### POST /assess
Assess an emergency situation using AI.

**Request Body:**
```json
{
  "description": "string (required)",
  "location": "string (optional)"
}
```

**Response:** `SingleAgentResponse` model with emergency assessment.

### GET /
API information and available endpoints.

## Project Structure

```
agents/
├── Dockerfile              # Container configuration
├── .dockerignore          # Docker build exclusions
├── requirements.txt       # Python dependencies
├── config.py             # Configuration management
├── models.py             # Pydantic data models
├── main.py               # FastAPI application
└── README.md             # This file
```

## Technology Stack

- **Python 3.11** - Runtime environment
- **FastAPI 0.104.1** - Modern web framework
- **Uvicorn** - ASGI server
- **OpenAI SDK 1.109.1** - OpenRouter API client
- **Pydantic 2.5.0** - Data validation
- **LangChain 0.1.0** - LLM tooling (for Phase 2)
- **LangGraph 0.0.20** - Agent orchestration (for Phase 2)

## Docker Configuration

### Base Image
- `python:3.11-slim` - Minimal Python runtime

### Security Features
- CA certificates installed for SSL/TLS
- SSL verification configurable via environment variable
- No root user execution (best practice for Phase 2)

### Health Checks
- Interval: 30 seconds
- Timeout: 3 seconds
- Start period: 5 seconds
- Retries: 3

## Development Notes

### SSL Verification Bypass
For development environments behind corporate proxies (like Zscaler):

```bash
# Disable SSL verification (development only)
docker run -e VERIFY_SSL=false ...
```

**⚠️ WARNING:** Never disable SSL verification in production!

### Viewing Logs
```bash
# Real-time logs
docker logs -f sos-agents

# Last 50 lines
docker logs --tail 50 sos-agents
```

### Stopping Container
```bash
docker stop sos-agents
docker rm sos-agents
```

## Performance

- **Average Response Time:** ~5-6 seconds
- **Token Usage:** ~300-400 tokens per assessment
- **Cost per Request:** ~$0.0004 (DeepSeek pricing)

## Next Steps: Phase 2

Implementation of LangGraph multi-agent system:

1. **Supervisor Agent** - Routes emergencies to appropriate specialists
2. **Situation Assessment Agent** - Analyzes emergency type and severity
3. **Guidance Agent** - Provides step-by-step instructions
4. **Resource Coordination Agent** - Suggests nearby resources

See `../plans/option-b-docker-multi-agent.md` for full Phase 2 implementation plan.

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs sos-agents

# Verify environment variables
docker exec sos-agents env | grep OPENROUTER
```

### API Connection Errors
- Verify API key is valid at https://openrouter.ai
- Check if SSL verification needs to be disabled
- Ensure container has network access

### 401 Authentication Errors
- Verify `OPENROUTER_API_KEY` in `.env` file
- Ensure API key has sufficient credits
- Check API key is not expired

## License

MIT License - See project root for details.

## Support

For issues or questions:
- Check logs: `docker logs sos-agents`
- Review Phase 1 completion checklist
- Refer to Option B implementation plan
