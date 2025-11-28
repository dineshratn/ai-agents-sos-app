"""Resource coordination agent - suggests nearby emergency resources."""
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


RESOURCE_PROMPT = """You are an emergency resource coordination specialist.

Based on the emergency situation, suggest appropriate resources and contacts.

Emergency Type: {emergency_type}
Severity: {severity}/5
Location: {location}
Recommended Response: {recommended_response}

Provide:
1. Emergency services phone number (911, local equivalent, or specific services)
2. 2-3 nearby resources (hospitals, police stations, shelters, etc.)
3. 1-2 additional helpful resources (hotlines, websites, services)

Respond in JSON format:
{{
  "emergencyServices": "911",
  "nearbyResources": ["Resource 1 - distance", "Resource 2 - distance"],
  "additionalResources": ["Hotline or website", "Support service"]
}}

Note: Since we don't have real location data, provide general helpful resources."""


def resource_agent(state: EmergencyState) -> EmergencyState:
    """
    Coordinate nearby emergency resources.

    Uses:
    - Emergency type
    - Severity
    - Location
    - Recommended response

    Provides:
    - Emergency services contact
    - Nearby hospitals/facilities
    - Additional resources (hotlines, websites)
    """
    print(f"🏢 Resource Agent coordinating resources...")

    try:
        # Get assessment from state
        emergency_type = state.get('emergency_type', 'unknown')
        severity = state.get('severity', 3)
        recommended_response = state.get('recommended_response', 'contact_help')
        location = state.get('location', 'Unknown')

        # Call LLM for resource coordination
        completion = client.chat.completions.create(
            model=Config.MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": RESOURCE_PROMPT.format(
                        emergency_type=emergency_type,
                        severity=severity,
                        location=location,
                        recommended_response=recommended_response
                    )
                },
                {
                    "role": "user",
                    "content": f"Provide emergency resources for {emergency_type} at {location}"
                }
            ],
            temperature=0.3,
            max_tokens=500,
            response_format={"type": "json_object"}
        )

        # Parse response
        resources = json.loads(completion.choices[0].message.content)

        # Update state with resources
        state['emergency_services'] = resources.get('emergencyServices', '911')
        state['nearby_hospitals'] = resources.get('nearbyResources', [])
        state['additional_resources'] = resources.get('additionalResources', [])

        # Track agent call
        agents_called = state.get('agents_called', [])
        agents_called.append(AgentNames.RESOURCE)
        state['agents_called'] = agents_called

        # Track tokens
        tokens_used = completion.usage.total_tokens if completion.usage else 0
        state['total_tokens'] = state.get('total_tokens', 0) + tokens_used

        print(f"✅ Resources: {state['emergency_services']} - {len(state.get('nearby_hospitals', []))} facilities")
        print(f"📊 Tokens used: {tokens_used}")

    except Exception as e:
        print(f"❌ Resource agent error: {str(e)}")
        # Fallback values
        state['emergency_services'] = '911'
        state['nearby_hospitals'] = ['Call 911 for nearest emergency facility']
        state['additional_resources'] = ['National Emergency Hotline: 911']

        agents_called = state.get('agents_called', [])
        agents_called.append(AgentNames.RESOURCE)
        state['agents_called'] = agents_called

    return state
