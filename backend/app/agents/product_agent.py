"""
product_agent.py
----------------
Standalone ProductRecommendationAgent that selects the best-fit product
for a customer by layering four signals in priority order:

  1. Risk override     risk_score > 70  → Risk Monitoring Program (88 % confidence)
  2. Revenue upgrade   revenue >= $7 M  → Corporate Credit Line   (85 %)
  3. Revenue support   revenue <  $2 M  → Working Capital Loan    (83 %)
  4. Industry default  industry match   → sector-specific list    (90 / 78 / 70 %)

Within each layer the agent skips any product the customer already holds
(case-insensitive match) and falls through to the next candidate.

Industry → product priority lists
----------------------------------
  Retail        →  Business Credit Card  »  Merchant Cash Advance  »  Working Capital Loan
  Manufacturing →  Working Capital Loan  »  Equipment Finance      »  Trade Finance
  Technology    →  Trade Finance         »  Corporate Credit Line  »  Business Credit Card

Output schema
-------------
{
    "recommended_product" : str,
    "confidence"          : int   (0–100),
    "reason"              : str
}
"""

from __future__ import annotations

from typing import Any


class ProductRecommendationAgent:
    """Recommends the next-best product using deterministic layered rules."""

    name = "ProductRecommendationAgent"

    # ── Product catalogue ─────────────────────────────────────────────────

    # Ordered priority lists per industry (highest fit → lowest fit)
    INDUSTRY_CATALOGUE: dict[str, list[str]] = {
        "Retail": [
            "Business Credit Card",
            "Merchant Cash Advance",
            "Working Capital Loan",
        ],
        "Manufacturing": ["Working Capital Loan", "Equipment Finance", "Trade Finance"],
        "Technology": [
            "Trade Finance",
            "Corporate Credit Line",
            "Business Credit Card",
        ],
    }

    # Fallback list used when industry is not recognised
    DEFAULT_CATALOGUE: list[str] = [
        "Business Credit Card",
        "Working Capital Loan",
        "Corporate Credit Line",
    ]

    # Override products triggered by risk / revenue signals
    RISK_PRODUCT: str = "Risk Monitoring Program"
    ENTERPRISE_PRODUCT: str = "Corporate Credit Line"
    CASH_FLOW_PRODUCT: str = "Working Capital Loan"

    # ── Thresholds ────────────────────────────────────────────────────────
    HIGH_RISK_THRESHOLD: int = 70
    ENTERPRISE_THRESHOLD: float = 7_000_000
    LOW_REVENUE_THRESHOLD: float = 2_000_000

    # Confidence scores by trigger type
    _CONFIDENCE: dict[str, int] = {
        "risk": 88,
        "enterprise": 85,
        "cash_flow": 83,
        "industry_0": 90,  # first pick from industry list
        "industry_1": 78,  # second pick
        "industry_2": 70,  # third pick
        "fallback": 60,
    }

    # ── Public interface ──────────────────────────────────────────────────

    def run(self, customer: dict[str, Any]) -> dict[str, Any]:
        """
        Recommend a product for one customer.

        Parameters
        ----------
        customer : dict
            Customer record.  Expected keys:
              - ``industry``    (str)
              - ``products``    (list[str])  currently held products
              - ``risk_score``  (int)
              - ``revenue``     (float)
              - ``name``        (str)

        Returns
        -------
        dict
            ``{"recommended_product": str, "confidence": int, "reason": str}``
        """
        name: str = customer.get("name", "Customer")
        industry: str = customer.get("industry", "")
        risk_score: int = int(customer.get("risk_score") or 0)
        revenue: float = float(customer.get("revenue") or 0)
        raw_products: list[str] = customer.get("products") or []

        # Normalise owned products once for O(1) membership tests
        owned: set[str] = {p.strip().lower() for p in raw_products if p}

        product, confidence, reason = self._select(
            name, industry, risk_score, revenue, owned
        )

        return {
            "recommended_product": product,
            "confidence": confidence,
            "reason": reason,
        }

    # ── Private helpers ───────────────────────────────────────────────────

    def _select(
        self,
        name: str,
        industry: str,
        risk_score: int,
        revenue: float,
        owned: set[str],
    ) -> tuple[str, int, str]:
        """
        Apply the four-layer selection logic and return
        (recommended_product, confidence, reason).
        """

        # ── Layer 1: Risk override ────────────────────────────────────────
        if risk_score > self.HIGH_RISK_THRESHOLD:
            if self.RISK_PRODUCT.lower() not in owned:
                return (
                    self.RISK_PRODUCT,
                    self._CONFIDENCE["risk"],
                    (
                        f"{name} has a high risk score of {risk_score} "
                        f"(threshold: {self.HIGH_RISK_THRESHOLD}). "
                        f"'{self.RISK_PRODUCT}' is recommended to establish "
                        "proactive monitoring and reduce exposure."
                    ),
                )

        # ── Layer 2: Enterprise revenue upgrade ───────────────────────────
        if revenue >= self.ENTERPRISE_THRESHOLD:
            if self.ENTERPRISE_PRODUCT.lower() not in owned:
                return (
                    self.ENTERPRISE_PRODUCT,
                    self._CONFIDENCE["enterprise"],
                    (
                        f"{name} is an Enterprise customer with revenue of "
                        f"${revenue:,.0f}. A '{self.ENTERPRISE_PRODUCT}' provides "
                        "the flexible financing capacity suited to this scale."
                    ),
                )

        # ── Layer 3: Low-revenue cash-flow support ────────────────────────
        if revenue < self.LOW_REVENUE_THRESHOLD:
            if self.CASH_FLOW_PRODUCT.lower() not in owned:
                return (
                    self.CASH_FLOW_PRODUCT,
                    self._CONFIDENCE["cash_flow"],
                    (
                        f"{name} has revenue of ${revenue:,.0f}, below the "
                        f"${self.LOW_REVENUE_THRESHOLD:,.0f} stability threshold. "
                        f"A '{self.CASH_FLOW_PRODUCT}' addresses near-term "
                        "liquidity and working-capital needs."
                    ),
                )

        # ── Layer 4: Industry-based recommendation ────────────────────────
        catalogue = self.INDUSTRY_CATALOGUE.get(industry, self.DEFAULT_CATALOGUE)

        for idx, product in enumerate(catalogue):
            if product.lower() not in owned:
                confidence_key = f"industry_{idx}" if idx < 3 else "fallback"
                return (
                    product,
                    self._CONFIDENCE.get(confidence_key, self._CONFIDENCE["fallback"]),
                    self._industry_reason(name, industry, product, idx, catalogue),
                )

        # ── Fallback: all catalogue products already held ─────────────────
        return (
            "Comprehensive Account Review",
            self._CONFIDENCE["fallback"],
            (
                f"{name} already holds all recommended products for the "
                f"{industry or 'assigned'} sector. "
                "A full account review is advised to identify emerging needs."
            ),
        )

    @staticmethod
    def _industry_reason(
        name: str,
        industry: str,
        product: str,
        rank: int,
        catalogue: list[str],
    ) -> str:
        """Build an industry-match reason string."""
        rank_label = {0: "primary", 1: "secondary", 2: "tertiary"}.get(
            rank, "next available"
        )
        already_held = catalogue[:rank]

        base = (
            f"'{product}' is the {rank_label} recommendation for "
            f"{industry or 'this'} sector customers."
        )

        if already_held:
            held_str = " and ".join(f"'{p}'" for p in already_held)
            base += (
                f" {held_str} {'are' if len(already_held) > 1 else 'is'} already held."
            )

        return f"{name}: {base}"
