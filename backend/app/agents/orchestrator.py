"""
orchestrator.py
---------------
Coordinates the sequential execution of all decision agents against a single
customer record and returns one unified, JSON-serialisable workflow object.

Agent pipeline (dependency order)
----------------------------------
  1. Planner                    — build execution plan from customer profile
  2. RiskAgent                  — risk score, level, factors, segment
  3. OpportunityAgent           — opportunity score, level, cross/upsell flags
  4. ProductRecommendationAgent — primary action, product list, confidence, priority
  5. ConflictAgent              — detect + resolve risk/opportunity conflicts
  6. ReviewerAgent              — validate consistency, fields, and confidence
  7. ExplanationAgent           — natural-language explanation, rationale, signals
  8. MemoryAgent                — persist decision and inject decision_id / timestamp
  9. AuditService               — write immutable compliance record

All agents are deterministic (no LLM calls).
"""

from __future__ import annotations

import logging
import time
from typing import Any

from app.agents.conflict_agent import ConflictAgent
from app.agents.reviewer_agent import ReviewerAgent
from app.memory.memory_agent import memory
from app.planner.planner_agent import PlannerAgent
from app.services.audit_service import audit

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Base agent
# ─────────────────────────────────────────────────────────────────────────────


class BaseAgent:
    """Shared contract every inline agent must satisfy."""

    name: str = "BaseAgent"

    def run(self, customer: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        """
        Execute agent logic.

        Parameters
        ----------
        customer : dict
            Raw customer record (keys: customer_id, name, revenue,
            industry, products, risk_score, …).
        context : dict
            Outputs already produced by upstream agents, keyed by agent name.

        Returns
        -------
        dict
            Agent output that will be merged into context for downstream agents.
        """
        raise NotImplementedError


# ─────────────────────────────────────────────────────────────────────────────
# Agent 1 – RiskAgent
# ─────────────────────────────────────────────────────────────────────────────


class RiskAgent(BaseAgent):
    """
    Produces a deterministic risk score (0–100), a risk level label,
    a list of human-readable risk factors, and the customer segment.

    Thresholds (kept in sync with decision_engine.py)
    -------------------------------------------------
    - Revenue < $3 M         → +30 risk
    - Industry == "Retail"   → +20 risk
    - Single product         → +20 risk
    - Score > 60             → "High" | 30-60 → "Medium" | < 30 → "Low"
    - Segment: ≥ $7 M Enterprise | ≥ $3 M Growth | else Emerging
    """

    name = "RiskAgent"

    REVENUE_RISK_THRESHOLD = 3_000_000
    REVENUE_RISK_POINTS = 30
    RETAIL_RISK_POINTS = 20
    SINGLE_PRODUCT_POINTS = 20
    MAX_SCORE = 100

    def run(self, customer: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        revenue = customer.get("revenue", 0) or 0
        industry = customer.get("industry", "")
        products = customer.get("products", [])
        product_count = len(products) if isinstance(products, list) else 0

        risk_score = 0
        risk_factors: list[str] = []

        if revenue < self.REVENUE_RISK_THRESHOLD:
            risk_score += self.REVENUE_RISK_POINTS
            risk_factors.append(
                f"Revenue (${revenue:,.0f}) is below the $3 M stability threshold"
            )

        if industry == "Retail":
            risk_score += self.RETAIL_RISK_POINTS
            risk_factors.append("Retail sector carries elevated market and margin risk")

        if product_count == 1:
            risk_score += self.SINGLE_PRODUCT_POINTS
            risk_factors.append("Single-product relationship increases churn exposure")

        risk_score = min(risk_score, self.MAX_SCORE)

        if risk_score > 60:
            risk_level = "High"
        elif risk_score >= 30:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        if revenue >= 7_000_000:
            segment = "Enterprise"
        elif revenue >= 3_000_000:
            segment = "Growth"
        else:
            segment = "Emerging"

        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "segment": segment,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Agent 2 – OpportunityAgent
# ─────────────────────────────────────────────────────────────────────────────


class OpportunityAgent(BaseAgent):
    """
    Produces a deterministic opportunity score (0–100), a level label,
    cross-sell / upsell flags, and the drivers that raised the score.

    Thresholds (kept in sync with decision_engine.py)
    -------------------------------------------------
    - Base score             = 50
    - Revenue > $5 M         → +20
    - Products < 3           → +20
    - Industry == "Technology"→ +10
    - Score ≥ 80 → "High" | ≥ 60 → "Medium" | else → "Low"
    """

    name = "OpportunityAgent"

    BASE_SCORE = 50
    HIGH_REVENUE_THRESHOLD = 5_000_000
    HIGH_REVENUE_POINTS = 20
    CROSS_SELL_PRODUCT_LIMIT = 3
    CROSS_SELL_POINTS = 20
    TECH_BONUS_POINTS = 10
    MAX_SCORE = 100

    def run(self, customer: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        revenue = customer.get("revenue", 0) or 0
        industry = customer.get("industry", "")
        products = customer.get("products", [])
        product_count = len(products) if isinstance(products, list) else 0

        opportunity_score = self.BASE_SCORE
        opportunity_drivers: list[str] = []

        if revenue > self.HIGH_REVENUE_THRESHOLD:
            opportunity_score += self.HIGH_REVENUE_POINTS
            opportunity_drivers.append(
                f"High revenue (${revenue:,.0f}) signals strong upsell capacity"
            )

        if product_count < self.CROSS_SELL_PRODUCT_LIMIT:
            opportunity_score += self.CROSS_SELL_POINTS
            opportunity_drivers.append(
                f"Only {product_count} active product(s) — cross-sell gap exists"
            )

        if industry == "Technology":
            opportunity_score += self.TECH_BONUS_POINTS
            opportunity_drivers.append(
                "Technology sector shows above-average service-adoption rates"
            )

        opportunity_score = min(opportunity_score, self.MAX_SCORE)

        if opportunity_score >= 80:
            opportunity_level = "High"
        elif opportunity_score >= 60:
            opportunity_level = "Medium"
        else:
            opportunity_level = "Low"

        return {
            "opportunity_score": opportunity_score,
            "opportunity_level": opportunity_level,
            "cross_sell_potential": product_count < self.CROSS_SELL_PRODUCT_LIMIT,
            "upsell_potential": revenue > self.HIGH_REVENUE_THRESHOLD,
            "opportunity_drivers": opportunity_drivers,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Agent 3 – ProductRecommendationAgent
# ─────────────────────────────────────────────────────────────────────────────


class ProductRecommendationAgent(BaseAgent):
    """
    Selects the primary recommended action and any supplementary products
    from the internal catalogue, calculates a confidence score, and assigns
    action priority.

    Decision rules (kept in sync with recommendation_service.py)
    ------------------------------------------------------------
    - risk_score ≥ 50        → Risk Monitoring Program  (confidence 92)
    - segment == Enterprise  → Corporate Credit Line     (confidence 90)
    - opportunity ≥ 80       → Premium Business Package  (confidence 88)
    - default                → Business Credit Card      (confidence 80)
    """

    name = "ProductRecommendationAgent"

    CATALOGUE: dict[str, str] = {
        "Risk Monitoring Program": "Proactive risk management with real-time early-warning alerts.",
        "Corporate Credit Line": "Flexible revolving credit facility for enterprise operations.",
        "Premium Business Package": "Bundled financial services designed for high-growth customers.",
        "Business Credit Card": "Everyday business spending with cashback rewards.",
        "Cash Flow Management Suite": "Tools for optimising working capital and liquidity cycles.",
        "Trade Finance Solution": "Support for international trade and supply-chain payments.",
    }

    def run(self, customer: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        risk = context.get("RiskAgent", {})
        opportunity = context.get("OpportunityAgent", {})

        risk_score = risk.get("risk_score", 0)
        segment = risk.get("segment", "Emerging")
        opportunity_score = opportunity.get("opportunity_score", 50)
        cross_sell = opportunity.get("cross_sell_potential", False)
        upsell = opportunity.get("upsell_potential", False)

        # ── Primary recommendation ────────────────────────────────────────
        if risk_score >= 50:
            primary = "Risk Monitoring Program"
            confidence = 92
        elif segment == "Enterprise":
            primary = "Corporate Credit Line"
            confidence = 90
        elif opportunity_score >= 80:
            primary = "Premium Business Package"
            confidence = 88
        else:
            primary = "Business Credit Card"
            confidence = 80

        # ── Priority ─────────────────────────────────────────────────────
        if opportunity_score >= 80:
            priority = "High"
        elif opportunity_score >= 60:
            priority = "Medium"
        else:
            priority = "Low"

        # ── Supplementary products ────────────────────────────────────────
        product_recommendations: list[str] = [primary]

        if cross_sell and "Cash Flow Management Suite" not in product_recommendations:
            product_recommendations.append("Cash Flow Management Suite")

        if (
            upsell
            and segment == "Enterprise"
            and "Trade Finance Solution" not in product_recommendations
        ):
            product_recommendations.append("Trade Finance Solution")

        return {
            "recommended_action": primary,
            "recommended_action_description": self.CATALOGUE.get(primary, ""),
            "product_recommendations": product_recommendations,
            "confidence": confidence,
            "priority": priority,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Agent 4 – ExplanationAgent
# ─────────────────────────────────────────────────────────────────────────────


class ExplanationAgent(BaseAgent):
    """
    Synthesises outputs from all upstream agents into:

    - next_best_action : concise action string for the frontend panel
    - explanation      : one-paragraph narrative summary
    - rationale        : ordered list of evidence bullets
    - signals          : typed signal objects for ExplainabilityCard
    """

    name = "ExplanationAgent"

    def run(self, customer: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        risk = context.get("RiskAgent", {})
        opportunity = context.get("OpportunityAgent", {})
        product = context.get("ProductRecommendationAgent", {})
        conflict = context.get("ConflictAgent", {})

        customer_name = customer.get("name", "This customer")
        risk_level = risk.get("risk_level", "Unknown")
        risk_score = risk.get("risk_score", 0)
        segment = risk.get("segment", "Unknown")
        risk_factors = risk.get("risk_factors", [])
        opportunity_level = opportunity.get("opportunity_level", "Unknown")
        opportunity_score = opportunity.get("opportunity_score", 0)
        opportunity_drivers = opportunity.get("opportunity_drivers", [])
        recommended_action = product.get("recommended_action", "")
        confidence = product.get("confidence", 0)
        priority = product.get("priority", "Low")
        conflict_decision = conflict.get("decision", "")

        # ── Explanation paragraph ─────────────────────────────────────────
        conflict_note = (
            f" Note: {conflict_decision}."
            if conflict_decision and conflict_decision not in ("Proceed", "")
            else ""
        )
        explanation = (
            f"{customer_name} is a {segment} segment customer presenting "
            f"{risk_level.lower()} risk (score {risk_score}/100) and "
            f"{opportunity_level.lower()} opportunity (score {opportunity_score}/100). "
            f"Based on {len(risk_factors) + len(opportunity_drivers)} detected signals, "
            f"the AI recommends '{recommended_action}' with {confidence}% confidence. "
            f"This action is rated {priority} priority.{conflict_note}"
        )

        # ── Rationale bullets ─────────────────────────────────────────────
        rationale: list[str] = []
        rationale.extend(risk_factors)
        rationale.extend(opportunity_drivers)
        if conflict.get("reason"):
            rationale.append(f"Conflict resolution: {conflict['reason']}")
        if not rationale:
            rationale.append("Standard portfolio assessment criteria applied.")

        # ── Next-best-action string ───────────────────────────────────────
        next_best_action = (
            f"Engage {customer_name} with the '{recommended_action}' offering. "
            f"AI confidence: {confidence}%. Priority: {priority}."
        )

        # ── Typed signals for ExplainabilityCard ─────────────────────────
        signals: list[dict[str, str]] = []
        for factor in risk_factors:
            signals.append({"type": "risk", "description": factor})
        for driver in opportunity_drivers:
            signals.append({"type": "opportunity", "description": driver})
        if conflict.get("conflict_detected"):
            signals.append(
                {"type": "conflict", "description": conflict.get("reason", "")}
            )

        return {
            "next_best_action": next_best_action,
            "explanation": explanation,
            "rationale": rationale,
            "signals": signals,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Orchestrator
# ─────────────────────────────────────────────────────────────────────────────


class AgentOrchestrator:
    """
    Runs all nine decision agents in dependency order and returns one
    unified, JSON-serialisable workflow object.

    Pipeline
    --------
    Planner → Risk → Opportunity → Product → Conflict → Reviewer
    → Explanation → Memory → Audit

    Usage
    -----
        orchestrator = AgentOrchestrator()
        result = orchestrator.run(customer)
    """

    def __init__(self) -> None:
        # ── Inline pipeline agents (context-aware) ────────────────────────
        self.agents: list[BaseAgent] = [
            RiskAgent(),
            OpportunityAgent(),
            ProductRecommendationAgent(),
            ExplanationAgent(),
        ]

        # ── External agents / services ────────────────────────────────────
        self._planner = PlannerAgent()
        self._conflict = ConflictAgent()
        self._reviewer = ReviewerAgent()

    # ── Public entry point ────────────────────────────────────────────────

    def run(self, customer: dict[str, Any]) -> dict[str, Any]:
        """
        Execute the full nine-step pipeline and return the workflow object.

        Parameters
        ----------
        customer : dict
            A single customer record as loaded from the data layer.

        Returns
        -------
        dict
            Complete workflow response — see ``_build_final_response`` for
            the full schema.

        Raises
        ------
        ValueError
            If *customer* is empty or not a dict.
        """
        if not isinstance(customer, dict) or not customer:
            raise ValueError("customer must be a non-empty dict")

        ctx: dict[str, Any] = {}
        trace: list[dict[str, Any]] = []

        # ── Step 1: Planner ───────────────────────────────────────────────
        self._exec(trace, "Planner", ctx, lambda: self._planner.run(customer))

        # ── Step 2: Risk ──────────────────────────────────────────────────
        self._exec(trace, "RiskAgent", ctx, lambda: self.agents[0].run(customer, ctx))

        # ── Step 3: Opportunity ───────────────────────────────────────────
        self._exec(
            trace, "OpportunityAgent", ctx, lambda: self.agents[1].run(customer, ctx)
        )

        # ── Step 4: Product ───────────────────────────────────────────────
        self._exec(
            trace,
            "ProductRecommendationAgent",
            ctx,
            lambda: self.agents[2].run(customer, ctx),
        )

        # ── Step 5: Conflict Resolver ─────────────────────────────────────
        self._exec(
            trace,
            "ConflictAgent",
            ctx,
            lambda: self._conflict.run(
                ctx.get("RiskAgent", {}),
                ctx.get("OpportunityAgent", {}),
                ctx.get("ProductRecommendationAgent", {}),
            ),
        )

        # ── Step 6: Reviewer ──────────────────────────────────────────────
        self._exec(
            trace,
            "ReviewerAgent",
            ctx,
            lambda: self._reviewer.run(self._partial_response(customer, ctx)),
        )

        # ── Step 7: Explanation ───────────────────────────────────────────
        self._exec(
            trace, "ExplanationAgent", ctx, lambda: self.agents[3].run(customer, ctx)
        )

        # ── Build core result (before persistence) ────────────────────────
        core = self._build_response(customer, ctx)

        # ── Step 8: Memory ────────────────────────────────────────────────
        self._exec(trace, "MemoryAgent", ctx, lambda: memory.save_decision(core))

        # ── Step 9: Audit ─────────────────────────────────────────────────
        self._exec(
            trace,
            "AuditService",
            ctx,
            lambda: audit.store_decision(
                core,
                review_result=ctx.get("ReviewerAgent", {}),
            ).to_dict(),
        )

        return self._build_final_response(customer, ctx, trace)

    # ── Private: step runner ──────────────────────────────────────────────

    @staticmethod
    def _exec(
        trace: list[dict[str, Any]],
        name: str,
        ctx: dict[str, Any],
        fn: Any,
    ) -> dict[str, Any]:
        """
        Execute *fn*, record timing + status in *trace*, store output in *ctx*.

        A failing step writes ``{"error": "…"}`` to context and continues —
        the pipeline never crashes mid-run.
        """
        t0 = time.perf_counter()
        try:
            output = fn()
            status = "ok"
        except Exception as exc:
            logger.error("Step '%s' failed: %s", name, exc, exc_info=True)
            output = {"error": str(exc)}
            status = "error"

        ms = round((time.perf_counter() - t0) * 1_000, 2)
        ctx[name] = output if isinstance(output, dict) else {"result": output}

        trace.append(
            {
                "step": len(trace) + 1,
                "agent": name,
                "status": status,
                "duration_ms": ms,
                "error": output.get("error") if status == "error" else None,
            }
        )
        return ctx[name]

    # ── Private: partial response for ReviewerAgent ───────────────────────

    @staticmethod
    def _partial_response(
        customer: dict[str, Any],
        ctx: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Assemble the minimum fields ReviewerAgent needs for validation
        (steps 1–4 outputs only — before conflict/explanation).
        """
        risk = ctx.get("RiskAgent", {})
        opp = ctx.get("OpportunityAgent", {})
        product = ctx.get("ProductRecommendationAgent", {})

        return {
            "customer_id": customer.get("customer_id"),
            "customer_name": customer.get("name"),
            "risk_level": risk.get("risk_level"),
            "risk_score": risk.get("risk_score"),
            "opportunity_score": opp.get("opportunity_score"),
            "opportunity_level": opp.get("opportunity_level"),
            "recommended_action": product.get("recommended_action"),
            "confidence": product.get("confidence"),
            "priority": product.get("priority"),
        }

    # ── Private: response builders ────────────────────────────────────────

    def _build_response(
        self,
        customer: dict[str, Any],
        ctx: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Assemble the core decision payload from pipeline context.
        Called before Memory and Audit so they receive the full picture.
        """
        plan = ctx.get("Planner", {})
        risk = ctx.get("RiskAgent", {})
        opp = ctx.get("OpportunityAgent", {})
        product = ctx.get("ProductRecommendationAgent", {})
        conflict = ctx.get("ConflictAgent", {})
        review = ctx.get("ReviewerAgent", {})
        explanation = ctx.get("ExplanationAgent", {})

        return {
            # ── Identity ──────────────────────────────────────────────────
            "customer_id": customer.get("customer_id"),
            "customer_name": customer.get("name"),
            # ── Plan ──────────────────────────────────────────────────────
            "strategy": plan.get("strategy"),
            "plan": plan.get("plan", []),
            "total_steps": plan.get("total_steps"),
            # ── Risk ──────────────────────────────────────────────────────
            "risk_score": risk.get("risk_score"),
            "risk_level": risk.get("risk_level"),
            "risk_factors": risk.get("risk_factors", []),
            "segment": risk.get("segment"),
            # ── Opportunity ───────────────────────────────────────────────
            "opportunity_score": opp.get("opportunity_score"),
            "opportunity_level": opp.get("opportunity_level"),
            "cross_sell_potential": opp.get("cross_sell_potential"),
            "upsell_potential": opp.get("upsell_potential"),
            "opportunity_drivers": opp.get("opportunity_drivers", []),
            # ── Product ───────────────────────────────────────────────────
            "recommended_action": product.get("recommended_action"),
            "recommended_action_description": product.get(
                "recommended_action_description"
            ),
            "product_recommendations": product.get("product_recommendations", []),
            "confidence": product.get("confidence"),
            "priority": product.get("priority"),
            # ── Conflict ──────────────────────────────────────────────────
            "conflict_decision": conflict.get("decision"),
            "conflict_reason": conflict.get("reason"),
            "conflict_detected": conflict.get("conflict_detected", False),
            "conflict_type": conflict.get("conflict_type"),
            # ── Review ────────────────────────────────────────────────────
            "review_status": review.get("status"),
            "review_reason": review.get("reason"),
            "review_issues": review.get("issues", []),
            # ── Explanation ───────────────────────────────────────────────
            "next_best_action": explanation.get("next_best_action"),
            "explanation": explanation.get("explanation"),
            "rationale": explanation.get("rationale", []),
            "signals": explanation.get("signals", []),
            # ── Pipeline metadata ─────────────────────────────────────────
            "agents_executed": [a.name for a in self.agents]
            + ["ConflictAgent", "ReviewerAgent"],
        }

    def _build_final_response(
        self,
        customer: dict[str, Any],
        ctx: dict[str, Any],
        trace: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Merge the core response with memory/audit outputs and the workflow trace.
        This is the complete object returned to callers.
        """
        core = self._build_response(customer, ctx)
        mem = ctx.get("MemoryAgent", {})
        audit_record = ctx.get("AuditService", {})

        successful = sum(1 for t in trace if t["status"] == "ok")
        failed = sum(1 for t in trace if t["status"] == "error")
        total_ms = round(sum(t["duration_ms"] for t in trace), 2)

        return {
            **core,
            # ── Memory ────────────────────────────────────────────────────
            "decision_id": mem.get("decision_id"),
            "timestamp": mem.get("timestamp"),
            # ── Audit ─────────────────────────────────────────────────────
            "audit_id": audit_record.get("audit_id"),
            # ── Workflow trace ─────────────────────────────────────────────
            "workflow": {
                "total_steps": len(trace),
                "successful": successful,
                "failed": failed,
                "total_duration_ms": total_ms,
                "steps": trace,
            },
            # Override agents_executed with the full trace list
            "agents_executed": [t["agent"] for t in trace if t["status"] == "ok"],
        }
