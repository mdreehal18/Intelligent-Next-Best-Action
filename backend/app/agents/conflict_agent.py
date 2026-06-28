"""
conflict_agent.py
-----------------
ConflictAgent inspects the outputs of RiskAgent, OpportunityAgent, and
ProductRecommendationAgent for contradictory signals and returns a single
resolved decision with a human-readable reason.

What counts as a conflict?
--------------------------
A conflict exists when two signals pull in opposite directions, making a
simple "proceed" unsafe without further judgement:

  HIGH RISK  +  HIGH OPPORTUNITY      — most common conflict (user example)
  HIGH RISK  +  HIGH PRODUCT CONF     — product layer wants to act, risk says no
  HIGH RISK  +  LOW  OPPORTUNITY      — risk dominates with no upside to justify it

Non-conflicting cases are also resolved to give callers a single
consistent decision regardless of whether a conflict was found.

Resolution matrix (applied in priority order)
---------------------------------------------
Priority  Condition                                         Decision
────────  ────────────────────────────────────────────────  ─────────────────────────
   1      High Risk  AND  opportunity ≥ HIGH_OPP (70)      Review Required
   2      High Risk  AND  product_confidence ≥ HIGH_PROD (85)
                                                            Review Required
   3      High Risk  AND  opportunity < HIGH_OPP           Risk Intervention Required
   4      Low Risk   AND  opportunity ≥ HIGH_OPP           Proceed
   5      Low Risk   AND  opportunity < LOW_OPP  (50)      Low Priority
   6      Any Risk   AND  opportunity ≥ HIGH_OPP           Proceed with Caution
                     (Medium risk, positive opportunity)
   7      Default    (Medium risk, moderate opportunity)   Proceed with Caution

Output schema
-------------
{
    "decision"         : str   — action directive for the dashboard
    "reason"           : str   — human-readable explanation
    "conflict_detected": bool  — True when signals contradict each other
    "conflict_type"    : str | None  — machine-readable conflict label
}
"""

from __future__ import annotations

from typing import Any


