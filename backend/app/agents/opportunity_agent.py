"""
opportunity_agent.py
--------------------
Standalone OpportunityAgent that derives an opportunity score and customer
segment from three customer attributes: revenue, products, and industry.

Scoring rules
-------------
Base score : 50 (every customer starts here)

Additive bonuses (applied independently, then capped at 100)
  +20  Revenue > $5 M          — high revenue signals upsell capacity
  +20  Active products < 3     — shallow product relationship, cross-sell gap
  +10  Industry == "Technology" — sector shows above-average adoption rates

Segment assignment (derived from revenue alone)
  "Enterprise"  revenue >= $7 M
  "Growth"      revenue >= $3 M
  "Emerging"    revenue <  $3 M

Confidence formula (deterministic)
-----------------------------------
  confidence = min(100, 65 + active_drivers × 10)

  active_drivers is the count of bonuses that fired (0–3):
    0 drivers → 65  (base score only — weak signal)
    1 driver  → 75
    2 drivers → 85
    3 drivers → 95

Output schema
-------------
{
    "opportunity_score" : int   (0–100),
    "segment"           : str   ("Enterprise" | "Growth" | "Emerging"),
    "confidence"        : int   (0–100),
    "reason"            : str
}
"""

from __future__ import annotations

from typing import Any


class OpportunityAgent:
    """Scores customer opportunity and assigns a segment deterministically."""

    name = "OpportunityAgent"

    # ── Scoring constants ─────────────────────────────────────────────────
    BASE_SCORE: int = 50
    REVENUE_UPSELL_THRESHOLD: float = 5_000_000
    REVENUE_UPSELL_POINTS: int = 20
    CROSS_SELL_PRODUCT_LIMIT: int = 3
    CROSS_SELL_POINTS: int = 20
    TECH_BONUS_POINTS: int = 10
    MAX_SCORE: int = 100

    # ── Segment thresholds ────────────────────────────────────────────────
    ENTERPRISE_THRESHOLD: float = 7_000_000
    GROWTH_THRESHOLD: float = 3_000_000

    # ── Confidence constants ──────────────────────────────────────────────
    CONFIDENCE_BASE: int = 65
    CONFIDENCE_PER_DRIVER: int = 10

    # ── Public interface ──────────────────────────────────────────────────

    def run(self, customer: dict[str, Any]) -> dict[str, Any]:
        """
        Compute opportunity score, segment, and confidence for one customer.

        Parameters
        ----------
        customer : dict
            Customer record.  Expected keys:
              - ``revenue``   (float)      annual revenue in USD
              - ``products``  (list[str])  active products held
              - ``industry``  (str)        sector label
              - ``name``      (str)        used in the reason string

        Returns
        -------
        dict
            ``{"opportunity_score": int, "segment": str,
               "confidence": int, "reason": str}``
        """
        revenue: float = float(customer.get("revenue") or 0)
        products: list[str] = customer.get("products") or []
        industry: str = customer.get("industry", "")
        name: str = customer.get("name", "Customer")
        product_count: int = len(products) if isinstance(products, list) else 0

        score, drivers = self._score(revenue, product_count, industry)
        segment = self._segment(revenue)
        confidence = self._confidence(drivers)
        reason = self._reason(
            name, score, segment, revenue, product_count, industry, drivers
        )

        return {
            "opportunity_score": score,
            "segment": segment,
            "confidence": confidence,
            "reason": reason,
        }

    # ── Private helpers ───────────────────────────────────────────────────

    def _score(
        self,
        revenue: float,
        product_count: int,
        industry: str,
    ) -> tuple[int, list[str]]:
        """
        Calculate the opportunity score and collect the active bonus drivers.

        Returns
        -------
        tuple[int, list[str]]
            (final_score, list_of_driver_descriptions)
        """
        score: int = self.BASE_SCORE
        drivers: list[str] = []

        if revenue > self.REVENUE_UPSELL_THRESHOLD:
            score += self.REVENUE_UPSELL_POINTS
            drivers.append(
                f"revenue of ${revenue:,.0f} exceeds the "
                f"${self.REVENUE_UPSELL_THRESHOLD:,.0f} upsell threshold"
            )

        if product_count < self.CROSS_SELL_PRODUCT_LIMIT:
            score += self.CROSS_SELL_POINTS
            drivers.append(
                f"only {product_count} active product(s) — "
                f"cross-sell gap below the {self.CROSS_SELL_PRODUCT_LIMIT}-product threshold"
            )

        if industry == "Technology":
            score += self.TECH_BONUS_POINTS
            drivers.append(
                "Technology sector shows above-average service-adoption rates"
            )

        return min(score, self.MAX_SCORE), drivers

    def _segment(self, revenue: float) -> str:
        """Assign a segment label based on revenue bands."""
        if revenue >= self.ENTERPRISE_THRESHOLD:
            return "Enterprise"
        if revenue >= self.GROWTH_THRESHOLD:
            return "Growth"
        return "Emerging"

    def _confidence(self, drivers: list[str]) -> int:
        """
        Return a deterministic confidence score based on active driver count.

        Each bonus signal that fired adds CONFIDENCE_PER_DRIVER points to
        the CONFIDENCE_BASE.  More signals = stronger evidence = higher
        confidence in the opportunity assessment.

            0 drivers → 65
            1 driver  → 75
            2 drivers → 85
            3 drivers → 95
        """
        return min(
            100, self.CONFIDENCE_BASE + len(drivers) * self.CONFIDENCE_PER_DRIVER
        )

    def _reason(
        self,
        name: str,
        score: int,
        segment: str,
        revenue: float,
        product_count: int,
        industry: str,
        drivers: list[str],
    ) -> str:
        """Build a human-readable explanation of the score and segment."""
        if not drivers:
            driver_text = (
                f"no bonus signals were detected — base score of "
                f"{self.BASE_SCORE} applied"
            )
        elif len(drivers) == 1:
            driver_text = drivers[0]
        else:
            driver_text = ", ".join(drivers[:-1]) + f", and {drivers[-1]}"

        return (
            f"{name} is a {segment} segment customer "
            f"(revenue ${revenue:,.0f}) with an opportunity score of {score}/100. "
            f"Score driven by: {driver_text}. "
            f"{'Significant' if score >= 80 else 'Moderate' if score >= 60 else 'Limited'} "
            f"near-term engagement potential."
        )
