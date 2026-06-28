"""
explanation_agent.py
--------------------
Standalone ExplanationAgent that synthesises the outputs of the three
upstream agents into a single natural-language explanation, a concise
next-best-action string, and its own confidence score.

Input
-----
  risk_result        : {"risk_level": str, "risk_score": int, "reason": str}
  opportunity_result : {"opportunity_score": int, "segment": str, "reason": str}
  product_result     : {"recommended_product": str, "confidence": int, "reason": str}
  customer           : optional {"name": str, …}  — used for personalisation

Sentence pattern selection (deterministic)
------------------------------------------
  A  risk_level == "High"
       → urgency-first; risk drives the narrative
  B  risk_level == "Low"  AND  opportunity_score >= 70
       → strength-first; positive signals lead
  C  opportunity_score < 50
       → conservative; limited opportunity acknowledged
  D  everything else (Medium risk, moderate opportunity)
       → balanced; both signals weighed

Confidence formula (deterministic)
-----------------------------------
  score  = 0
  + 30   for each valid upstream result (risk_level, opportunity_score,
           recommended_product) — max 90 from completeness
  + 10   if |risk_score − 50| > 25  (signal is clearly classified)
  + 5    if |risk_score − 50| > 15  (moderately clear)

  confidence = min(100, score)

  All three valid + clearly classified signal → 100
  All three valid + ambiguous signal          →  90–95
  Two valid                                   →  60–75

Output schema
-------------
{
    "explanation"      : str   — full natural-language paragraph
    "next_best_action" : str   — concise one-line action directive
    "confidence"       : int   — 0–100
}
"""

from __future__ import annotations

from typing import Any


