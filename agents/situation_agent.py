"""Situation assessment agent - analyzes emergency type, severity, and risks."""
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


SITUATION_PROMPT = """You are an emergency situation assessment specialist.

Analyze the emergency and provide:
1. Emergency type: medical, security, natural_disaster, accident, or other
2. Severity level: 1 (minor) to 5 (life-threatening)
3. Immediate risks: List of specific dangers
4. Confidence score: 1.0 (low confidence) to 5.0 (high confidence) in your assessment

Emergency: {description}
Location: {location}

Respond in JSON format:
{{
  "emergencyType": "string",
  "severity": number (1-5),
  "immediateRisks": ["risk1", "risk2", "risk3"],
  "confidence": number (1.0-5.0)
}}

Be accurate, concise, and prioritize safety."""


def situation_agent(state: EmergencyState) -> EmergencyState:
    """
    Assess the emergency situation.

    Phase 4 Enhancements:
    - Confidence score calculation
    - Structured logging
    - Execution trace tracking
    - Better error handling

    Determines:
    - Type of emergency
    - Severity level (1-5)
    - Immediate risks
    - Confidence in assessment (1-5)
    """
    start_time = time.time()

    # Log agent start
    log_agent_started(
        AgentNames.SITUATION,
        {"description": state['description'][:100], "location": state.get('location')}
    )

    try:
        # Call LLM for situation assessment
        log_llm_call(AgentNames.SITUATION, Config.MODEL_NAME)

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
        state['situation_confidence'] = assessment.get('confidence', 3.0)  # Phase 4

        # Log confidence score
        log_confidence_score(
            AgentNames.SITUATION,
            state['situation_confidence'],
            f"{state['emergency_type']} severity {state['severity']}"
        )

        # Track agent call
        agents_called = state.get('agents_called', [])
        if AgentNames.SITUATION not in agents_called:
            agents_called.append(AgentNames.SITUATION)
        state['agents_called'] = agents_called

        # Track tokens
        tokens_used = completion.usage.total_tokens if completion.usage else 0
        state['total_tokens'] = state.get('total_tokens', 0) + tokens_used

        # Add to execution trace
        execution_time = time.time() - start_time
        execution_trace = state.get('execution_trace', [])
        execution_trace.append({
            "agent": AgentNames.SITUATION,
            "action": "situation_assessment",
            "emergency_type": state['emergency_type'],
            "severity": state['severity'],
            "confidence": state['situation_confidence'],
            "tokens": tokens_used,
            "timestamp": time.time(),
            "execution_time": execution_time
        })
        state['execution_trace'] = execution_trace

        # Log completion
        log_agent_completed(
            AgentNames.SITUATION,
            execution_time,
            {
                "type": state['emergency_type'],
                "severity": state['severity'],
                "confidence": state['situation_confidence']
            }
        )

    except Exception as e:
        # Log error
        log_agent_error(AgentNames.SITUATION, e)

        # Fallback values
        state['emergency_type'] = 'unknown'
        state['severity'] = 3
        state['immediate_risks'] = ['Unable to assess - proceed with caution']
        state['situation_confidence'] = 1.0  # Low confidence due to error

        agents_called = state.get('agents_called', [])
        if AgentNames.SITUATION not in agents_called:
            agents_called.append(AgentNames.SITUATION)
        state['agents_called'] = agents_called

        # Add error to execution trace
        execution_time = time.time() - start_time
        execution_trace = state.get('execution_trace', [])
        execution_trace.append({
            "agent": AgentNames.SITUATION,
            "action": "error",
            "error": str(e),
            "timestamp": time.time(),
            "execution_time": execution_time
        })
        state['execution_trace'] = execution_trace

    return state
