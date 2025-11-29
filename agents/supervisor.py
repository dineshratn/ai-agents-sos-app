"""Supervisor agent that routes emergencies to appropriate specialists."""
from typing import Literal
from openai import OpenAI
from config import Config
from state import EmergencyState, AgentNames
from logger import log_routing_decision, log_execution_trace
import httpx
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


def supervisor_agent(state: EmergencyState) -> EmergencyState:
    """
    Supervisor agent that routes to appropriate specialist agents.

    Phase 4 Enhancements:
    - Dynamic routing based on emergency type
    - Structured logging
    - Execution trace tracking
    - Performance metrics

    Decision flow:
    1. If situation not assessed → SITUATION_AGENT (always first)
    2. If no guidance provided → GUIDANCE_AGENT
    3. If no resources coordinated → RESOURCE_AGENT (optional for low severity)
    4. If all done → FINISH
    """
    start_time = time.time()
    agents_called = state.get('agents_called', [])
    emergency_type = state.get('emergency_type')
    severity = state.get('severity', 3)

    # Add execution trace
    execution_trace = state.get('execution_trace', [])

    # Phase 4: Dynamic routing with intelligence
    if AgentNames.SITUATION not in agents_called:
        # Always assess situation first
        next_agent = AgentNames.SITUATION
        reason = "Initial situation assessment required"

    elif AgentNames.GUIDANCE not in agents_called:
        # Provide guidance for all emergencies
        next_agent = AgentNames.GUIDANCE
        reason = f"Guidance needed for {emergency_type} emergency (severity {severity})"

    elif AgentNames.RESOURCE not in agents_called:
        # Phase 4: Smart resource routing
        # Skip resources for very low severity issues that can be self-managed
        if severity >= 3 or emergency_type in ['medical', 'security', 'natural_disaster']:
            next_agent = AgentNames.RESOURCE
            reason = f"Resource coordination needed (severity {severity})"
        else:
            next_agent = AgentNames.END
            reason = "Low severity - resources not needed"

    else:
        # All agents consulted
        next_agent = AgentNames.END
        reason = "All specialist agents consulted"

    # Log routing decision
    log_routing_decision("supervisor", next_agent, reason)

    # Update state
    state['next_agent'] = next_agent

    if next_agent == AgentNames.END:
        state['assessment_complete'] = True

    # Add to execution trace
    execution_time = time.time() - start_time
    execution_trace.append({
        "agent": AgentNames.SUPERVISOR,
        "action": "routing_decision",
        "next_agent": next_agent,
        "reason": reason,
        "timestamp": time.time(),
        "execution_time": execution_time
    })
    state['execution_trace'] = execution_trace

    # Track supervisor in agents_called
    if AgentNames.SUPERVISOR not in agents_called:
        agents_called.append(AgentNames.SUPERVISOR)
        state['agents_called'] = agents_called

    return state


def route_to_next_agent(state: EmergencyState) -> Literal["situation_agent", "guidance_agent", "resource_agent", "end"]:
    """
    Conditional edge function that determines which agent to call next.

    This is used by LangGraph to create conditional edges in the workflow.
    """
    next_agent = state.get('next_agent', AgentNames.END)

    # Log the routing
    log_execution_trace(
        workflow_id=state.get('workflow_id', 'unknown'),
        step="conditional_routing",
        details={"target": next_agent}
    )

    return next_agent
