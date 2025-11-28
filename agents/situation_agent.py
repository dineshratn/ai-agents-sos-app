"""Situation assessment agent - analyzes emergency type, severity, and risks."""
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


SITUATION_PROMPT = """You are an emergency situation assessment specialist.

Analyze the emergency and provide:
1. Emergency type: medical, security, natural_disaster, accident, or other
2. Severity level: 1 (minor) to 5 (life-threatening)
3. Immediate risks: List of specific dangers

Emergency: {description}
Location: {location}

Respond in JSON format:
{{
  "emergencyType": "string",
  "severity": number (1-5),
  "immediateRisks": ["risk1", "risk2", "risk3"]
}}

Be accurate, concise, and prioritize safety."""


def situation_agent(state: EmergencyState) -> EmergencyState:
    """
    Assess the emergency situation.

    Determines:
    - Type of emergency
    - Severity level (1-5)
    - Immediate risks
    """
    print(f"🏥 Situation Agent analyzing: {state['description'][:50]}...")

    try:
        # Call LLM for situation assessment
        completion = client.chat.completions.create(
            model=Config.MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": SITUATION_PROMPT.format(
                        description=state['description'],
                        location=state.get('location', 'Unknown')
                    )
                },
                {
                    "role": "user",
                    "content": f"Assess this emergency: {state['description']}"
                }
            ],
            temperature=0.3,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        # Parse response
        assessment = json.loads(completion.choices[0].message.content)

        # Update state with assessment
        state['emergency_type'] = assessment.get('emergencyType', 'unknown')
        state['severity'] = assessment.get('severity', 3)
        state['immediate_risks'] = assessment.get('immediateRisks', [])

        # Track agent call
        agents_called = state.get('agents_called', [])
        agents_called.append(AgentNames.SITUATION)
        state['agents_called'] = agents_called

        # Track tokens
        tokens_used = completion.usage.total_tokens if completion.usage else 0
        state['total_tokens'] = state.get('total_tokens', 0) + tokens_used

        print(f"✅ Assessment: Type={state['emergency_type']}, Severity={state['severity']}")
        print(f"📊 Tokens used: {tokens_used}")

    except Exception as e:
        print(f"❌ Situation agent error: {str(e)}")
        # Fallback values
        state['emergency_type'] = 'unknown'
        state['severity'] = 3
        state['immediate_risks'] = ['Unable to assess - proceed with caution']

        agents_called = state.get('agents_called', [])
        agents_called.append(AgentNames.SITUATION)
        state['agents_called'] = agents_called

    return state
