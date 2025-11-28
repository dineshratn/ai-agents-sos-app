"""Pydantic models for API requests and responses."""
from typing import List, Optional
from pydantic import BaseModel, Field


class EmergencyRequest(BaseModel):
    """Emergency trigger request."""
    description: str = Field(..., description="Description of the emergency")
    location: Optional[str] = Field(None, description="Location of the emergency")


class Assessment(BaseModel):
    """Emergency situation assessment."""
    emergency_type: str = Field(..., description="Type of emergency")
    severity: int = Field(..., ge=1, le=5, description="Severity level 1-5")
    immediate_risks: List[str] = Field(..., description="List of immediate risks")
    recommended_response: str = Field(..., description="Recommended response action")


class Guidance(BaseModel):
    """Step-by-step guidance."""
    steps: List[str] = Field(..., description="List of guidance steps")
    provided_by: str = Field(default="guidance_agent", description="Agent that provided this")


class Resource(BaseModel):
    """Resource information."""
    nearby_hospitals: Optional[List[str]] = Field(None, description="Nearby hospitals")
    emergency_services: str = Field(default="911", description="Emergency services number")
    provided_by: str = Field(default="resource_agent", description="Agent that provided this")


class AgentOrchestration(BaseModel):
    """Agent orchestration metadata."""
    agents_called: List[str] = Field(..., description="List of agents invoked")
    total_time: float = Field(..., description="Total execution time in seconds")
    model: str = Field(..., description="AI model used")
    provider: str = Field(default="OpenRouter", description="AI provider")


class MultiAgentResponse(BaseModel):
    """Complete multi-agent response."""
    assessment: Assessment
    guidance: Guidance
    resources: Resource
    orchestration: AgentOrchestration
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
