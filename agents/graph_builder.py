"""LangGraph workflow builder - orchestrates multi-agent emergency assessment."""
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from state import EmergencyState, AgentNames
from supervisor import supervisor_agent, route_to_next_agent
from situation_agent import situation_agent
from guidance_agent import guidance_agent
from resource_agent import resource_agent
from logger import logger


def build_emergency_assessment_graph(with_checkpointing: bool = True):
    """
    Build the LangGraph workflow for multi-agent emergency assessment.

    Workflow:
    1. User triggers emergency → Supervisor
    2. Supervisor → Situation Agent (assess type, severity, risks)
    3. Supervisor → Guidance Agent (provide instructions)
    4. Supervisor → Resource Agent (coordinate resources)
    5. End → Return complete assessment

    Args:
        with_checkpointing: Enable conversation history with MemorySaver (Phase 4)

    Returns:
        Compiled LangGraph application with optional checkpointing
    """
    # Create the graph with our state schema
    workflow = StateGraph(EmergencyState)

    # Add all agent nodes
    workflow.add_node(AgentNames.SUPERVISOR, supervisor_agent)
    workflow.add_node(AgentNames.SITUATION, situation_agent)
    workflow.add_node(AgentNames.GUIDANCE, guidance_agent)
    workflow.add_node(AgentNames.RESOURCE, resource_agent)

    # Set entry point
    workflow.set_entry_point(AgentNames.SUPERVISOR)

    # Add conditional edges from supervisor to specialist agents
    workflow.add_conditional_edges(
        AgentNames.SUPERVISOR,
        route_to_next_agent,
        {
            AgentNames.SITUATION: AgentNames.SITUATION,
            AgentNames.GUIDANCE: AgentNames.GUIDANCE,
            AgentNames.RESOURCE: AgentNames.RESOURCE,
            AgentNames.END: END
        }
    )

    # After each specialist, return to supervisor for next routing decision
    workflow.add_edge(AgentNames.SITUATION, AgentNames.SUPERVISOR)
    workflow.add_edge(AgentNames.GUIDANCE, AgentNames.SUPERVISOR)
    workflow.add_edge(AgentNames.RESOURCE, AgentNames.SUPERVISOR)

    # Phase 4: Compile with checkpointing for conversation history
    if with_checkpointing:
        checkpointer = MemorySaver()
        app = workflow.compile(checkpointer=checkpointer)
        logger.logger.info("✅ Multi-agent workflow compiled with CHECKPOINTING enabled")
        logger.logger.info("💾 Conversation history will be preserved across requests")
    else:
        app = workflow.compile()
        logger.logger.info("✅ Multi-agent workflow compiled (stateless mode)")

    logger.logger.info("📊 Workflow: Supervisor → Situation → Guidance → Resource → End")

    return app


# Create and export the compiled graph (with checkpointing enabled by default)
emergency_graph = build_emergency_assessment_graph(with_checkpointing=True)
