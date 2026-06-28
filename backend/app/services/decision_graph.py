"""
decision_graph.py
-----------------
Represents the full AI decision workflow as an ordered, reusable graph.

Each node in the graph wraps one agent and exposes a uniform
``executor(customer, context) → dict`` interface.  The graph runner
calls every node in sequence, accumulates results in a shared context
dict, records per-step timing and status, then assembles one unified
frontend-ready response.

Workflow
--------
  Customer (input)
      ↓
  1.  PlannerAgent               — build execution plan from profile
      ↓
  2.  RiskAgent                  — classify risk level and score
      ↓
  3.  OpportunityAgent           — score opportunity and assign segment
      ↓
  4.  ProductRecommendationAgent — select best-fit product
      ↓
  5.  ExplanationAgent           — generate natural-language explanation
      ↓
  6.  MemoryAgent                — persist decision and inject metadata
      ↓
  Frontend (unified JSON response)

Design principles
-----------------
- Agents are instantiated once on ``DecisionGraph.__init__`` and reused
  across every ``run()`` call (stateless agents, stateful memory).
- Each node runs inside a try/except block.  A failing node writes an
  ``{"error": "..."}`` entry to context; downstream nodes receive that
  gracefully and the graph never crashes mid-run.
- Timing is measured with ``time.perf_counter()`` so durations are
  independent of system-clock adjustments.
- Adding a new step = subclass or call ``graph.register(node)`` before
  the first ``run()``.

Output schema (frontend payload)
---------------------------------
{
    "customer_id"        : str,
    "customer_name"      : str,

    "strategy"           : str,
    "plan"               : list[dict],

    "risk_level"         : str,
    "risk_score"         : int,

    "opportunity_score"  : int,
    "segment"            : str,

    "recommended_product": str,
    "confidence"         : int,

    "explanation"        : str,
    "next_best_action"   : str,

    "decision_id"        : str,
    "timestamp"          : str,

    "workflow": {
        "total_nodes"      : int,
        "successful"       : int,
        "failed"           : int,
        "total_duration_ms": float,
        "trace": [
            {
                "node"        : str,
                "label"       : str,
                "status"      : "ok" | "error",
                "duration_ms" : float,
                "error"       : str | None
            }
        ]
    }
}
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable

from app.agents.explanation_agent import ExplanationAgent
from app.agents.opportunity_agent import OpportunityAgent
from app.agents.product_agent import ProductRecommendationAgent
from app.agents.risk_agent import RiskAgent
from app.memory.memory_agent import memory
from app.planner.planner_agent import PlannerAgent

logger = logging.getLogger(__name__)

# Executor type alias: (customer, accumulated_context) → node_output
Executor = Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]


# ─────────────────────────────────────────────────────────────────────────────
# GraphNode
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class GraphNode:
    """
    One step in the decision workflow.

    Attributes
    ----------
    name        : str       Snake-case key used in the context dict.
    label       : str       Human-readable title shown in workflow traces.
    description : str       What this node does.
    executor    : Executor  Callable ``(customer, context) → dict``.
    """

    name: str
    label: str
    description: str
    executor: Executor = field(repr=False)


# ─────────────────────────────────────────────────────────────────────────────
# DecisionGraph
# ─────────────────────────────────────────────────────────────────────────────


class DecisionGraph:
    """
    Ordered graph of AI decision nodes.

    All agents are instantiated once and reused across calls.
    The shared ``memory`` singleton is imported at module level so
    decisions accumulate across the lifetime of the process.

    Usage
    -----
        graph = DecisionGraph()
        result = graph.run(customer)
    """

    def __init__(self) -> None:
        # Instantiate agents once
        self._planner = PlannerAgent()
        self._risk = RiskAgent()
        self._opportunity = OpportunityAgent()
        self._product = ProductRecommendationAgent()
        self._explanation = ExplanationAgent()

        # Build the ordered node list
        self._nodes: list[GraphNode] = []
        self._build()

    # ── Public interface ──────────────────────────────────────────────────

    def run(self, customer: dict[str, Any]) -> dict[str, Any]:
        """
        Execute every node in order and return the unified frontend payload.

        Parameters
        ----------
        customer : dict
            A single customer record as returned by ``CustomerService``.

        Returns
        -------
        dict
            Unified, JSON-serialisable response (see module docstring).

        Raises
        ------
        ValueError
            If *customer* is not a non-empty dict.
        """
        if not isinstance(customer, dict) or not customer:
            raise ValueError("customer must be a non-empty dict")

        context: dict[str, Any] = {}
        trace: list[dict[str, Any]] = []

        for node in self._nodes:
            trace_entry = self._execute_node(node, customer, context)
            trace.append(trace_entry)

        return self._build_response(customer, context, trace)

    def register(self, node: GraphNode) -> None:
        """
        Append a custom node to the end of the graph.

        Call this before the first ``run()`` to extend the default pipeline
        without subclassing.

        Parameters
        ----------
        node : GraphNode
            The node to append.
        """
        self._nodes.append(node)
        logger.debug("Registered custom node: %s", node.name)

    # ── Private: graph construction ───────────────────────────────────────

    def _build(self) -> None:
        """Register all default nodes in workflow order."""

        self._nodes = [
            GraphNode(
                name="planner",
                label="Planner",
                description="Inspect the customer profile and produce a tailored execution plan.",
                executor=self._exec_planner,
            ),
            GraphNode(
                name="risk",
                label="Risk Agent",
                description="Classify risk level and score from revenue, industry, and product depth.",
                executor=self._exec_risk,
            ),
            GraphNode(
                name="opportunity",
                label="Opportunity Agent",
                description="Score cross-sell and upsell potential; assign customer segment.",
                executor=self._exec_opportunity,
            ),
            GraphNode(
                name="product",
                label="Product Agent",
                description="Select the best-fit product using layered risk, revenue, and industry rules.",
                executor=self._exec_product,
            ),
            GraphNode(
                name="explanation",
                label="Explanation Agent",
                description="Synthesise upstream outputs into a natural-language explanation.",
                executor=self._exec_explanation,
            ),
            GraphNode(
                name="memory",
                label="Memory",
                description="Persist the complete decision record and inject decision_id and timestamp.",
                executor=self._exec_memory,
            ),
        ]

    # ── Private: node executors ───────────────────────────────────────────

    def _exec_planner(
        self,
        customer: dict[str, Any],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        return self._planner.run(customer)

    def _exec_risk(
        self,
        customer: dict[str, Any],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        return self._risk.run(customer)

    def _exec_opportunity(
        self,
        customer: dict[str, Any],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        return self._opportunity.run(customer)

    def _exec_product(
        self,
        customer: dict[str, Any],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        return self._product.run(customer)

    def _exec_explanation(
        self,
        customer: dict[str, Any],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        return self._explanation.run(
            risk_result=context.get("risk", {}),
            opportunity_result=context.get("opportunity", {}),
            product_result=context.get("product", {}),
            customer=customer,
        )

    def _exec_memory(
        self,
        customer: dict[str, Any],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        """Assemble a flat record and persist it via the MemoryAgent singleton."""
        risk = context.get("risk", {})
        opportunity = context.get("opportunity", {})
        product = context.get("product", {})
        explanation = context.get("explanation", {})

        record = {
            "customer_id": customer.get("customer_id"),
            "customer_name": customer.get("name"),
            "risk_level": risk.get("risk_level"),
            "risk_score": risk.get("risk_score"),
            "opportunity_score": opportunity.get("opportunity_score"),
            "segment": opportunity.get("segment"),
            "recommended_product": product.get("recommended_product"),
            "confidence": product.get("confidence"),
            "explanation": explanation.get("explanation"),
            "next_best_action": explanation.get("next_best_action"),
        }

        return memory.save_decision(record)

    # ── Private: node runner ──────────────────────────────────────────────

    @staticmethod
    def _execute_node(
        node: GraphNode,
        customer: dict[str, Any],
        context: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Run one node, capture its output and timing, handle any exception.

        The node output is written into *context* under ``node.name``
        regardless of success or failure so downstream nodes always find
        the key (they receive ``{}`` on error).
        """
        t0 = time.perf_counter()
        error_msg: str | None = None

        try:
            output = node.executor(customer, context)
            status = "ok"
            logger.debug("Node '%s' completed successfully.", node.name)
        except Exception as exc:
            output = {"error": str(exc)}
            status = "error"
            error_msg = str(exc)
            logger.error(
                "Node '%s' failed: %s",
                node.name,
                exc,
                exc_info=True,
            )

        context[node.name] = output

        return {
            "node": node.name,
            "label": node.label,
            "status": status,
            "duration_ms": round((time.perf_counter() - t0) * 1_000, 2),
            "error": error_msg,
        }

    # ── Private: response builder ─────────────────────────────────────────

    def _build_response(
        self,
        customer: dict[str, Any],
        context: dict[str, Any],
        trace: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Merge all node outputs into one frontend-ready JSON response."""

        planner = context.get("planner", {})
        risk = context.get("risk", {})
        opportunity = context.get("opportunity", {})
        product = context.get("product", {})
        explanation = context.get("explanation", {})
        mem = context.get("memory", {})

        successful = sum(1 for t in trace if t["status"] == "ok")
        failed = sum(1 for t in trace if t["status"] == "error")
        total_ms = round(sum(t["duration_ms"] for t in trace), 2)

        return {
            # ── Identity ──────────────────────────────────────────────────
            "customer_id": customer.get("customer_id"),
            "customer_name": customer.get("name"),
            # ── Plan ──────────────────────────────────────────────────────
            "strategy": planner.get("strategy"),
            "plan": planner.get("plan", []),
            # ── Risk ──────────────────────────────────────────────────────
            "risk_level": risk.get("risk_level"),
            "risk_score": risk.get("risk_score"),
            # ── Opportunity ───────────────────────────────────────────────
            "opportunity_score": opportunity.get("opportunity_score"),
            "segment": opportunity.get("segment"),
            # ── Product ───────────────────────────────────────────────────
            "recommended_product": product.get("recommended_product"),
            "confidence": product.get("confidence"),
            # ── Explanation ───────────────────────────────────────────────
            "explanation": explanation.get("explanation"),
            "next_best_action": explanation.get("next_best_action"),
            # ── Memory ────────────────────────────────────────────────────
            "decision_id": mem.get("decision_id"),
            "timestamp": mem.get("timestamp"),
            # ── Workflow trace ─────────────────────────────────────────────
            "workflow": {
                "total_nodes": len(trace),
                "successful": successful,
                "failed": failed,
                "total_duration_ms": total_ms,
                "trace": trace,
            },
        }
