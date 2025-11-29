"""Resource coordination agent - suggests nearby emergency resources."""
from openai import OpenAI
from config import Config
from state import EmergencyState, AgentNames
from logger import (
    log_agent_started,
    log_agent_completed,
    log_agent_error,
    log_llm_call,
    log_confidence_score
)
import httpx
import json
import time


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
4. Confidence score: 1.0 (low confidence) to 5.0 (high confidence) in resource recommendations

Respond in JSON format:
{{
  "emergencyServices": "911",
  "nearbyResources": ["Resource 1 - distance", "Resource 2 - distance"],
  "additionalResources": ["Hotline or website", "Support service"],
  "confidence": number (1.0-5.0)
}}

Note: Since we don't have real location data, provide general helpful resources."""


def resource_agent(state: EmergencyState) -> EmergencyState:
    """
    Coordinate nearby emergency resources.

    Phase 4 Enhancements:
    - Confidence score calculation
    - Structured logging
    - Execution trace tracking
    - Better error handling

    Uses:
    - Emergency type
    - Severity
    - Location
    - Recommended response

    Provides:
    - Emergency services contact
    - Nearby hospitals/facilities
    - Additional resources (hotlines, websites)
    - Confidence score (1-5)
    """
    start_time = time.time()

    # Get assessment from state
    emergency_type = state.get('emergency_type', 'unknown')
    severity = state.get('severity', 3)
    recommended_response = state.get('recommended_response', 'contact_help')
    location = state.get('location', 'Unknown')

    # Log agent start
    log_agent_started(
        AgentNames.RESOURCE,
        {"emergency_type": emergency_type, "location": location}
    )

    try:
        # Call LLM for resource coordination
        log_llm_call(AgentNames.RESOURCE, Config.MODEL_NAME)

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
        state['resource_confidence'] = resources.get('confidence', 3.0)  # Phase 4

        # Log confidence score
        log_confidence_score(
            AgentNames.RESOURCE,
            state['resource_confidence'],
            f"{len(state.get('nearby_hospitals', []))} resources found"
        )

        # Track agent call
        agents_called = state.get('agents_called', [])
        if AgentNames.RESOURCE not in agents_called:
            agents_called.append(AgentNames.RESOURCE)
        state['agents_called'] = agents_called

        # Track tokens
        tokens_used = completion.usage.total_tokens if completion.usage else 0
        state['total_tokens'] = state.get('total_tokens', 0) + tokens_used

        # Add to execution trace
        execution_time = time.time() - start_time
        execution_trace = state.get('execution_trace', [])
        execution_trace.append({
            "agent": AgentNames.RESOURCE,
            "action": "resource_coordination",
            "emergency_services": state['emergency_services'],
            "resources_count": len(state.get('nearby_hospitals', [])),
            "confidence": state['resource_confidence'],
            "tokens": tokens_used,
            "timestamp": time.time(),
            "execution_time": execution_time
        })
        state['execution_trace'] = execution_trace

        # Log completion
        log_agent_completed(
            AgentNames.RESOURCE,
            execution_time,
            {
                "services": state['emergency_services'],
                "resources": len(state.get('nearby_hospitals', [])),
                "confidence": state['resource_confidence']
            }
        )

    except Exception as e:
        # Log error
        log_agent_error(AgentNames.RESOURCE, e)

        # Fallback values
        state['emergency_services'] = '911'
        state['nearby_hospitals'] = ['Call 911 for nearest emergency facility']
        state['additional_resources'] = ['National Emergency Hotline: 911']
        state['resource_confidence'] = 1.0  # Low confidence due to error

        agents_called = state.get('agents_called', [])
        if AgentNames.RESOURCE not in agents_called:
            agents_called.append(AgentNames.RESOURCE)
        state['agents_called'] = agents_called

        # Add error to execution trace
        execution_time = time.time() - start_time
        execution_trace = state.get('execution_trace', [])
        execution_trace.append({
            "agent": AgentNames.RESOURCE,
            "action": "error",
            "error": str(e),
            "timestamp": time.time(),
            "execution_time": execution_time
        })
        state['execution_trace'] = execution_trace

    return state
