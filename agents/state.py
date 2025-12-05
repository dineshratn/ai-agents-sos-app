"""State schema for multi-agent emergency assessment system."""
from typing import TypedDict, List, Optional, Literal, Annotated, Dict, Any
import operator


class EmergencyState(TypedDict):
    """
    Shared state that flows between all agents in the graph.

    Each agent can read from and write to this state.
    """

    # Session management (Phase 4: Conversation history)
    thread_id: Optional[str]  # Session ID for conversation continuity
    messages: Annotated[List[dict], operator.add]  # Full conversation history

    # Input from user
    description: str
    location: Optional[str]
    family_contacts: Optional[List[Dict[str, str]]]  # [{name, relation, phone?}] for communication

    # Routing and orchestration
    next_agent: Optional[str]  # Which agent to call next
    agents_called: List[str]  # Track which agents have been invoked

    # Situation Assessment Agent outputs
    emergency_type: Optional[str]  # medical, security, disaster, accident, other
    severity: Optional[int]  # 1-5 scale
    immediate_risks: Optional[List[str]]
    situation_confidence: Optional[float]  # Phase 4: Confidence score (0-5)

    # Guidance Agent outputs
    recommended_response: Optional[str]  # self-help, contact help, call 911
    guidance_steps: Optional[List[str]]  # Step-by-step instructions
    guidance_confidence: Optional[float]  # Phase 4: Confidence score (0-5)

    # Resource Coordination Agent outputs
    nearby_hospitals: Optional[List[str]]
    emergency_services: Optional[str]  # Phone number
    additional_resources: Optional[List[str]]
    resource_confidence: Optional[float]  # Phase 4: Confidence score (0-5)

    # Communication Agent outputs
    family_messages: Optional[List[Dict[str, str]]]  # [{name, relation, sms, whatsapp}]
    communication_confidence: Optional[float]  # Phase 4: Confidence score (0-5)

    # Metadata
    assessment_complete: bool  # Flag to end the workflow
    total_tokens: int  # Track token usage across all agents

    # Phase 4: Monitoring & Performance
    execution_trace: List[Dict[str, Any]]  # Detailed execution steps
    performance_metrics: Dict[str, Any]  # Performance data (timings, etc.)
    workflow_id: Optional[str]  # Unique identifier for this workflow run


# Agent names as constants
class AgentNames:
    """Constants for agent names used in routing."""
    SUPERVISOR = "supervisor"
    SITUATION = "situation_agent"
    GUIDANCE = "guidance_agent"
    RESOURCE = "resource_agent"
    COMMUNICATION = "communication_agent"
    END = "end"
