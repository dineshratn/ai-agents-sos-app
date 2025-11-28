"""LangGraph workflow builder - orchestrates multi-agent emergency assessment."""
from langgraph.graph import StateGraph, END
from state import EmergencyState, AgentNames
from supervisor import supervisor_agent, route_to_next_agent
from situation_agent import situation_agent
from guidance_agent import guidance_agent
from resource_agent import resource_agent


def build_emergency_assessment_graph():
    """
    Build the LangGraph workflow for multi-agent emergency assessment.

    Workflow:
    1. User triggers emergency → Supervisor
    2. Supervisor → Situation Agent (assess type, severity, risks)
    3. Supervisor → Guidance Agent (provide instructions)
    4. Supervisor → Resource Agent (coordinate resources)
    5. End → Return complete assessment

    Returns:
        Compiled LangGraph application
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

    # Compile the graph
    app = workflow.compile()

    print("✅ Multi-agent workflow compiled successfully")
    print("📊 Workflow: Supervisor → Situation → Guidance → Resource → End")

    return app


# Create and export the compiled graph
emergency_graph = build_emergency_assessment_graph()
