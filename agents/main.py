"""FastAPI server for multi-agent emergency assessment system."""
import time
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
import httpx

from config import Config
from models import EmergencyRequest, SingleAgentResponse

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


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "SOS Multi-Agent Emergency Assessment System",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "assess": "/assess (POST)",
            "docs": "/docs"
        },
        "phase": "Phase 1: Single Agent",
        "next": "Phase 2: Multi-Agent with LangGraph"
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
