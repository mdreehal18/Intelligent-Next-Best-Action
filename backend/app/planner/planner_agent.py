"""
planner_agent.py
----------------
PlannerAgent inspects a customer profile and produces an ordered,
JSON-serialisable execution plan before any agent actually runs.

The plan is purely declarative — it tells the orchestrator *what* to do
and *why*, but does not execute anything itself.  This separation lets
the plan be logged, reviewed, or modified before execution.

Plan composition
----------------
Five steps are always present (required):

  1  Retrieve Customer          CustomerService
  2  Analyze Risk               RiskAgent
  3  Analyze Opportunity        OpportunityAgent
  4  Recommend Products         ProductRecommendationAgent
  5  Generate Explanation       ExplanationAgent
  6  Store Decision             MemoryAgent

Three steps are inserted conditionally based on the customer profile:

  Risk Escalation Review        inserted after Analyze Risk
                                when risk_score > 70

  Cross-Sell Assessment         inserted after Analyze Opportunity
                                when active product count < 2

  Enterprise Priority Routing   inserted after Recommend Products
                                when revenue >= $7 M

All steps are renumbered sequentially after the plan is assembled, so
the ``step`` field always reflects final position regardless of which
conditional steps were included.

Strategy labels
---------------
  "high_risk"   risk_score > 70
  "enterprise"  revenue >= $7 M  (and not high-risk)
  "growth"      revenue >= $3 M  (and not high-risk or enterprise)
  "standard"    everything else

Output schema
-------------
{
    "customer_id"       : str,
    "customer_name"     : str,
    "strategy"          : str,
    "total_steps"       : int,
    "required_steps"    : int,
    "conditional_steps" : int,
    "plan"              : [
        {
            "step"        : int,
            "name"        : str,   snake_case identifier
            "label"       : str,   human-readable title
            "description" : str,   what the step does
            "agent"       : str,   responsible agent / service
            "priority"    : str,   "required" | "conditional"
            "reason"      : str    why this step is in the plan
        },
        ...
    ]
}
"""

import json
import os
from typing import Any


