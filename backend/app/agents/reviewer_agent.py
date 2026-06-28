"""
reviewer_agent.py
-----------------
ReviewerAgent receives the final recommendation produced by the agent
pipeline and validates it across three categories before it reaches
the frontend or is persisted.

Validation categories
---------------------
1. Missing fields
   Every required key must be present and non-None in the recommendation.

2. Consistency
   Cross-field logic must hold:
     • risk_score > 70   → risk_level must be "High"
     • 30 ≤ risk_score ≤ 70 → risk_level must NOT be "High" or "Low"
     • All scores (risk_score, opportunity_score, confidence) must be 0–100
     • priority == "High" → opportunity_score must be ≥ 60
     • priority == "Low"  → opportunity_score must be ≤ 80
     • opportunity_level (when present) must agree with opportunity_score

3. Confidence
   confidence < MIN_CONFIDENCE (70) → needs review regardless of other checks.

Output schema
-------------
{
    "status" : "approved" | "needs_review",
    "reason" : str,
    "issues" : list[str]   — [] on approval; individual problem strings otherwise
}
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# ── Internal result type ──────────────────────────────────────────────────────


@dataclass
class _Issue:
    category: str  # "missing_field" | "consistency" | "confidence"
    detail: str


# ── Agent ─────────────────────────────────────────────────────────────────────


class ReviewerAgent:
    """Validates a final recommendation and returns approved or needs_review."""

    name = "ReviewerAgent"

    # ── Required fields ───────────────────────────────────────────────────
    REQUIRED_FIELDS: list[str] = [
        "customer_id",
        "customer_name",
        "risk_level",
        "risk_score",
        "opportunity_score",
        "confidence",
    ]

    # At least one of these must be present for a product to exist
    PRODUCT_FIELDS: list[str] = [
        "recommended_action",
        "recommended_product",
    ]

    # ── Thresholds ────────────────────────────────────────────────────────
    MIN_CONFIDENCE: int = 70  # below → confidence failure
    SCORE_MIN: int = 0
    SCORE_MAX: int = 100
    HIGH_RISK_THRESHOLD: int = 70  # mirrors RiskAgent
    LOW_RISK_THRESHOLD: int = 30  # mirrors RiskAgent
    HIGH_PRIORITY_MIN_OPP: int = 60  # "High" priority needs opp ≥ this
    LOW_PRIORITY_MAX_OPP: int = 80  # "Low"  priority needs opp ≤ this
    HIGH_OPP_LEVEL_MIN: int = 70  # "High" opp level needs score ≥ this
    MED_OPP_LEVEL_MIN: int = 50  # "Medium" opp level needs score ≥ this

    # ── Public interface ──────────────────────────────────────────────────

    def run(self, recommendation: dict[str, Any]) -> dict[str, Any]:
        """
        Validate *recommendation* and return the review verdict.

        Parameters
        ----------
        recommendation : dict
            Final recommendation dict — typically the output of
            ``AgentOrchestrator.run()`` or ``DecisionGraph.run()``.

        Returns
        -------
        dict
            ::

                {
                    "status" : "approved" | "needs_review",
                    "reason" : str,
                    "issues" : list[str]
                }
        """
        issues: list[_Issue] = []

        issues.extend(self._check_missing_fields(recommendation))
        issues.extend(self._check_confidence(recommendation))
        issues.extend(self._check_consistency(recommendation))

        if not issues:
            return {
                "status": "approved",
                "reason": (
                    "All validation checks passed — "
                    "recommendation is complete, consistent, and confident."
                ),
                "issues": [],
            }

        issue_strings = [i.detail for i in issues]
        reason = self._summarise(issues)

        return {
            "status": "needs_review",
            "reason": reason,
            "issues": issue_strings,
        }

    # ── Private: check — missing fields ───────────────────────────────────

    def _check_missing_fields(
        self,
        rec: dict[str, Any],
    ) -> list[_Issue]:
        issues: list[_Issue] = []

        for key in self.REQUIRED_FIELDS:
            if rec.get(key) is None:
                issues.append(
                    _Issue(
                        category="missing_field",
                        detail=f"Required field '{key}' is missing or null.",
                    )
                )

        # At least one product field must exist
        if not any(rec.get(f) for f in self.PRODUCT_FIELDS):
            issues.append(
                _Issue(
                    category="missing_field",
                    detail=(
                        "No product recommendation found. "
                        f"Expected at least one of: {', '.join(self.PRODUCT_FIELDS)}."
                    ),
                )
            )

        return issues

    # ── Private: check — confidence ───────────────────────────────────────

    def _check_confidence(
        self,
        rec: dict[str, Any],
    ) -> list[_Issue]:
        confidence = rec.get("confidence")
        if confidence is None:
            return []  # already caught by missing-fields check

        confidence = int(confidence)
        if confidence < self.MIN_CONFIDENCE:
            return [
                _Issue(
                    category="confidence",
                    detail=(
                        f"Confidence of {confidence}% is below the minimum threshold "
                        f"of {self.MIN_CONFIDENCE}%. Human review required before acting."
                    ),
                )
            ]
        return []

    # ── Private: check — consistency ──────────────────────────────────────

    def _check_consistency(
        self,
        rec: dict[str, Any],
    ) -> list[_Issue]:
        issues: list[_Issue] = []

        risk_score: int | None = rec.get("risk_score")
        risk_level: str | None = rec.get("risk_level")
        opp_score: int | None = rec.get("opportunity_score")
        opp_level: str | None = rec.get("opportunity_level")
        priority: str | None = rec.get("priority")

        # ── Score ranges ──────────────────────────────────────────────────
        for field_name in ("risk_score", "opportunity_score", "confidence"):
            val = rec.get(field_name)
            if val is not None:
                val = int(val)
                if not (self.SCORE_MIN <= val <= self.SCORE_MAX):
                    issues.append(
                        _Issue(
                            category="consistency",
                            detail=(
                                f"'{field_name}' value of {val} is outside the "
                                f"valid range [{self.SCORE_MIN}, {self.SCORE_MAX}]."
                            ),
                        )
                    )

        # ── risk_score ↔ risk_level ────────────────────────────────────────
        if risk_score is not None and risk_level:
            rs = int(risk_score)
            if rs > self.HIGH_RISK_THRESHOLD and risk_level != "High":
                issues.append(
                    _Issue(
                        category="consistency",
                        detail=(
                            f"risk_score of {rs} exceeds {self.HIGH_RISK_THRESHOLD} "
                            f"but risk_level is '{risk_level}' — expected 'High'."
                        ),
                    )
                )
            elif (
                self.LOW_RISK_THRESHOLD <= rs <= self.HIGH_RISK_THRESHOLD
                and risk_level in ("High", "Low")
            ):
                issues.append(
                    _Issue(
                        category="consistency",
                        detail=(
                            f"risk_score of {rs} is in the medium band "
                            f"({self.LOW_RISK_THRESHOLD}–{self.HIGH_RISK_THRESHOLD}) "
                            f"but risk_level is '{risk_level}' — expected 'Medium'."
                        ),
                    )
                )

        # ── opportunity_score ↔ opportunity_level ─────────────────────────
        if opp_score is not None and opp_level:
            os = int(opp_score)
            if opp_level == "High" and os < self.HIGH_OPP_LEVEL_MIN:
                issues.append(
                    _Issue(
                        category="consistency",
                        detail=(
                            f"opportunity_level is 'High' but opportunity_score "
                            f"is only {os} (expected ≥ {self.HIGH_OPP_LEVEL_MIN})."
                        ),
                    )
                )
            elif opp_level == "Low" and os >= self.MED_OPP_LEVEL_MIN:
                issues.append(
                    _Issue(
                        category="consistency",
                        detail=(
                            f"opportunity_level is 'Low' but opportunity_score "
                            f"is {os} (expected < {self.MED_OPP_LEVEL_MIN})."
                        ),
                    )
                )

        # ── priority ↔ opportunity_score ──────────────────────────────────
        if priority and opp_score is not None:
            os = int(opp_score)
            if priority == "High" and os < self.HIGH_PRIORITY_MIN_OPP:
                issues.append(
                    _Issue(
                        category="consistency",
                        detail=(
                            f"priority is 'High' but opportunity_score is {os} "
                            f"(expected ≥ {self.HIGH_PRIORITY_MIN_OPP} for high priority)."
                        ),
                    )
                )
            elif priority == "Low" and os > self.LOW_PRIORITY_MAX_OPP:
                issues.append(
                    _Issue(
                        category="consistency",
                        detail=(
                            f"priority is 'Low' but opportunity_score is {os} "
                            f"(expected ≤ {self.LOW_PRIORITY_MAX_OPP} for low priority)."
                        ),
                    )
                )

        return issues

    # ── Private: reason summary ───────────────────────────────────────────

    @staticmethod
    def _summarise(issues: list[_Issue]) -> str:
        """
        Build a concise human-readable summary from the collected issues.

        Groups issues by category so the reader sees the dominant problem
        first, followed by secondary concerns.
        """
        by_category: dict[str, list[str]] = {}
        for issue in issues:
            by_category.setdefault(issue.category, []).append(issue.detail)

        parts: list[str] = []

        # Confidence failure is the most actionable — surface it first
        for cat in ("confidence", "missing_field", "consistency"):
            items = by_category.get(cat, [])
            if items:
                parts.extend(items)

        # One sentence per issue, joined with a space
        return " ".join(parts)
