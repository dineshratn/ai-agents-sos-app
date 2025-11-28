"""State schema for multi-agent emergency assessment system."""
from typing import TypedDict, List, Optional, Literal, Annotated
import operator


class EmergencyState(TypedDict):
    """
    Shared state that flows between all agents in the graph.

    Each agent can read from and write to this state.
    """

    # Messages for conversation history
    messages: Annotated[List[dict], operator.add]

    # Input from user
    description: str
    location: Optional[str]

    # Routing and orchestration
    next_agent: Optional[str]  # Which agent to call next
    agents_called: List[str]  # Track which agents have been invoked

    # Situation Assessment Agent outputs
    emergency_type: Optional[str]  # medical, security, disaster, accident, other
    severity: Optional[int]  # 1-5 scale
    immediate_risks: Optional[List[str]]

    # Guidance Agent outputs
    recommended_response: Optional[str]  # self-help, contact help, call 911
    guidance_steps: Optional[List[str]]  # Step-by-step instructions

    # Resource Coordination Agent outputs
    nearby_hospitals: Optional[List[str]]
    emergency_services: Optional[str]  # Phone number
    additional_resources: Optional[List[str]]

    # Metadata
    assessment_complete: bool  # Flag to end the workflow
    total_tokens: int  # Track token usage across all agents


# Agent names as constants
class AgentNames:
    """Constants for agent names used in routing."""
    SUPERVISOR = "supervisor"
    SITUATION = "situation_agent"
    GUIDANCE = "guidance_agent"
    RESOURCE = "resource_agent"
    END = "end"
