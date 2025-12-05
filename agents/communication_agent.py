"""Communication agent - prepares messages for family contacts via SMS/WhatsApp."""
import json
import time
from typing import List, Dict

from openai import OpenAI

from config import Config
from state import EmergencyState, AgentNames
from logger import (
    log_agent_started,
    log_agent_completed,
    log_agent_error,
    log_llm_call,
    log_confidence_score,
)
import httpx

# Initialize OpenRouter client
http_client = httpx.Client(verify=Config.VERIFY_SSL) if not Config.VERIFY_SSL else None
client = OpenAI(
    api_key=Config.OPENROUTER_API_KEY,
    base_url=Config.OPENROUTER_BASE_URL,
    http_client=http_client,
    default_headers={
        "HTTP-Referer": Config.SITE_URL,
        "X-Title": Config.SITE_NAME,
    },
)

COMMUNICATION_PROMPT = """You are an emergency communication assistant.

Create short, clear messages that the user can send to close family members via SMS or WhatsApp about an ongoing emergency.

Use the details below:
Emergency Type: {emergency_type}
Severity: {severity}/5
Immediate Risks: {risks}
Description: {description}
Location: {location}

Contacts: {contacts}

For each contact, generate:
1. A brief SMS-style message (160 characters max, concise, no emojis).
2. A slightly richer WhatsApp-style message (can be a bit longer, still concise and respectful).

Return JSON in the following format:
{{
  "contacts": [
    {{
      "name": "string",
      "relation": "string",
      "sms": "string",
      "whatsapp": "string"
    }}
  ],
  "overallConfidence": number (1.0-5.0)
}}

Focus on:
- Clarity about the emergency and location.
- Reassurance if appropriate.
- Clear request for help or staying available for updates.
Do not invent new contacts, only use the ones provided.
"""


def _format_contacts_for_prompt(contacts: List[Dict]) -> str:
    """Format contacts list for the LLM prompt."""
    if not contacts:
        return "No contacts provided"
    safe_contacts = []
    for c in contacts:
        safe_contacts.append(
            {
                "name": c.get("name", "Unknown"),
                "relation": c.get("relation", "family"),
            }
        )
    return json.dumps(safe_contacts, ensure_ascii=False)


def communication_agent(state: EmergencyState) -> EmergencyState:
    """Generate family communication messages for SMS and WhatsApp.

    Reads from state:
    - description, location
    - emergency_type, severity, immediate_risks
    - family_contacts (optional list of dicts: {name, relation, phone})

    Writes to state:
    - family_messages: list of dicts {name, relation, sms, whatsapp}
    - communication_confidence: float (1-5)
    """
    start_time = time.time()

    emergency_type = state.get("emergency_type", "unknown")
    severity = state.get("severity", 3)
    risks = state.get("immediate_risks", []) or []
    description = state.get("description", "")
    location = state.get("location", "Unknown")
    family_contacts = state.get("family_contacts", [])  # custom key in state

    log_agent_started(
        "communication_agent",
        {
            "emergency_type": emergency_type,
            "severity": severity,
            "contacts_count": len(family_contacts) if isinstance(family_contacts, list) else 0,
        },
    )

    if not isinstance(family_contacts, list) or not family_contacts:
        # Nothing to do; still mark execution in trace
        execution_time = time.time() - start_time
        execution_trace = state.get("execution_trace", [])
        execution_trace.append(
            {
                "agent": "communication_agent",
                "action": "no_contacts",
                "timestamp": time.time(),
                "execution_time": execution_time,
            }
        )
        state["execution_trace"] = execution_trace

        agents_called = state.get("agents_called", [])
        if "communication_agent" not in agents_called:
            agents_called.append("communication_agent")
        state["agents_called"] = agents_called

        state["family_messages"] = []
        state["communication_confidence"] = 1.0
        log_agent_completed("communication_agent", execution_time, {"contacts": 0, "confidence": 1.0})
        return state

    try:
        # Prepare prompt and call LLM
        log_llm_call("communication_agent", Config.MODEL_NAME)

        contacts_str = _format_contacts_for_prompt(family_contacts)

        completion = client.chat.completions.create(
            model=Config.MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": COMMUNICATION_PROMPT.format(
                        emergency_type=emergency_type,
                        severity=severity,
                        risks=", ".join(risks) if risks else "Unknown",
                        description=description,
                        location=location,
                        contacts=contacts_str,
                    ),
                },
                {
                    "role": "user",
                    "content": "Generate SMS and WhatsApp messages for the listed family contacts.",
                },
            ],
            temperature=0.2,
            max_tokens=800,
            response_format={"type": "json_object"},
        )

        data = json.loads(completion.choices[0].message.content)
        contacts_messages = data.get("contacts", [])
        confidence = data.get("overallConfidence", 3.0)

        # Normalize structure and write to state
        normalized_messages = []
        for c in contacts_messages:
            normalized_messages.append(
                {
                    "name": c.get("name", "Unknown"),
                    "relation": c.get("relation", "family"),
                    "sms": c.get("sms", ""),
                    "whatsapp": c.get("whatsapp", ""),
                }
            )

        state["family_messages"] = normalized_messages
        state["communication_confidence"] = float(confidence)

        # Log confidence score
        log_confidence_score(
            "communication_agent",
            state["communication_confidence"],
            f"messages_for={len(normalized_messages)}_contacts",
        )

        # Track tokens
        tokens_used = completion.usage.total_tokens if completion.usage else 0
        state["total_tokens"] = state.get("total_tokens", 0) + tokens_used

        # Update agents_called and execution_trace
        agents_called = state.get("agents_called", [])
        if "communication_agent" not in agents_called:
            agents_called.append("communication_agent")
        state["agents_called"] = agents_called

        execution_time = time.time() - start_time
        execution_trace = state.get("execution_trace", [])
        execution_trace.append(
            {
                "agent": "communication_agent",
                "action": "family_communication_generation",
                "contacts": len(normalized_messages),
                "confidence": state["communication_confidence"],
                "tokens": tokens_used,
                "timestamp": time.time(),
                "execution_time": execution_time,
            }
        )
        state["execution_trace"] = execution_trace

        log_agent_completed(
            "communication_agent",
            execution_time,
            {"contacts": len(normalized_messages), "confidence": state["communication_confidence"]},
        )

    except Exception as e:
        log_agent_error("communication_agent", e)

        # Fallback: basic, template-style messages
        fallback_messages = []
        for c in family_contacts:
            name = c.get("name", "")
            relation = c.get("relation", "family")
            fallback_sms = (
                "There is an emergency. I am safe for now but may need help. "
                f"Type: {emergency_type}, Location: {location}. I will update you as I can."
            )
            fallback_whatsapp = (
                f"Hi {name or relation}, there is an emergency situation (type: {emergency_type}, severity: {severity}/5) "
                f"at {location}. I may need your support. I will share updates when possible."
            )
            fallback_messages.append(
                {
                    "name": name or "Unknown",
                    "relation": relation,
                    "sms": fallback_sms,
                    "whatsapp": fallback_whatsapp,
                }
            )

        state["family_messages"] = fallback_messages
        state["communication_confidence"] = 1.0

        agents_called = state.get("agents_called", [])
        if "communication_agent" not in agents_called:
            agents_called.append("communication_agent")
        state["agents_called"] = agents_called

        execution_time = time.time() - start_time
        execution_trace = state.get("execution_trace", [])
        execution_trace.append(
            {
                "agent": "communication_agent",
                "action": "error",
                "error": str(e),
                "timestamp": time.time(),
                "execution_time": execution_time,
            }
        )
        state["execution_trace"] = execution_trace

    return state
