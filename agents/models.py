"""Pydantic models for API requests and responses."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class EmergencyRequest(BaseModel):
    """Emergency trigger request."""
    description: str = Field(..., description="Description of the emergency")
    location: Optional[str] = Field(None, description="Location of the emergency")
    thread_id: Optional[str] = Field(None, description="Thread ID for conversation continuity (Phase 4)")


class Assessment(BaseModel):
    """Emergency situation assessment."""
    emergency_type: str = Field(..., description="Type of emergency")
    severity: int = Field(..., ge=1, le=5, description="Severity level 1-5")
    immediate_risks: List[str] = Field(..., description="List of immediate risks")
    recommended_response: str = Field(..., description="Recommended response action")
    confidence: Optional[float] = Field(None, ge=1.0, le=5.0, description="Phase 4: Confidence score (1-5)")


class Guidance(BaseModel):
    """Step-by-step guidance."""
    steps: List[str] = Field(..., description="List of guidance steps")
    provided_by: str = Field(default="guidance_agent", description="Agent that provided this")
    confidence: Optional[float] = Field(None, ge=1.0, le=5.0, description="Phase 4: Confidence score (1-5)")


class Resource(BaseModel):
    """Resource information."""
    nearby_hospitals: Optional[List[str]] = Field(None, description="Nearby hospitals")
    emergency_services: str = Field(default="911", description="Emergency services number")
    provided_by: str = Field(default="resource_agent", description="Agent that provided this")
    confidence: Optional[float] = Field(None, ge=1.0, le=5.0, description="Phase 4: Confidence score (1-5)")


class AgentOrchestration(BaseModel):
    """Agent orchestration metadata."""
    agents_called: List[str] = Field(..., description="List of agents invoked")
    total_time: float = Field(..., description="Total execution time in seconds")
    model: str = Field(..., description="AI model used")
    provider: str = Field(default="OpenRouter", description="AI provider")
    total_tokens: Optional[int] = Field(None, description="Total tokens used across all agents")
    workflow_id: Optional[str] = Field(None, description="Phase 4: Unique workflow execution ID")


class ExecutionMetrics(BaseModel):
    """Phase 4: Execution metrics and performance data."""
    execution_trace: List[Dict[str, Any]] = Field(default_factory=list, description="Detailed execution trace")
    agent_timings: Dict[str, float] = Field(default_factory=dict, description="Time spent by each agent")
    routing_decisions: List[str] = Field(default_factory=list, description="Routing decisions made")


class MultiAgentResponse(BaseModel):
    """Complete multi-agent response."""
    assessment: Assessment
    guidance: Guidance
    resources: Resource
    orchestration: AgentOrchestration
    metrics: Optional[ExecutionMetrics] = Field(None, description="Phase 4: Detailed execution metrics")
    success: bool = True
    message: str = "Emergency assessment completed successfully"


class SingleAgentResponse(BaseModel):
    """Single agent response (for Phase 1 testing)."""
    emergency_type: str
    severity: int
    immediate_risks: List[str]
    recommended_response: str
    guidance: List[str]
    ai_model: str
    ai_provider: str
    tokens_used: Optional[int] = None
    generated_at: str
