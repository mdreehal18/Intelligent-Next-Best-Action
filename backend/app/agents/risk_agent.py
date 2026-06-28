"""
risk_agent.py
-------------
Standalone RiskAgent that classifies a customer's risk level using the
pre-computed risk_score already present in the customer record, combined
with a revenue floor rule.

Classification rules (applied in precedence order)
---------------------------------------------------
1. risk_score > 70                            → "High"
2. risk_score < 30  AND  revenue >= $2 M      → "Low"
3. All other cases  (incl. revenue < $2 M)    → "Medium"

Confidence formula (deterministic)
-----------------------------------
High   : min(100, 70 + (score − 70) × 2)
           score 71 → 72  |  score 85 → 100
Low    : min(100, 70 + (30 − score) × 2)
           score 29 → 72  |  score 18 → 94  |  score  0 → 100
Medium (revenue-driven, revenue < $2 M) : 80  (clear-cut rule)
Medium (score-driven,  30 ≤ score ≤ 70): max(60, 85 − |score − 50|)
           score 50 → 85 (unambiguous centre)
           score 30 → 65 (near Low boundary)

Output schema
-------------
{
    "risk_level"  : "High" | "Medium" | "Low",
    "risk_score"  : int,
    "confidence"  : int  (0–100),
    "reason"      : str
}
"""

from __future__ import annotations

from typing import Any


class RiskAgent:
    """Classifies a customer's risk level using deterministic rules."""

    name = "RiskAgent"

    # ── Thresholds ────────────────────────────────────────────────────────
    HIGH_SCORE_THRESHOLD: int = 70
    LOW_SCORE_THRESHOLD: int = 30
    REVENUE_FLOOR: float = 2_000_000

    # ── Public interface ──────────────────────────────────────────────────

    def run(self, customer: dict[str, Any]) -> dict[str, Any]:
        """
        Classify a customer's risk level.

        Parameters
        ----------
        customer : dict
            Customer record.  Expected keys:
              - ``risk_score``  (int)   pre-computed score 0–100
              - ``revenue``     (float) annual revenue in USD
              - ``name``        (str)   used in the reason string

        Returns
        -------
        dict
            ``{"risk_level": str, "risk_score": int,
               "confidence": int, "reason": str}``
        """
        risk_score: int = int(customer.get("risk_score") or 0)
        revenue: float = float(customer.get("revenue") or 0)
        name: str = customer.get("name", "Customer")

        risk_level, reason = self._classify(risk_score, revenue, name)
        confidence: int = self._confidence(risk_level, risk_score, revenue)

        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "confidence": confidence,
            "reason": reason,
        }

    # ── Private helpers ───────────────────────────────────────────────────

    def _classify(
        self,
        risk_score: int,
        revenue: float,
        name: str,
    ) -> tuple[str, str]:
        """
        Apply classification rules and return (risk_level, reason).

        Precedence
        ----------
        1. risk_score > HIGH_SCORE_THRESHOLD  →  High
        2. risk_score < LOW_SCORE_THRESHOLD
           AND revenue >= REVENUE_FLOOR       →  Low
        3. Everything else                    →  Medium
        """

        # ── Rule 1: High risk ─────────────────────────────────────────────
        if risk_score > self.HIGH_SCORE_THRESHOLD:
            return (
                "High",
                (
                    f"{name} has a risk score of {risk_score}, which exceeds the "
                    f"high-risk threshold of {self.HIGH_SCORE_THRESHOLD}. "
                    "Immediate review and proactive engagement are recommended."
                ),
            )

        # ── Rule 2: Low risk ──────────────────────────────────────────────
        if risk_score < self.LOW_SCORE_THRESHOLD and revenue >= self.REVENUE_FLOOR:
            return (
                "Low",
                (
                    f"{name} has a risk score of {risk_score}, below the low-risk "
                    f"threshold of {self.LOW_SCORE_THRESHOLD}, and stable revenue of "
                    f"${revenue:,.0f} above the ${self.REVENUE_FLOOR:,.0f} floor. "
                    "No immediate risk action required."
                ),
            )

        # ── Rule 3: Medium risk (default) ─────────────────────────────────
        if revenue < self.REVENUE_FLOOR:
            reason = (
                f"{name} has revenue of ${revenue:,.0f}, which is below the "
                f"${self.REVENUE_FLOOR:,.0f} stability floor. "
                "Financial exposure warrants medium-level monitoring "
                f"regardless of the risk score ({risk_score})."
            )
        else:
            reason = (
                f"{name} has a risk score of {risk_score}, which falls within the "
                f"medium-risk band ({self.LOW_SCORE_THRESHOLD}–{self.HIGH_SCORE_THRESHOLD}). "
                "Standard monitoring applies."
            )

        return ("Medium", reason)

    def _confidence(
        self,
        risk_level: str,
        risk_score: int,
        revenue: float,
    ) -> int:
        """
        Return a deterministic confidence score (0–100) for the classification.

        High   : min(100, 70 + (score − threshold) × 2)
        Low    : min(100, 70 + (threshold − score) × 2)
        Medium (revenue-driven) : 80
        Medium (score-driven)   : max(60, 85 − |score − 50|)
        """
        if risk_level == "High":
            return min(100, 70 + (risk_score - self.HIGH_SCORE_THRESHOLD) * 2)

        if risk_level == "Low":
            return min(100, 70 + (self.LOW_SCORE_THRESHOLD - risk_score) * 2)

        # Medium
        if revenue < self.REVENUE_FLOOR:
            return 80  # revenue rule is unambiguous
        return max(60, 85 - abs(risk_score - 50))
