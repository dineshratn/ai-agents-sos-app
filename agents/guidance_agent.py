"""Guidance agent - provides step-by-step safety instructions."""
from openai import OpenAI
from config import Config
from state import EmergencyState, AgentNames
import httpx
import json


# Initialize OpenRouter client
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


GUIDANCE_PROMPT = """You are an emergency guidance specialist.

Based on the assessed emergency, provide clear, actionable safety instructions.

Emergency Type: {emergency_type}
Severity: {severity}/5
Immediate Risks: {risks}
Description: {description}
Location: {location}

Provide:
1. Recommended response: "self-help", "contact_help", or "call_911"
2. 5 step-by-step safety instructions (clear, actionable, prioritized)

Respond in JSON format:
{{
  "recommendedResponse": "call_911",
  "guidanceSteps": ["step 1", "step 2", "step 3", "step 4", "step 5"]
}}

Prioritize user safety above all else. Be concise and clear."""


def guidance_agent(state: EmergencyState) -> EmergencyState:
    """
    Provide step-by-step guidance based on situation assessment.

    Uses:
    - Emergency type
    - Severity level
    - Immediate risks

    Provides:
    - Recommended response action
    - Step-by-step safety instructions
    """
    print(f"📋 Guidance Agent providing instructions...")

    try:
        # Get situation assessment from state
        emergency_type = state.get('emergency_type', 'unknown')
        severity = state.get('severity', 3)
        risks = state.get('immediate_risks', [])

        # Call LLM for guidance
        completion = client.chat.completions.create(
            model=Config.MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": GUIDANCE_PROMPT.format(
                        emergency_type=emergency_type,
                        severity=severity,
                        risks=', '.join(risks) if risks else 'Unknown',
                        description=state['description'],
                        location=state.get('location', 'Unknown')
                    )
                },
                {
                    "role": "user",
                    "content": f"Provide safety guidance for this {emergency_type} emergency (severity {severity}/5)"
                }
            ],
            temperature=0.3,
            max_tokens=600,
            response_format={"type": "json_object"}
        )

        # Parse response
        guidance = json.loads(completion.choices[0].message.content)

        # Update state with guidance
        state['recommended_response'] = guidance.get('recommendedResponse', 'contact_help')
        state['guidance_steps'] = guidance.get('guidanceSteps', [])

        # Track agent call
        agents_called = state.get('agents_called', [])
        agents_called.append(AgentNames.GUIDANCE)
        state['agents_called'] = agents_called

        # Track tokens
        tokens_used = completion.usage.total_tokens if completion.usage else 0
        state['total_tokens'] = state.get('total_tokens', 0) + tokens_used

        print(f"✅ Guidance: {state['recommended_response']} - {len(state['guidance_steps'])} steps provided")
        print(f"📊 Tokens used: {tokens_used}")

    except Exception as e:
        print(f"❌ Guidance agent error: {str(e)}")
        # Fallback values
        state['recommended_response'] = 'contact_help'
        state['guidance_steps'] = [
            'Stay calm and assess the situation',
            'Move to a safe location if possible',
            'Call for help if needed',
            'Follow any official emergency instructions',
            'Wait for assistance to arrive'
        ]

        agents_called = state.get('agents_called', [])
        agents_called.append(AgentNames.GUIDANCE)
        state['agents_called'] = agents_called

    return state