class ConflictAgent:
    """Detects and resolves conflicts between upstream agent outputs."""

    name = "ConflictAgent"

    # ── Thresholds ────────────────────────────────────────────────────────
    HIGH_OPP_THRESHOLD: int = 70  # opportunity_score ≥ this → "high"
    LOW_OPP_THRESHOLD: int = 50  # opportunity_score <  this → "low"
    HIGH_PRODUCT_CONFIDENCE: int = 85  # product confidence ≥ this → "high"

    # ── Conflict type labels ──────────────────────────────────────────────
    _CT_HIGH_RISK_HIGH_OPP = "high_risk_high_opportunity"
    _CT_HIGH_RISK_HIGH_PROD = "high_risk_high_product_confidence"
    _CT_HIGH_RISK_LOW_OPP = "high_risk_low_opportunity"
    _CT_NONE = None

    # ── Public interface ──────────────────────────────────────────────────

    def run(
        self,
        risk_result: dict[str, Any],
        opportunity_result: dict[str, Any],
        product_result: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Detect conflicts and return a resolved decision.

        Parameters
        ----------
        risk_result : dict
            Output of RiskAgent.
            Expected keys: ``risk_level`` (str), ``risk_score`` (int).
        opportunity_result : dict
            Output of OpportunityAgent.
            Expected keys: ``opportunity_score`` (int), ``segment`` (str).
        product_result : dict
            Output of ProductRecommendationAgent.
            Expected keys: ``recommended_product`` (str), ``confidence`` (int).

        Returns
        -------
        dict
            ::

                {
                    "decision"         : str,
                    "reason"           : str,
                    "conflict_detected": bool,
                    "conflict_type"    : str | None
                }
        """
        risk_level: str = risk_result.get("risk_level", "Medium")
        risk_score: int = int(risk_result.get("risk_score") or 0)
        opp_score: int = int(opportunity_result.get("opportunity_score") or 0)
        product_conf: int = int(product_result.get("confidence") or 0)
        recommended: str = product_result.get(
            "recommended_product", "the recommended product"
        )
        segment: str = opportunity_result.get("segment", "")

        conflict_type = self._detect(risk_level, opp_score, product_conf)
        decision, reason = self._resolve(
            conflict_type,
            risk_level,
            risk_score,
            opp_score,
            product_conf,
            recommended,
            segment,
        )

        return {
            "decision": decision,
            "reason": reason,
            "conflict_detected": conflict_type is not None,
            "conflict_type": conflict_type,
        }

    # ── Private: detection ────────────────────────────────────────────────

    def _detect(
        self,
        risk_level: str,
        opp_score: int,
        product_conf: int,
    ) -> str | None:
        """
        Identify the highest-priority conflict present, or return None.

        Priority order mirrors the resolution matrix in the module docstring.
        """
        if risk_level == "High":
            if opp_score >= self.HIGH_OPP_THRESHOLD:
                return self._CT_HIGH_RISK_HIGH_OPP
            if product_conf >= self.HIGH_PRODUCT_CONFIDENCE:
                return self._CT_HIGH_RISK_HIGH_PROD
            return self._CT_HIGH_RISK_LOW_OPP

        return self._CT_NONE  # Low / Medium risk — no conflict

    # ── Private: resolution ───────────────────────────────────────────────

    def _resolve(
        self,
        conflict_type: str | None,
        risk_level: str,
        risk_score: int,
        opp_score: int,
        product_conf: int,
        recommended: str,
        segment: str,
    ) -> tuple[str, str]:
        """
        Map a conflict type (or its absence) to a (decision, reason) pair.
        """

        # ── Conflict: High Risk + High Opportunity ────────────────────────
        if conflict_type == self._CT_HIGH_RISK_HIGH_OPP:
            return (
                "Review Required",
                (
                    f"High opportunity (score: {opp_score}) but elevated risk "
                    f"(score: {risk_score}). "
                    "A manual review is required before proceeding with engagement."
                ),
            )

        # ── Conflict: High Risk + High Product Confidence ─────────────────
        if conflict_type == self._CT_HIGH_RISK_HIGH_PROD:
            return (
                "Review Required",
                (
                    f"'{recommended}' is recommended with {product_conf}% confidence, "
                    f"but the customer carries a high risk score of {risk_score}. "
                    "Validate risk controls before acting on the product recommendation."
                ),
            )

        # ── Conflict: High Risk + Low/Medium Opportunity ──────────────────
        if conflict_type == self._CT_HIGH_RISK_LOW_OPP:
            return (
                "Risk Intervention Required",
                (
                    f"Elevated risk (score: {risk_score}) with limited opportunity "
                    f"(score: {opp_score}). "
                    "Risk mitigation must take priority over product engagement."
                ),
            )

        # ── No conflict — resolve by risk/opportunity harmony ─────────────

        # Low risk + strong opportunity
        if risk_level == "Low" and opp_score >= self.HIGH_OPP_THRESHOLD:
            return (
                "Proceed",
                (
                    f"Low risk profile and strong opportunity (score: {opp_score}) "
                    f"present a clear path to engagement. "
                    f"'{recommended}' is a well-aligned recommendation."
                ),
            )

        # Low risk + weak opportunity
        if risk_level == "Low" and opp_score < self.LOW_OPP_THRESHOLD:
            return (
                "Low Priority",
                (
                    f"Stable, low-risk customer with limited near-term opportunity "
                    f"(score: {opp_score}). "
                    "Schedule a periodic review rather than active outreach."
                ),
            )

        # Medium risk + high opportunity
        if opp_score >= self.HIGH_OPP_THRESHOLD:
            return (
                "Proceed with Caution",
                (
                    f"Good opportunity (score: {opp_score}) with moderate risk "
                    f"(score: {risk_score}). "
                    f"Proceed with '{recommended}' under standard oversight protocols."
                ),
            )

        # Default: medium risk, moderate opportunity
        return (
            "Proceed with Caution",
            (
                f"No significant conflicts detected. "
                f"Risk is {risk_level.lower()} (score: {risk_score}) and opportunity "
                f"is moderate (score: {opp_score}). "
                "Standard engagement protocols apply."
            ),
        )
