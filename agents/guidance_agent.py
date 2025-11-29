"""Guidance agent - provides step-by-step safety instructions."""
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
3. Confidence score: 1.0 (low confidence) to 5.0 (high confidence) in your guidance

Respond in JSON format:
{{
  "recommendedResponse": "call_911",
  "guidanceSteps": ["step 1", "step 2", "step 3", "step 4", "step 5"],
  "confidence": number (1.0-5.0)
}}

Prioritize user safety above all else. Be concise and clear."""


def guidance_agent(state: EmergencyState) -> EmergencyState:
    """
    Provide step-by-step guidance based on situation assessment.

    Phase 4 Enhancements:
    - Confidence score calculation
    - Structured logging
    - Execution trace tracking
    - Better error handling

    Uses:
    - Emergency type
    - Severity level
    - Immediate risks

    Provides:
    - Recommended response action
    - Step-by-step safety instructions
    - Confidence score (1-5)
    """
    start_time = time.time()

    # Get situation assessment from state
    emergency_type = state.get('emergency_type', 'unknown')
    severity = state.get('severity', 3)
    risks = state.get('immediate_risks', [])

    # Log agent start
    log_agent_started(
        AgentNames.GUIDANCE,
        {"emergency_type": emergency_type, "severity": severity}
    )

    try:
        # Call LLM for guidance
        log_llm_call(AgentNames.GUIDANCE, Config.MODEL_NAME)

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
        state['guidance_confidence'] = guidance.get('confidence', 3.0)  # Phase 4

        # Log confidence score
        log_confidence_score(
            AgentNames.GUIDANCE,
            state['guidance_confidence'],
            f"{len(state['guidance_steps'])} steps for {state['recommended_response']}"
        )

        # Track agent call
        agents_called = state.get('agents_called', [])
        if AgentNames.GUIDANCE not in agents_called:
            agents_called.append(AgentNames.GUIDANCE)
        state['agents_called'] = agents_called

        # Track tokens
        tokens_used = completion.usage.total_tokens if completion.usage else 0
        state['total_tokens'] = state.get('total_tokens', 0) + tokens_used

        # Add to execution trace
        execution_time = time.time() - start_time
        execution_trace = state.get('execution_trace', [])
        execution_trace.append({
            "agent": AgentNames.GUIDANCE,
            "action": "guidance_generation",
            "recommended_response": state['recommended_response'],
            "steps_count": len(state['guidance_steps']),
            "confidence": state['guidance_confidence'],
            "tokens": tokens_used,
            "timestamp": time.time(),
            "execution_time": execution_time
        })
        state['execution_trace'] = execution_trace

        # Log completion
        log_agent_completed(
            AgentNames.GUIDANCE,
            execution_time,
            {
                "response": state['recommended_response'],
                "steps": len(state['guidance_steps']),
                "confidence": state['guidance_confidence']
            }
        )

    except Exception as e:
        # Log error
        log_agent_error(AgentNames.GUIDANCE, e)

        # Fallback values
        state['recommended_response'] = 'contact_help'
        state['guidance_steps'] = [
            'Stay calm and assess the situation',
            'Move to a safe location if possible',
            'Call for help if needed',
            'Follow any official emergency instructions',
            'Wait for assistance to arrive'
        ]
        state['guidance_confidence'] = 1.0  # Low confidence due to error

        agents_called = state.get('agents_called', [])
        if AgentNames.GUIDANCE not in agents_called:
            agents_called.append(AgentNames.GUIDANCE)
        state['agents_called'] = agents_called

        # Add error to execution trace
        execution_time = time.time() - start_time
        execution_trace = state.get('execution_trace', [])
        execution_trace.append({
            "agent": AgentNames.GUIDANCE,
            "action": "error",
            "error": str(e),
            "timestamp": time.time(),
            "execution_time": execution_time
        })
        state['execution_trace'] = execution_trace

    return state