class ExplanationAgent:
    """Converts structured agent outputs into readable natural language."""

    name = "ExplanationAgent"

    # ── Thresholds for pattern selection ─────────────────────────────────
    HIGH_OPP_THRESHOLD: int = 70
    LOW_OPP_THRESHOLD: int = 50

    # ── Vocabulary maps ───────────────────────────────────────────────────

    _SEGMENT_PHRASE: dict[str, str] = {
        "Enterprise": "a high-value Enterprise customer",
        "Growth": "a Growth segment customer",
        "Emerging": "an Emerging segment customer",
    }

    _RISK_PHRASE: dict[str, str] = {
        "Low": "a strong risk profile",
        "Medium": "a moderate risk profile",
        "High": "an elevated risk profile",
    }

    _OPP_PHRASE: dict[str, str] = {
        "high": "strong cross-sell and upsell potential",
        "medium": "moderate near-term growth opportunity",
        "low": "limited near-term engagement opportunity",
    }

    # ── Public interface ──────────────────────────────────────────────────

    def run(
        self,
        risk_result: dict[str, Any],
        opportunity_result: dict[str, Any],
        product_result: dict[str, Any],
        customer: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Generate a natural-language explanation from three agent results.

        Parameters
        ----------
        risk_result : dict
            Output of RiskAgent.
            Required keys: ``risk_level`` (str), ``risk_score`` (int).
        opportunity_result : dict
            Output of OpportunityAgent.
            Required keys: ``opportunity_score`` (int), ``segment`` (str).
        product_result : dict
            Output of ProductRecommendationAgent.
            Required keys: ``recommended_product`` (str), ``confidence`` (int).
        customer : dict, optional
            Raw customer record.  Only ``name`` is used; falls back to
            "This customer" when absent.

        Returns
        -------
        dict
            ``{"explanation": str, "next_best_action": str, "confidence": int}``
        """
        name: str = (customer or {}).get("name") or "This customer"
        risk_level: str = risk_result.get("risk_level", "Medium")
        risk_score: int = int(risk_result.get("risk_score") or 0)
        opp_score: int = int(opportunity_result.get("opportunity_score") or 0)
        segment: str = opportunity_result.get("segment", "Emerging")
        product: str = product_result.get("recommended_product", "a tailored product")
        product_conf: int = int(product_result.get("confidence") or 0)

        explanation = self._build_explanation(
            name, risk_level, risk_score, opp_score, segment, product, product_conf
        )
        next_best_action = self._build_action(
            name, product, risk_level, risk_score, opp_score, product_conf
        )
        confidence = self._confidence(
            risk_result, opportunity_result, product_result, risk_score
        )

        return {
            "explanation": explanation,
            "next_best_action": next_best_action,
            "confidence": confidence,
        }

    # ── Private: component builders ───────────────────────────────────────

    def _build_explanation(
        self,
        name: str,
        risk_level: str,
        risk_score: int,
        opp_score: int,
        segment: str,
        product: str,
        product_conf: int,
    ) -> str:
        """Select a sentence pattern and assemble the explanation paragraph."""

        seg_phrase = self._SEGMENT_PHRASE.get(segment, f"a {segment} segment customer")
        risk_phrase = self._RISK_PHRASE.get(risk_level, "an uncertain risk profile")
        opp_key = self._opp_key(opp_score)
        opp_phrase = self._OPP_PHRASE[opp_key]
        conf_phrase = self._confidence_qualifier(product_conf)

        # ── Pattern A: High risk → urgency leads ──────────────────────────
        if risk_level == "High":
            return (
                f"{name} is {seg_phrase} with an elevated risk score of {risk_score}. "
                f"Although they show {opp_phrase}, the risk profile requires immediate "
                f"attention. '{product}' is recommended {conf_phrase} to establish "
                f"proactive monitoring and reduce financial exposure."
            )

        # ── Pattern B: Low risk + strong opportunity → strength leads ─────
        if risk_level == "Low" and opp_score >= self.HIGH_OPP_THRESHOLD:
            return (
                f"{name} is {seg_phrase} combining {risk_phrase} (score: {risk_score}) "
                f"with {opp_phrase} (score: {opp_score}). "
                f"This strong profile makes them well-suited for '{product}', "
                f"recommended {conf_phrase}."
            )

        # ── Pattern C: Low opportunity → conservative tone ────────────────
        if opp_score < self.LOW_OPP_THRESHOLD:
            return (
                f"{name} is {seg_phrase} with {risk_phrase} (score: {risk_score}). "
                f"Near-term engagement opportunity is limited (score: {opp_score}). "
                f"'{product}' best fits their current profile and is recommended "
                f"{conf_phrase}."
            )

        # ── Pattern D: Balanced — default ─────────────────────────────────
        return (
            f"{name} is {seg_phrase} presenting {risk_phrase} (score: {risk_score}) "
            f"and {opp_phrase} (score: {opp_score}). "
            f"Weighing both signals, '{product}' aligns with their needs and is "
            f"recommended {conf_phrase}."
        )

    @staticmethod
    def _build_action(
        name: str,
        product: str,
        risk_level: str,
        risk_score: int,
        opp_score: int,
        product_conf: int,
    ) -> str:
        """Build a concise one-line action directive."""
        return (
            f"Engage {name} with '{product}'. "
            f"Risk: {risk_level} ({risk_score}) · "
            f"Opportunity: {opp_score}/100 · "
            f"Confidence: {product_conf}%."
        )

    def _confidence(
        self,
        risk_result: dict[str, Any],
        opportunity_result: dict[str, Any],
        product_result: dict[str, Any],
        risk_score: int,
    ) -> int:
        """
        Return a deterministic confidence score for the explanation (0–100).

        Scoring
        -------
        + 30  risk_level is present in upstream result
        + 30  opportunity_score is present in upstream result
        + 30  recommended_product is present in upstream result
        + 10  |risk_score − 50| > 25  (signal clearly classified)
        + 5   |risk_score − 50| > 15  (moderately clear)

        The completeness component awards up to 90 points; the clarity
        bonus awards up to 10, for a maximum of 100.
        """
        score = 0

        # Completeness: each valid upstream result contributes 30 points
        if risk_result.get("risk_level"):
            score += 30
        if opportunity_result.get("opportunity_score") is not None:
            score += 30
        if product_result.get("recommended_product"):
            score += 30

        # Clarity: how far is risk_score from the ambiguous centre (50)?
        distance = abs(risk_score - 50)
        if distance > 25:
            score += 10  # clearly in High or Low territory
        elif distance > 15:
            score += 5  # noticeably off-centre

        return min(100, score)

    # ── Private: vocabulary helpers ───────────────────────────────────────

    def _opp_key(self, opp_score: int) -> str:
        if opp_score >= self.HIGH_OPP_THRESHOLD:
            return "high"
        if opp_score >= self.LOW_OPP_THRESHOLD:
            return "medium"
        return "low"

    @staticmethod
    def _confidence_qualifier(confidence: int) -> str:
        if confidence >= 90:
            return "with very high confidence"
        if confidence >= 80:
            return "with high confidence"
        if confidence >= 70:
            return "with moderate confidence"
        return "as the best available option"
