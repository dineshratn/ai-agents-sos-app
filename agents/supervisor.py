"""Supervisor agent that routes emergencies to appropriate specialists."""
from typing import Literal
from openai import OpenAI
from config import Config
from state import EmergencyState, AgentNames
import httpx


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


SUPERVISOR_PROMPT = """You are a supervisor coordinating emergency response specialists.

You have 3 specialist agents available:
1. SITUATION_AGENT - Analyzes emergency type, severity, and immediate risks
2. GUIDANCE_AGENT - Provides step-by-step safety instructions
3. RESOURCE_AGENT - Coordinates nearby resources (hospitals, emergency services)

Your job:
- Route the emergency to appropriate specialists based on current state
- Always call SITUATION_AGENT first to assess the emergency
- Then call GUIDANCE_AGENT for instructions
- Finally call RESOURCE_AGENT for nearby resources
- When all specialists have been consulted, respond with "FINISH"

Current emergency: {description}
Location: {location}

Agents already called: {agents_called}

Respond with ONLY ONE of these exact words:
- SITUATION_AGENT (if not yet called)
- GUIDANCE_AGENT (if situation assessed but no guidance yet)
- RESOURCE_AGENT (if guidance provided but no resources yet)
- FINISH (if all specialists consulted)"""


def supervisor_agent(state: EmergencyState) -> EmergencyState:
    """
    Supervisor agent that routes to appropriate specialist agents.

    Decision flow:
    1. If situation not assessed → SITUATION_AGENT
    2. If no guidance provided → GUIDANCE_AGENT
    3. If no resources coordinated → RESOURCE_AGENT
    4. If all done → FINISH
    """
    print(f"🎯 Supervisor evaluating emergency: {state['description'][:50]}...")
    print(f"📋 Agents called so far: {state.get('agents_called', [])}")

    agents_called = state.get('agents_called', [])

    # Simple deterministic routing (no LLM call needed for efficiency)
    if AgentNames.SITUATION not in agents_called:
        next_agent = AgentNames.SITUATION
    elif AgentNames.GUIDANCE not in agents_called:
        next_agent = AgentNames.GUIDANCE
    elif AgentNames.RESOURCE not in agents_called:
        next_agent = AgentNames.RESOURCE
    else:
        next_agent = AgentNames.END

    print(f"➡️  Routing to: {next_agent}")

    # Update state
    state['next_agent'] = next_agent

    if next_agent == AgentNames.END:
        state['assessment_complete'] = True

    return state


def route_to_next_agent(state: EmergencyState) -> Literal["situation_agent", "guidance_agent", "resource_agent", "end"]:
    """
    Conditional edge function that determines which agent to call next.

    This is used by LangGraph to create conditional edges in the workflow.
    """
    next_agent = state.get('next_agent', AgentNames.END)

    print(f"🔀 Routing decision: {next_agent}")

    return next_agent
