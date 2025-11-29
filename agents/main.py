"""FastAPI server for multi-agent emergency assessment system."""
import time
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import httpx

from config import Config
from models import EmergencyRequest, SingleAgentResponse, MultiAgentResponse

# Initialize FastAPI app
app = FastAPI(
    title="SOS Multi-Agent System",
    description="Multi-agent AI system for emergency situation assessment",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenRouter client with optional SSL verification bypass
http_client = httpx.Client(verify=Config.VERIFY_SSL) if not Config.VERIFY_SSL else None
client = OpenAI(
    api_key=Config.OPENROUTER_API_KEY,
    base_url=Config.OPENROUTER_BASE_URL,
    http_client=http_client,
    default_headers={
        "HTTP-Referer": Config.SITE_URL,
        "X-Title": Config.SITE_NAME
    }
)

# System prompt for situation assessment
ASSESSMENT_PROMPT = """You are an emergency situation assessment specialist.
Analyze the user's emergency description and provide:
1. Emergency type (medical, security, natural disaster, accident, other)
2. Severity level (1-5, where 5 is life-threatening)
3. Immediate risks
4. Recommended response (self-help, contact help, call 911)
5. Step-by-step guidance (5 clear steps)

Be concise, clear, and prioritize user safety.
Respond in JSON format with these fields:
{
  "emergencyType": "string",
  "severityLevel": number,
  "immediateRisks": ["string"],
  "recommendedResponse": "string",
  "guidance": ["step 1", "step 2", "step 3", "step 4", "step 5"]
}"""


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "SOS Multi-Agent System",
        "version": "1.0.0",
        "model": Config.MODEL_NAME,
        "provider": "OpenRouter"
    }


@app.post("/assess", response_model=SingleAgentResponse)
async def assess_emergency(request: EmergencyRequest):
    """
    Assess an emergency situation using AI.

    This is Phase 1: Single agent implementation.
    Will be upgraded to multi-agent in Phase 2.
    """
    try:
        start_time = time.time()

        # Call OpenRouter API
        completion = client.chat.completions.create(
            model=Config.MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": ASSESSMENT_PROMPT
                },
                {
                    "role": "user",
                    "content": f"Emergency description: {request.description}\nLocation: {request.location or 'Unknown'}"
                }
            ],
            temperature=Config.TEMPERATURE,
            max_tokens=Config.MAX_TOKENS,
            response_format={"type": "json_object"}
        )

        # Parse response
        import json
        assessment_data = json.loads(completion.choices[0].message.content)

        # Build response
        response = SingleAgentResponse(
            emergency_type=assessment_data.get("emergencyType", "unknown"),
            severity=assessment_data.get("severityLevel", 3),
            immediate_risks=assessment_data.get("immediateRisks", []),
            recommended_response=assessment_data.get("recommendedResponse", "Contact emergency services"),
            guidance=assessment_data.get("guidance", []),
            ai_model=Config.MODEL_NAME,
            ai_provider="OpenRouter",
            tokens_used=completion.usage.total_tokens if completion.usage else None,
            generated_at=datetime.utcnow().isoformat()
        )

        execution_time = time.time() - start_time
        print(f"✅ Assessment completed in {execution_time:.2f}s")
        print(f"📊 Tokens used: {response.tokens_used}")

        return response

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error during assessment: {str(e)}")
        print(f"📋 Traceback: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to assess emergency: {str(e)}"
        )


