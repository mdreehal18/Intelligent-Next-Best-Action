"""
pipeline_orchestrator.py
------------------------
Main orchestrator that runs the full 9-step decision pipeline sequentially,
wrapping every step in the standard agent envelope and accumulating a
structured trace.

Pipeline steps
--------------
1.  PlannerAgent              — builds the tailored execution plan
2.  RiskAssessmentAgent       — classifies risk level and score
3.  OpportunityAgent          — scores opportunity and assigns segment
4.  ProductRecommendationAgent — selects the best-fit product
5.  ConflictDetectionAgent    — resolves contradictory agent signals
6.  ReviewerAgent             — validates the partial recommendation
7.  ExplanationAgent          — synthesises natural-language output
8.  MemoryAgent               — persists the decision record
9.  AuditAgent                — writes the compliance audit entry

Step envelope (standard format)
--------------------------------
Every step is wrapped before being stored in the pipeline context (``ctx``)
and the trace list::

    {
        "agent"            : str,
        "status"           : "completed" | "failed",
        "execution_time_ms": float,
        "output"           : dict
    }

Accessing step output from ``ctx``::

    risk_output = ctx.get("RiskAssessmentAgent", {}).get("output", {})

Module-level exports
--------------------
``orchestrator``
    Singleton :class:`PipelineOrchestrator` shared by all routers.
``get_trace(customer_id)``
    Returns the most recent trace list for a customer, or ``None``.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Callable

from app.agents.conflict_agent import ConflictAgent
from app.agents.explanation_agent import ExplanationAgent
from app.agents.opportunity_agent import OpportunityAgent
from app.agents.product_agent import ProductRecommendationAgent
from app.agents.reviewer_agent import ReviewerAgent
from app.agents.risk_agent import RiskAgent
from app.agents.knowledge_retrieval_agent import KnowledgeRetrievalAgent
from app.memory.memory_agent import memory
from app.planner.planner_agent import PlannerAgent
from app.services.audit_service import audit

logger = logging.getLogger(__name__)

# Module-level trace cache: customer_id → most recent trace list.
# Populated at the end of every successful :meth:`PipelineOrchestrator.run`
# call and read by :func:`get_trace`.
_traces: dict[str, list[dict[str, Any]]] = {}


class PipelineOrchestrator:
    """
    Runs the full 9-step decision pipeline for a single customer record.

    Each step is executed inside :meth:`_run_step`, which handles timing,
    envelope construction, error isolation, and trace recording.  A step
    failure is logged and recorded as ``"failed"`` in the trace, but the
    pipeline always continues so that downstream steps receive whatever
    partial context is available.

    Usage
    -----
    ::

        from app.agents.pipeline_orchestrator import orchestrator

        result = orchestrator.run(customer)
    """

    def __init__(self) -> None:
        self._planner = PlannerAgent()
        self._knowledge = KnowledgeRetrievalAgent()
        self._risk = RiskAgent()
        self._opportunity = OpportunityAgent()
        self._product = ProductRecommendationAgent()
        self._conflict = ConflictAgent()
        self._reviewer = ReviewerAgent()
        self._explanation = ExplanationAgent()

    # ── Public entry point ────────────────────────────────────────────────

    def run(self, customer: dict[str, Any]) -> dict[str, Any]:
        """
        Execute the dynamic pipeline for one customer based on the Planner's plan.
        """
        if not isinstance(customer, dict) or not customer:
            raise ValueError("customer must be a non-empty dict")

        ctx: dict[str, dict[str, Any]] = {}
        trace: list[dict[str, Any]] = []

        # 1. First, always run the Planner
        planner_result = self._run_step(
            ctx,
            trace,
            "PlannerAgent",
            lambda: self._planner.run(customer),
        )
        plan = planner_result.get("output", {}).get("plan", [])

        # 2. Iterate through the plan and execute mandated agents
        # We map agent names in the plan to actual agent instances/calls
        agent_map = {
            "KnowledgeRetrievalAgent": lambda: self._knowledge.run(customer),
            "RiskAssessmentAgent": lambda: self._risk.run(customer),
            "OpportunityAgent": lambda: self._opportunity.run(customer),
            "ProductRecommendationAgent": lambda: self._product.run(customer),
            "ExplanationAgent": lambda: self._explanation.run(
                ctx.get("RiskAssessmentAgent", {}).get("output", {}),
                ctx.get("OpportunityAgent", {}).get("output", {}),
                ctx.get("ProductRecommendationAgent", {}).get("output", {}),
                customer,
                evidence=ctx.get("KnowledgeRetrievalAgent", {}).get("output", {}).get("evidence")
            ),
            "ReviewerAgent": lambda: self._reviewer.run(
                self._build_review_input(
                    customer,
                    ctx.get("RiskAssessmentAgent", {}).get("output", {}),
                    ctx.get("OpportunityAgent", {}).get("output", {}),
                    ctx.get("ProductRecommendationAgent", {}).get("output", {}),
                    {}, # Conflict agent removed for simplicity in dynamic flow or can be added back
                    int(ctx.get("OpportunityAgent", {}).get("output", {}).get("opportunity_score") or 0)
                )
            ),
            "MemoryAgent": lambda: memory.save_decision(
                self._build_decision_record(
                    customer,
                    ctx.get("RiskAssessmentAgent", {}).get("output", {}),
                    ctx.get("OpportunityAgent", {}).get("output", {}),
                    ctx.get("ProductRecommendationAgent", {}).get("output", {}),
                    {},
                    ctx.get("ExplanationAgent", {}).get("output", {}),
                    self._derive_priority(int(ctx.get("OpportunityAgent", {}).get("output", {}).get("opportunity_score") or 0))
                )
            )
        }

        for step in plan:
            agent_name = step.get("agent")
            if agent_name in agent_map and agent_name != "PlannerAgent":
                self._run_step(
                    ctx,
                    trace,
                    agent_name,
                    agent_map[agent_name]
                )

        # ── Cache trace keyed by customer_id ──────────────────────────────
        customer_id: str = str(customer.get("customer_id") or "unknown")
        _traces[customer_id] = trace

        # Return final response using accumulated context
        return self._build_final_response(
            customer,
            ctx.get("RiskAssessmentAgent", {}).get("output", {}),
            ctx.get("OpportunityAgent", {}).get("output", {}),
            ctx.get("ProductRecommendationAgent", {}).get("output", {}),
            {}, # conflict
            ctx.get("ReviewerAgent", {}).get("output", {}),
            ctx.get("ExplanationAgent", {}).get("output", {}),
            ctx.get("MemoryAgent", {}).get("output", {}),
            {}, # audit
            self._derive_priority(int(ctx.get("OpportunityAgent", {}).get("output", {}).get("opportunity_score") or 0)),
            trace,
        )

    # ── Private: step runner ──────────────────────────────────────────────

    @staticmethod
    def _run_step(
        ctx: dict[str, dict[str, Any]],
        trace: list[dict[str, Any]],
        agent_name: str,
        fn: Callable[[], Any],
    ) -> dict[str, Any]:
        """
        Execute *fn*, wrap its result in the standard envelope, and record
        the step in both *ctx* and *trace*.

        Exceptions raised by *fn* are caught, logged, and converted to a
        ``"failed"`` envelope so the pipeline always continues to the next
        step — it never crashes mid-run.

        Parameters
        ----------
        ctx : dict
            Pipeline context; the wrapper dict is stored under *agent_name*.
        trace : list
            Accumulated trace; the wrapper dict is appended here.
        agent_name : str
            Display name used in the envelope and log messages.
        fn : Callable[[], Any]
            Zero-argument callable that performs the step's work and returns
            a dict (or any value, which is normalised to a dict).

        Returns
        -------
        dict
            The wrapper dict that was written to *ctx* and *trace*.
        """
        t0: float = time.perf_counter()

        try:
            result: Any = fn()
            if not isinstance(result, dict):
                result = {"result": result}
            status = "completed"
        except Exception as exc:
            logger.error(
                "Pipeline step '%s' failed: %s",
                agent_name,
                exc,
                exc_info=True,
            )
            result = {"error": str(exc)}
            status = "failed"

        elapsed_ms: float = round((time.perf_counter() - t0) * 1_000, 2)

        wrapper: dict[str, Any] = {
            "agent": agent_name,
            "status": status,
            "execution_time_ms": elapsed_ms,
            "output": result,
        }

        ctx[agent_name] = wrapper
        trace.append(wrapper)
        return wrapper

    # ── Private: review input builder ─────────────────────────────────────

    @staticmethod
    def _build_review_input(
        customer: dict[str, Any],
        risk_output: dict[str, Any],
        opp_output: dict[str, Any],
        product_output: dict[str, Any],
        conflict_output: dict[str, Any],
        opp_score: int,
    ) -> dict[str, Any]:
        """
        Assemble the dict that :meth:`ReviewerAgent.run` validates.

        ``ReviewerAgent`` requires: ``customer_id``, ``customer_name``,
        ``risk_level``, ``risk_score``, ``opportunity_score``,
        ``confidence``, and at least one of ``recommended_action`` /
        ``recommended_product``.

        ``opportunity_level`` is derived from *opp_score* because the
        standalone :class:`OpportunityAgent` does not emit that field
        directly.

        Parameters
        ----------
        customer : dict
            Raw customer record.
        risk_output : dict
            Output from step 2 (RiskAssessmentAgent).
        opp_output : dict
            Output from step 3 (OpportunityAgent).
        product_output : dict
            Output from step 4 (ProductRecommendationAgent).
        conflict_output : dict
            Output from step 5 (ConflictDetectionAgent).
        opp_score : int
            Pre-parsed opportunity score (avoids repeated cast).

        Returns
        -------
        dict
            Partial recommendation dict ready for ReviewerAgent.
        """
        if opp_score >= 70:
            opp_level = "High"
        elif opp_score >= 50:
            opp_level = "Medium"
        else:
            opp_level = "Low"

        return {
            "customer_id": customer.get("customer_id"),
            "customer_name": customer.get("name"),
            "risk_level": risk_output.get("risk_level"),
            "risk_score": risk_output.get("risk_score"),
            "opportunity_score": opp_output.get("opportunity_score"),
            "opportunity_level": opp_level,
            # conflict decision carries the action directive for validation
            "recommended_action": conflict_output.get("decision"),
            "recommended_product": product_output.get("recommended_product"),
            "confidence": product_output.get("confidence"),
        }

    # ── Private: priority derivation ──────────────────────────────────────

    @staticmethod
    def _derive_priority(opp_score: int) -> str:
        """
        Derive an engagement priority label from the opportunity score.

        The :class:`ProductRecommendationAgent` does not emit a
        ``priority`` field, so this is computed directly here.

        =========  =========
        Score      Priority
        =========  =========
        >= 80      ``"High"``
        60 – 79    ``"Medium"``
        < 60       ``"Low"``
        =========  =========

        Parameters
        ----------
        opp_score : int
            Opportunity score (0–100).

        Returns
        -------
        str
            ``"High"``, ``"Medium"``, or ``"Low"``.
        """
        if opp_score >= 80:
            return "High"
        if opp_score >= 60:
            return "Medium"
        return "Low"

    # ── Private: decision record builder ──────────────────────────────────

    @staticmethod
    def _build_decision_record(
        customer: dict[str, Any],
        risk_output: dict[str, Any],
        opp_output: dict[str, Any],
        product_output: dict[str, Any],
        conflict_output: dict[str, Any],
        explanation_output: dict[str, Any],
        priority: str,
    ) -> dict[str, Any]:
        """
        Assemble the flat record persisted by :class:`MemoryAgent` and
        :class:`AuditService`.

        Both services extract their required fields from this dict, so it
        must contain every key documented in their public APIs.

        Parameters
        ----------
        customer : dict
            Raw customer record (source of identity fields).
        risk_output : dict
            Step 2 output.
        opp_output : dict
            Step 3 output.
        product_output : dict
            Step 4 output.
        conflict_output : dict
            Step 5 output — ``decision`` maps to ``recommended_action``.
        explanation_output : dict
            Step 7 output.
        priority : str
            Derived engagement priority label.

        Returns
        -------
        dict
            Decision record ready for :meth:`MemoryAgent.save_decision`
            and :meth:`AuditService.store_decision`.
        """
        return {
            "customer_id": customer.get("customer_id"),
            "customer_name": customer.get("name"),
            "risk_level": risk_output.get("risk_level"),
            "risk_score": risk_output.get("risk_score"),
            "opportunity_score": opp_output.get("opportunity_score"),
            "segment": opp_output.get("segment"),
            "recommended_action": conflict_output.get("decision"),
            "recommended_product": product_output.get("recommended_product"),
            "confidence": product_output.get("confidence"),
            "explanation": explanation_output.get("explanation"),
            "next_best_action": explanation_output.get("next_best_action"),
            "priority": priority,
        }

    # ── Private: final response builder ───────────────────────────────────

    @staticmethod
    def _build_final_response(
        customer: dict[str, Any],
        risk_output: dict[str, Any],
        opp_output: dict[str, Any],
        product_output: dict[str, Any],
        conflict_output: dict[str, Any],
        review_output: dict[str, Any],
        explanation_output: dict[str, Any],
        mem_output: dict[str, Any],
        audit_output: dict[str, Any],
        priority: str,
        trace: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Assemble the unified response dict returned to the caller.

        Every field expected by the frontend is included.  Fields sourced
        from failed steps will be ``None`` or ``False``; the frontend must
        handle this gracefully.

        Parameters
        ----------
        customer : dict
            Raw customer record.
        risk_output : dict
            Step 2 output (or ``{}`` on failure).
        opp_output : dict
            Step 3 output.
        product_output : dict
            Step 4 output.
        conflict_output : dict
            Step 5 output.
        review_output : dict
            Step 6 output.
        explanation_output : dict
            Step 7 output.
        mem_output : dict
            Step 8 output — source of ``decision_id`` and ``timestamp``.
        audit_output : dict
            Step 9 output — source of ``audit_id``.
        priority : str
            Derived engagement priority label.
        trace : list[dict]
            Full ordered list of step envelopes.

        Returns
        -------
        dict
            Frontend-ready decision response.
        """
        return {
            # ── Identity ──────────────────────────────────────────────────
            "customer_id": customer.get("customer_id"),
            "customer_name": customer.get("name"),
            # ── Risk ──────────────────────────────────────────────────────
            "risk_score": risk_output.get("risk_score"),
            "risk_level": risk_output.get("risk_level"),
            # ── Opportunity ───────────────────────────────────────────────
            "opportunity_score": opp_output.get("opportunity_score"),
            "segment": opp_output.get("segment"),
            # ── Priority (derived; not in standalone ProductAgent) ─────────
            "priority": priority,
            # ── Product / Action ──────────────────────────────────────────
            "recommended_action": conflict_output.get("decision") or product_output.get("recommended_product"),
            "recommended_product": product_output.get("recommended_product"),
            "confidence": explanation_output.get("confidence") or product_output.get("confidence"),
            # ── Explanation ───────────────────────────────────────────────
            "next_best_action": explanation_output.get("next_best_action"),
            "explanation": explanation_output.get("explanation"),
            # ── Agentic Reasoning ─────────────────────────────────────────
            "reasoning": explanation_output.get("reasoning", []),
            "evidence": explanation_output.get("evidence", {}),
            "risks_identified": explanation_output.get("risks_identified", []),
            "opportunities_identified": explanation_output.get("opportunities_identified", []),
            "business_impact": explanation_output.get("business_impact", {}),
            # ── Conflict ──────────────────────────────────────────────────
            "conflict_decision": conflict_output.get("decision"),
            "conflict_detected": conflict_output.get("conflict_detected", False),
            # ── Review ────────────────────────────────────────────────────
            "review_status": review_output.get("status"),
            # ── Persistence identifiers ───────────────────────────────────
            "decision_id": mem_output.get("decision_id"),
            "timestamp": mem_output.get("timestamp"),
            "audit_id": audit_output.get("audit_id"),
            # ── Full pipeline trace ───────────────────────────────────────
            "trace": trace,
        }


# ── Module-level singleton ────────────────────────────────────────────────────
#
# All routers import and share this single instance so that the underlying
# agent objects (and, indirectly, the memory / audit singletons) are only
# initialised once per process.
#
#   from app.agents.pipeline_orchestrator import orchestrator
#   result = orchestrator.run(customer)
#
orchestrator: PipelineOrchestrator = PipelineOrchestrator()


# ── Trace helper ─────────────────────────────────────────────────────────────


def get_trace(customer_id: str) -> list[dict[str, Any]] | None:
    """
    Return the most recent pipeline trace for *customer_id*.

    The trace is populated automatically at the end of every
    :meth:`PipelineOrchestrator.run` call.  Only the *latest* run per
    customer is cached; earlier traces are overwritten.

    Parameters
    ----------
    customer_id : str
        The customer identifier used when the pipeline was last invoked.

    Returns
    -------
    list[dict] | None
        Ordered list of step envelopes from the most recent run, or
        ``None`` if no pipeline has been executed for this customer yet.
    """
    return _traces.get(str(customer_id))
