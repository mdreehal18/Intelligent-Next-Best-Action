"""
decision_score.py
-----------------
Combines the individual confidence scores produced by RiskAgent,
OpportunityAgent, and ProductRecommendationAgent into one overall
AI decision confidence figure.

Formula (fully deterministic)
------------------------------
  weighted = 0.35 × risk_confidence
           + 0.30 × opportunity_confidence
           + 0.35 × product_confidence

  adjustment:
    +3   if all three inputs are ≥ 80  (signals converge strongly)
    −3   if spread (max − min) > 30    (signals diverge, lower trust)

  decision_confidence = clamp(round(weighted + adjustment), 0, 100)

Weight rationale
----------------
  Risk (35 %)     — foundational: an unreliable risk read makes the
                    whole recommendation suspect.
  Product (35 %)  — primary output: how confident the product layer is
                    in the chosen action.
  Opportunity (30 %) — contextual: shapes the recommendation but is
                        secondary to the direct risk/action signals.

Calibration check (sample customers)
--------------------------------------
  CUST003 GreenTech — risk 94, opp 95, product 85
    weighted   = 0.35×94 + 0.30×95 + 0.35×85 = 91.15
    adjustment = +3  (all ≥ 80, spread = 10)
    result     = round(94.15) = 94  ✓

  CUST002 Priya Foods — risk 78, opp 75, product 88
    weighted   = 0.35×78 + 0.30×75 + 0.35×88 = 80.6
    adjustment =  0  (78 and 75 are below 80 floor)
    result     = 81

  CUST001 Rahul Sharma — risk 80, opp 75, product 83
    weighted   = 0.35×80 + 0.30×75 + 0.35×83 = 79.55
    adjustment =  0  (75 < 80)
    result     = 80

Public API
----------
  compute_decision_score(risk_confidence, opportunity_confidence,
                         product_confidence)        → {"decision_confidence": int}

  from_agent_results(risk_result, opportunity_result,
                     product_result)                → {"decision_confidence": int}
"""

from __future__ import annotations

from typing import Any

# ── Weights ───────────────────────────────────────────────────────────────────

_WEIGHT_RISK: float = 0.35
_WEIGHT_OPPORTUNITY: float = 0.30
_WEIGHT_PRODUCT: float = 0.35

# Adjustment thresholds
_CONVERGENCE_FLOOR: int = 80  # all three must reach this to earn the bonus
_CONVERGENCE_BONUS: int = 3
_DIVERGENCE_CEILING: int = 30  # max − min above this triggers the penalty
_DIVERGENCE_PENALTY: int = 3


# ── Core computation ──────────────────────────────────────────────────────────


def compute_decision_score(
    risk_confidence: int | float,
    opportunity_confidence: int | float,
    product_confidence: int | float,
) -> dict[str, int]:
    """
    Combine three agent confidence scores into one overall AI confidence.

    Parameters
    ----------
    risk_confidence        : int | float   Confidence from RiskAgent (0–100).
    opportunity_confidence : int | float   Confidence from OpportunityAgent (0–100).
    product_confidence     : int | float   Confidence from ProductRecommendationAgent (0–100).

    Returns
    -------
    dict
        ``{"decision_confidence": int}``  — value clamped to 0–100.

    Examples
    --------
    >>> compute_decision_score(94, 95, 85)
    {"decision_confidence": 94}

    >>> compute_decision_score(78, 75, 88)
    {"decision_confidence": 81}
    """
    risk = _clamp(risk_confidence)
    opp = _clamp(opportunity_confidence)
    prod = _clamp(product_confidence)

    weighted: float = (
        _WEIGHT_RISK * risk + _WEIGHT_OPPORTUNITY * opp + _WEIGHT_PRODUCT * prod
    )

    adjustment: int = _adjustment(risk, opp, prod)

    decision_confidence = _clamp(round(weighted + adjustment))

    return {"decision_confidence": decision_confidence}


def from_agent_results(
    risk_result: dict[str, Any],
    opportunity_result: dict[str, Any],
    product_result: dict[str, Any],
) -> dict[str, int]:
    """
    Extract confidence values from agent output dicts and compute the
    overall decision score.

    Convenience wrapper around ``compute_decision_score`` — pass the
    raw dicts returned by each agent's ``.run()`` method directly.

    Parameters
    ----------
    risk_result        : dict   Output of ``RiskAgent.run()``.
    opportunity_result : dict   Output of ``OpportunityAgent.run()``.
    product_result     : dict   Output of ``ProductRecommendationAgent.run()``.

    Returns
    -------
    dict
        ``{"decision_confidence": int}``

    Examples
    --------
    ::

        from app.services.decision_score import from_agent_results

        score = from_agent_results(
            risk_agent.run(customer),
            opportunity_agent.run(customer),
            product_agent.run(customer),
        )
        # {"decision_confidence": 94}
    """
    return compute_decision_score(
        risk_confidence=int(risk_result.get("confidence") or 0),
        opportunity_confidence=int(opportunity_result.get("confidence") or 0),
        product_confidence=int(product_result.get("confidence") or 0),
    )


# ── Private helpers ───────────────────────────────────────────────────────────


def _adjustment(risk: int, opp: int, prod: int) -> int:
    """
    Return a small integer adjustment based on signal convergence.

    Rules (mutually exclusive — highest-priority rule wins)
    -------------------------------------------------------
    +3  All three inputs ≥ CONVERGENCE_FLOOR (80) → signals converge strongly.
    −3  Spread (max − min) > DIVERGENCE_CEILING (30) → signals conflict.
     0  Neither condition met.
    """
    scores = [risk, opp, prod]

    if all(s >= _CONVERGENCE_FLOOR for s in scores):
        return _CONVERGENCE_BONUS

    if (max(scores) - min(scores)) > _DIVERGENCE_CEILING:
        return -_DIVERGENCE_PENALTY

    return 0


def _clamp(value: int | float) -> int:
    """Clamp *value* to the closed interval [0, 100] and return an int."""
    return max(0, min(100, int(value)))