@app.post("/assess-multi", response_model=MultiAgentResponse)
async def assess_emergency_multi_agent(request: EmergencyRequest):
    """
    Assess an emergency using multi-agent orchestration (Phase 4 Enhanced).

    This endpoint uses LangGraph to coordinate 4 specialized agents:
    - Supervisor: Routes to appropriate specialists
    - Situation Agent: Analyzes type, severity, and risks
    - Guidance Agent: Provides step-by-step instructions
    - Resource Agent: Coordinates nearby resources

    Phase 4 Enhancements:
    - Conversation history with thread_id
    - Agent confidence scores
    - Detailed execution metrics
    - Structured logging
    - Dynamic routing

    Returns comprehensive assessment from all agents.
    """
    try:
        from graph_builder import emergency_graph
        from state import AgentNames
        from models import Assessment, Guidance, Resource, AgentOrchestration, ExecutionMetrics
        from logger import log_workflow_started, log_workflow_completed
        import uuid

        start_time = time.time()

        # Phase 4: Generate unique workflow ID
        workflow_id = str(uuid.uuid4())
        thread_id = request.thread_id or str(uuid.uuid4())

        # Phase 4: Structured logging
        log_workflow_started(workflow_id, {
            "description": request.description[:100],
            "location": request.location,
            "thread_id": thread_id
        })

        # Initialize state with Phase 4 fields
        initial_state = {
            "description": request.description,
            "location": request.location,
            "thread_id": thread_id,
            "workflow_id": workflow_id,
            "agents_called": [],
            "assessment_complete": False,
            "total_tokens": 0,
            "messages": [],
            "execution_trace": [],
            "performance_metrics": {}
        }

        # Run the multi-agent workflow with thread_id for checkpointing
        config = {"configurable": {"thread_id": thread_id}}
        final_state = emergency_graph.invoke(initial_state, config)

        # Build response from final state with Phase 4 confidence scores
        assessment = Assessment(
            emergency_type=final_state.get('emergency_type', 'unknown'),
            severity=final_state.get('severity', 3),
            immediate_risks=final_state.get('immediate_risks', []),
            recommended_response=final_state.get('recommended_response', 'contact_help'),
            confidence=final_state.get('situation_confidence')  # Phase 4
        )

        guidance = Guidance(
            steps=final_state.get('guidance_steps', []),
            provided_by=AgentNames.GUIDANCE,
            confidence=final_state.get('guidance_confidence')  # Phase 4
        )

        resources = Resource(
            nearby_hospitals=final_state.get('nearby_hospitals'),
            emergency_services=final_state.get('emergency_services', '911'),
            provided_by=AgentNames.RESOURCE,
            confidence=final_state.get('resource_confidence')  # Phase 4
        )

        execution_time = time.time() - start_time
        orchestration = AgentOrchestration(
            agents_called=final_state.get('agents_called', []),
            total_time=execution_time,
            model=Config.MODEL_NAME,
            provider="OpenRouter",
            total_tokens=final_state.get('total_tokens', 0),  # Phase 4
            workflow_id=workflow_id  # Phase 4
        )

        # Phase 4: Extract execution metrics
        execution_trace = final_state.get('execution_trace', [])
        agent_timings = {}
        routing_decisions = []

        for trace in execution_trace:
            agent = trace.get('agent', 'unknown')
            exec_time = trace.get('execution_time', 0)
            action = trace.get('action', '')

            if exec_time > 0:
                agent_timings[agent] = agent_timings.get(agent, 0) + exec_time

            if action == 'routing_decision':
                routing_decisions.append(f"{agent} → {trace.get('next_agent')}: {trace.get('reason', '')}")

        metrics = ExecutionMetrics(
            execution_trace=execution_trace,
            agent_timings=agent_timings,
            routing_decisions=routing_decisions
        )

        response = MultiAgentResponse(
            assessment=assessment,
            guidance=guidance,
            resources=resources,
            orchestration=orchestration,
            metrics=metrics  # Phase 4
        )

        # Phase 4: Structured logging for completion
        log_workflow_completed(
            workflow_id,
            execution_time,
            final_state.get('agents_called', [])
        )

        return response

    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Error during multi-agent assessment: {str(e)}")
        print(f"📋 Traceback: {error_details}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to assess emergency with multi-agent system: {str(e)}"
        )


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "SOS Multi-Agent Emergency Assessment System",
        "version": "3.0.0",
        "endpoints": {
            "health": "/health (GET)",
            "assess": "/assess (POST) - Single agent",
            "assess_multi": "/assess-multi (POST) - Multi-agent orchestration with Phase 4 enhancements",
            "docs": "/docs"
        },
        "phase": "Phase 4: Enhanced Features ✅",
        "features": [
            "Single-agent emergency assessment",
            "Multi-agent orchestration with LangGraph",
            "Supervisor routing pattern with dynamic routing",
            "Specialized agents: Situation, Guidance, Resource",
            "Agent confidence scores (1-5)",
            "Conversation history with checkpointing",
            "Detailed execution traces and metrics",
            "Structured logging and monitoring",
            "Performance tracking and optimization"
        ],
        "phase_4_enhancements": {
            "state_management": "LangGraph MemorySaver checkpointing",
            "conversation_history": "Thread-based session continuity",
            "agent_handoffs": "Dynamic routing based on emergency type and severity",
            "enhanced_responses": "Confidence scores and agent metadata",
            "monitoring": "Structured logging, execution traces, performance metrics"
        }
    }


if __name__ == "__main__":
    import uvicorn

    print("🚀 Starting SOS Multi-Agent System...")
    print(f"📍 Server: http://{Config.HOST}:{Config.PORT}")
    print(f"📚 API Docs: http://{Config.HOST}:{Config.PORT}/docs")
    print(f"🤖 Model: {Config.MODEL_NAME}")

    uvicorn.run(
        app,
        host=Config.HOST,
        port=Config.PORT,
        log_level="info"
    )