class PlannerAgent:
    """Builds a tailored execution plan from a customer profile."""

    name = "PlannerAgent"

    def __init__(self):
        self._load_config()

    def _load_config(self):
        config_path = os.path.join(os.path.dirname(__file__), "..", "config", "business_rules.json")
        try:
            with open(config_path, "r") as f:
                config = json.load(f)
                t = config.get("thresholds", {})
                self.HIGH_RISK_THRESHOLD = t.get("high_risk", 70)
                self.ENTERPRISE_THRESHOLD = t.get("enterprise_revenue", 7000000)
                self.GROWTH_THRESHOLD = t.get("growth_revenue", 3000000)
                self.LOW_PRODUCT_LIMIT = t.get("low_product_limit", 2)
        except Exception:
            self.HIGH_RISK_THRESHOLD = 70
            self.ENTERPRISE_THRESHOLD = 7000000
            self.GROWTH_THRESHOLD = 3000000
            self.LOW_PRODUCT_LIMIT = 2

    # ── Public interface ──────────────────────────────────────────────────

    def run(self, customer: dict[str, Any]) -> dict[str, Any]:
        """
        Produce an ordered execution plan for one customer.

        Parameters
        ----------
        customer : dict
            Customer profile.  Expected keys:
              - ``customer_id``  (str)
              - ``name``         (str)
              - ``risk_score``   (int)
              - ``revenue``      (float)
              - ``products``     (list[str])
              - ``industry``     (str)

        Returns
        -------
        dict
            Execution plan with metadata and ordered step list.
        """
        risk_score: int = int(customer.get("risk_score") or 0)
        revenue: float = float(customer.get("revenue") or 0)
        products: list = customer.get("products") or []
        product_count: int = len(products) if isinstance(products, list) else 0

        steps = self._build_steps(risk_score, revenue, product_count)
        strategy = self._strategy(risk_score, revenue)

        required = sum(1 for s in steps if s["priority"] == "required")
        conditional = sum(1 for s in steps if s["priority"] == "conditional")

        return {
            "customer_id": customer.get("customer_id"),
            "customer_name": customer.get("name"),
            "strategy": strategy,
            "total_steps": len(steps),
            "required_steps": required,
            "conditional_steps": conditional,
            "plan": steps,
        }

    # ── Private: plan builder ─────────────────────────────────────────────

    def _build_steps(
        self,
        risk_score: int,
        revenue: float,
        product_count: int,
    ) -> list[dict[str, Any]]:
        """
        Assemble the step list, inject conditional steps where triggered,
        and number every step sequentially before returning.
        """
        steps: list[dict[str, Any]] = []

        # ── Step: Planner (always first) ──────────────────────────────────
        steps.append(
            self._step(
                name="planner",
                label="Dynamic Planning",
                description="Tailoring execution path based on customer profile.",
                agent="PlannerAgent",
                priority="required",
                reason="Orchestration Layer",
            )
        )

        # ── Step: Knowledge Retrieval (always) ────────────────────────────
        steps.append(
            self._step(
                name="retrieve_knowledge",
                label="Enterprise Knowledge Retrieval",
                description=(
                    "Retrieve context from playbooks, CRM history, and "
                    "internal FAQs to enrich decision context."
                ),
                agent="KnowledgeRetrievalAgent",
                priority="required",
                reason="Multi-source reasoning requires enterprise context.",
            )
        )

        # ── Step: Analyze Risk (always) ───────────────────────────────────
        steps.append(
            self._step(
                name="analyze_risk",
                label="Risk Assessment",
                description=(
                    "Classify the customer's risk level and compute a risk score "
                    "using revenue, industry, and product-depth signals."
                ),
                agent="RiskAssessmentAgent",
                priority="required",
                reason="Risk level determines urgency and drives downstream product selection.",
            )
        )

        # ── Conditional: Risk Escalation ──────────────────────────────────
        if risk_score > self.HIGH_RISK_THRESHOLD:
            steps.append(
                self._step(
                    name="escalate_risk",
                    label="Risk Escalation Review",
                    description=(
                        "Flag the customer for priority review and alert the "
                        "responsible relationship manager."
                    ),
                    agent="RiskAssessmentAgent",
                    priority="conditional",
                    reason=(
                        f"Risk score of {risk_score} exceeds the high-risk threshold "
                        f"of {self.HIGH_RISK_THRESHOLD} — elevated handling is required."
                    ),
                )
            )

        # ── Step: Analyze Opportunity (always) ────────────────────────────
        steps.append(
            self._step(
                name="analyze_opportunity",
                label="Opportunity Analysis",
                description=(
                    "Score cross-sell and upsell potential from revenue, "
                    "active product count, and industry sector."
                ),
                agent="OpportunityAgent",
                priority="required",
                reason="Opportunity score shapes which products are the strongest fit.",
            )
        )

        # ── Step: Recommend Products (always) ─────────────────────────────
        steps.append(
            self._step(
                name="recommend_products",
                label="Recommendation Engine",
                description=(
                    "Select the best-fit product from the catalogue using layered "
                    "risk, revenue, and industry-match rules."
                ),
                agent="ProductRecommendationAgent",
                priority="required",
                reason="Produces the actionable next-best product for this customer.",
            )
        )

        # ── Step: Generate Explanation (always) ───────────────────────────
        steps.append(
            self._step(
                name="generate_explanation",
                label="Explainability Layer",
                description=(
                    "Synthesise all agent outputs into a natural-language "
                    "explanation with evidence and confidence scores."
                ),
                agent="ExplanationAgent",
                priority="required",
                reason="Human-readable output is required for the decision dashboard.",
            )
        )

        # ── Step: Human Review (always) ───────────────────────────────────
        steps.append(
            self._step(
                name="human_review",
                label="Human-in-the-Loop Review",
                description="Require manual signal to approve or modify the recommendation.",
                agent="ReviewerAgent",
                priority="required",
                reason="Enterprise compliance requires human oversight.",
            )
        )

        # ── Step: Store Decision (always) ─────────────────────────────────
        steps.append(
            self._step(
                name="store_decision",
                label="Memory Update",
                description=(
                    "Persist the complete AI decision to memory for future "
                    "retrieval and long-term optimization."
                ),
                agent="MemoryAgent",
                priority="required",
                reason="Continuous learning from previous recommendations.",
            )
        )

        # Number steps sequentially after all insertions
        for position, step in enumerate(steps, start=1):
            step["step"] = position

        return steps

    # ── Private: strategy label ───────────────────────────────────────────

    def _strategy(self, risk_score: int, revenue: float) -> str:
        """
        Derive a single strategy label that summarises the dominant
        characteristic of this customer profile.

        Precedence: high_risk > enterprise > growth > standard
        """
        if risk_score > self.HIGH_RISK_THRESHOLD:
            return "high_risk"
        if revenue >= self.ENTERPRISE_THRESHOLD:
            return "enterprise"
        if revenue >= self.GROWTH_THRESHOLD:
            return "growth"
        return "standard"

    # ── Private: step factory ─────────────────────────────────────────────

    @staticmethod
    def _step(
        name: str,
        label: str,
        description: str,
        agent: str,
        priority: str,
        reason: str,
    ) -> dict[str, Any]:
        """Return a step dict without a ``step`` number (assigned later)."""
        return {
            "step": None,  # filled in by _build_steps
            "name": name,
            "label": label,
            "description": description,
            "agent": agent,
            "priority": priority,
            "reason": reason,
        }
