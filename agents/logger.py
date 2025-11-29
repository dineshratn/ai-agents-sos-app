"""Structured logging module for multi-agent system monitoring."""
import logging
import sys
from datetime import datetime
from typing import Optional, Dict, Any
import json


class AgentLogger:
    """
    Structured logger for tracking agent execution, performance, and errors.

    Features:
    - Agent-specific logging with context
    - Performance metrics tracking
    - Execution trace logging
    - JSON-formatted structured logs
    """

    def __init__(self, name: str = "sos-agents", level: int = logging.INFO):
        """
        Initialize logger.

        Args:
            name: Logger name (default: "sos-agents")
            level: Logging level (default: INFO)
        """
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)

        # Remove existing handlers to avoid duplicates
        self.logger.handlers = []

        # Console handler with custom formatting
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)

        # Custom formatter for readable output
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)

        self.logger.addHandler(console_handler)

    def agent_started(self, agent_name: str, state_summary: Dict[str, Any]):
        """Log when an agent starts execution."""
        self.logger.info(
            f"🤖 {agent_name} STARTED | Input: {self._truncate_dict(state_summary)}"
        )

    def agent_completed(self, agent_name: str, execution_time: float, output_summary: Dict[str, Any]):
        """Log when an agent completes execution."""
        self.logger.info(
            f"✅ {agent_name} COMPLETED | Time: {execution_time:.2f}s | Output: {self._truncate_dict(output_summary)}"
        )

    def agent_error(self, agent_name: str, error: Exception):
        """Log when an agent encounters an error."""
        self.logger.error(
            f"❌ {agent_name} ERROR | {type(error).__name__}: {str(error)}",
            exc_info=True
        )

    def llm_call(self, agent_name: str, model: str, tokens: Optional[int] = None):
        """Log LLM API calls."""
        token_info = f"Tokens: {tokens}" if tokens else "Tokens: N/A"
        self.logger.info(
            f"🔮 {agent_name} LLM_CALL | Model: {model} | {token_info}"
        )

    def routing_decision(self, from_agent: str, to_agent: str, reason: str = ""):
        """Log routing decisions between agents."""
        reason_str = f"| Reason: {reason}" if reason else ""
        self.logger.info(
            f"🔀 ROUTING | {from_agent} → {to_agent} {reason_str}"
        )

    def metrics(self, metric_name: str, value: Any, unit: str = ""):
        """Log performance metrics."""
        unit_str = f" {unit}" if unit else ""
        self.logger.info(
            f"📊 METRIC | {metric_name}: {value}{unit_str}"
        )

    def execution_trace(self, workflow_id: str, step: str, details: Dict[str, Any]):
        """Log execution trace for debugging."""
        self.logger.debug(
            f"🔍 TRACE | Workflow: {workflow_id} | Step: {step} | {self._truncate_dict(details)}"
        )

    def workflow_started(self, workflow_id: str, input_data: Dict[str, Any]):
        """Log when workflow starts."""
        self.logger.info(
            f"\n{'='*80}\n🚨 WORKFLOW STARTED | ID: {workflow_id}\n{'='*80}"
        )
        self.logger.info(f"📥 Input: {self._truncate_dict(input_data)}")

    def workflow_completed(self, workflow_id: str, total_time: float, agents_called: list):
        """Log when workflow completes."""
        self.logger.info(
            f"✅ WORKFLOW COMPLETED | ID: {workflow_id} | Time: {total_time:.2f}s | Agents: {', '.join(agents_called)}"
        )
        self.logger.info(f"{'='*80}\n")

    def confidence_score(self, agent_name: str, score: float, reasoning: str = ""):
        """Log agent confidence scores."""
        reasoning_str = f"| {reasoning}" if reasoning else ""
        self.logger.info(
            f"💯 CONFIDENCE | {agent_name}: {score:.2f}/5.0 {reasoning_str}"
        )

    @staticmethod
    def _truncate_dict(data: Dict[str, Any], max_length: int = 100) -> str:
        """Truncate dictionary for logging."""
        json_str = json.dumps(data, default=str)
        if len(json_str) > max_length:
            return json_str[:max_length] + "..."
        return json_str


# Global logger instance
logger = AgentLogger()


# Convenience functions for easy import
def log_agent_started(agent_name: str, state_summary: Dict[str, Any]):
    logger.agent_started(agent_name, state_summary)


def log_agent_completed(agent_name: str, execution_time: float, output_summary: Dict[str, Any]):
    logger.agent_completed(agent_name, execution_time, output_summary)


def log_agent_error(agent_name: str, error: Exception):
    logger.agent_error(agent_name, error)


def log_llm_call(agent_name: str, model: str, tokens: Optional[int] = None):
    logger.llm_call(agent_name, model, tokens)


def log_routing_decision(from_agent: str, to_agent: str, reason: str = ""):
    logger.routing_decision(from_agent, to_agent, reason)


def log_metrics(metric_name: str, value: Any, unit: str = ""):
    logger.metrics(metric_name, value, unit)


def log_execution_trace(workflow_id: str, step: str, details: Dict[str, Any]):
    logger.execution_trace(workflow_id, step, details)


def log_workflow_started(workflow_id: str, input_data: Dict[str, Any]):
    logger.workflow_started(workflow_id, input_data)


def log_workflow_completed(workflow_id: str, total_time: float, agents_called: list):
    logger.workflow_completed(workflow_id, total_time, agents_called)


def log_confidence_score(agent_name: str, score: float, reasoning: str = ""):
    logger.confidence_score(agent_name, score, reasoning)
