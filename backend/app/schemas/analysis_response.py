"""
analysis_response.py
--------------------
Pydantic v2 response schema for the /analysis/{customer_id} endpoint.

Defines the exact JSON contract surfaced to the frontend:

    {
      "customer":       {"id": "CUST001", "name": "Rahul Sharma"},
      "risk":           {"level": "Medium", "confidence": 91},
      "opportunity":    {"score": 74, "confidence": 88},
      "recommendation": {"product": "Business Loan", "priority": "Medium"},
      "conflict":       {"status": "Resolved"},
      "review":         {"status": "Approved"},
      "explanation":    "...",
      "audit_id":       "...",
      "workflow":       [...]
    }

Usage
-----
  from app.schemas.analysis_response import AnalysisResponse, format_response

  # Wrap raw orchestrator output
  response = format_response(orchestrator.run(customer))

  # FastAPI endpoint
  @router.get("/analysis/{customer_id}", response_model=AnalysisResponse)
  def analysis(customer_id: str): ...
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# ─────────────────────────────────────────────────────────────────────────────
# Nested schemas
# ─────────────────────────────────────────────────────────────────────────────


class CustomerSchema(BaseModel):
    """Customer identity fields."""

    id: str = Field(..., description="Unique customer identifier.")
    name: str = Field(..., description="Customer display name.")


class RiskSchema(BaseModel):
    """Risk assessment output."""

    level: str = Field(..., description="'High' | 'Medium' | 'Low'")
    confidence: int = Field(
        ..., ge=0, le=100, description="Agent confidence in the classification (0–100)."
    )


class OpportunitySchema(BaseModel):
    """Opportunity assessment output."""

    score: int = Field(
        ..., ge=0, le=100, description="Opportunity score produced by OpportunityAgent."
    )
    confidence: int = Field(
        ..., ge=0, le=100, description="Agent confidence in the score (0–100)."
    )


class RecommendationSchema(BaseModel):
    """Product recommendation output."""

    product: str = Field(..., description="Recommended product or action.")
    priority: str = Field(..., description="'High' | 'Medium' | 'Low'")


class ConflictSchema(BaseModel):
    """Conflict resolution output."""

    status: str = Field(
        ...,
        description=(
            "'Resolved' — ConflictAgent found and resolved a conflict. "
            "'None Detected' — no conflicting signals. "
            "'Review Required' — escalated for human review."
        ),
    )
    decision: str | None = Field(
        default=None,
        description="Full decision label from ConflictAgent.",
    )
    reason: str | None = Field(
        default=None,
        description="Human-readable explanation of the conflict resolution.",
    )


class ReviewSchema(BaseModel):
    """Reviewer validation output."""

    status: str = Field(
        ...,
        description="'Approved' — all checks passed. 'Needs Review' — validation failed.",
    )
    reason: str | None = Field(
        default=None,
        description="Summary of why the review status was assigned.",
    )
    issues: list[str] = Field(
        default_factory=list,
        description="Individual validation problem strings (empty on approval).",
    )


class WorkflowStepSchema(BaseModel):
    """One executed step in the agent pipeline trace."""

    step: int = Field(..., description="Sequential step number (1-based).")
    agent: str = Field(..., description="Agent or service name.")
    status: str = Field(..., description="'ok' or 'error'.")
    duration_ms: float = Field(
        ..., description="Wall-clock execution time in milliseconds."
    )
    error: str | None = Field(
        default=None, description="Error message if status is 'error'."
    )


# ─────────────────────────────────────────────────────────────────────────────
# Root response model
# ─────────────────────────────────────────────────────────────────────────────


class AnalysisResponse(BaseModel):
    """
    Complete analysis response returned by GET /analysis/{customer_id}.

    All nested models are validated by Pydantic; numeric ranges are enforced
    at the field level (ge / le constraints).
    """

    customer: CustomerSchema = Field(..., description="Customer identity.")
    risk: RiskSchema = Field(..., description="Risk assessment.")
    opportunity: OpportunitySchema = Field(..., description="Opportunity assessment.")
    recommendation: RecommendationSchema = Field(
        ..., description="Product recommendation."
    )
    conflict: ConflictSchema = Field(..., description="Conflict resolution result.")
    review: ReviewSchema = Field(..., description="Validation review result.")
    explanation: str = Field(..., description="Natural-language decision explanation.")
    audit_id: str | None = Field(
        default=None, description="Immutable compliance audit record ID."
    )
    workflow: list[WorkflowStepSchema] = Field(
        default_factory=list,
        description="Per-step execution trace from the agent pipeline.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Response formatter
# ─────────────────────────────────────────────────────────────────────────────


def format_response(raw: dict[str, Any]) -> AnalysisResponse:
    """
    Map the flat orchestrator output dict into a validated ``AnalysisResponse``.

    Parameters
    ----------
    raw : dict
        The dict returned by ``AgentOrchestrator.run(customer)``.

    Returns
    -------
    AnalysisResponse
        Validated, structured response ready to be serialised by FastAPI.

    Notes
    -----
    - Missing fields fall back to safe defaults so the endpoint never raises
      a 500 due to an incomplete pipeline output.
    - ``conflict.status`` is derived from the ``conflict_decision`` and
      ``conflict_detected`` fields of the orchestrator output.
    - ``review.status`` is title-cased so both "approved" and "Approved"
      map cleanly to the schema.
    """

    # ── Customer ──────────────────────────────────────────────────────────
    customer = CustomerSchema(
        id=str(raw.get("customer_id") or ""),
        name=str(raw.get("customer_name") or ""),
    )

    # ── Risk ──────────────────────────────────────────────────────────────
    risk = RiskSchema(
        level=str(raw.get("risk_level") or "Unknown"),
        confidence=_clamp(raw.get("risk_confidence") or raw.get("confidence") or 0),
    )

    # ── Opportunity ───────────────────────────────────────────────────────
    opportunity = OpportunitySchema(
        score=_clamp(raw.get("opportunity_score") or 0),
        confidence=_clamp(
            raw.get("opportunity_confidence") or raw.get("confidence") or 0
        ),
    )

    # ── Recommendation ────────────────────────────────────────────────────
    recommendation = RecommendationSchema(
        product=str(
            raw.get("recommended_action")
            or raw.get("recommended_product")
            or "No recommendation"
        ),
        priority=str(raw.get("priority") or "Low"),
    )

    # ── Conflict ──────────────────────────────────────────────────────────
    conflict_decision = raw.get("conflict_decision") or ""
    conflict_detected = bool(raw.get("conflict_detected", False))
    conflict_reason = raw.get("conflict_reason")

    if conflict_detected and conflict_decision:
        conflict_status = _label_conflict(conflict_decision)
    else:
        conflict_status = "None Detected"

    conflict = ConflictSchema(
        status=conflict_status,
        decision=conflict_decision or None,
        reason=str(conflict_reason) if conflict_reason else None,
    )

    # ── Review ────────────────────────────────────────────────────────────
    raw_review_status = str(raw.get("review_status") or "")
    review = ReviewSchema(
        status=_label_review(raw_review_status),
        reason=raw.get("review_reason") or None,
        issues=list(raw.get("review_issues") or []),
    )

    # ── Explanation ───────────────────────────────────────────────────────
    explanation = str(raw.get("explanation") or raw.get("next_best_action") or "")

    # ── Audit ─────────────────────────────────────────────────────────────
    audit_id = str(raw.get("audit_id")) if raw.get("audit_id") else None

    # ── Workflow trace ────────────────────────────────────────────────────
    raw_workflow = raw.get("workflow", {})

    if isinstance(raw_workflow, dict):
        raw_steps = raw_workflow.get("steps", [])
    elif isinstance(raw_workflow, list):
        raw_steps = raw_workflow
    else:
        raw_steps = []

    workflow = [
        WorkflowStepSchema(
            step=int(s.get("step", i + 1)),
            agent=str(s.get("agent", "")),
            status=str(s.get("status", "ok")),
            duration_ms=float(s.get("duration_ms", 0.0)),
            error=s.get("error"),
        )
        for i, s in enumerate(raw_steps)
        if isinstance(s, dict)
    ]

    return AnalysisResponse(
        customer=customer,
        risk=risk,
        opportunity=opportunity,
        recommendation=recommendation,
        conflict=conflict,
        review=review,
        explanation=explanation,
        audit_id=audit_id,
        workflow=workflow,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Private helpers
# ─────────────────────────────────────────────────────────────────────────────


def _clamp(value: Any) -> int:
    """Coerce *value* to int and clamp to [0, 100]."""
    try:
        return max(0, min(100, int(value)))
    except (TypeError, ValueError):
        return 0


def _label_conflict(decision: str) -> str:
    """
    Map a ConflictAgent decision string to a concise status label.

      "Proceed"                    → "None Detected"
      "Review Required"            → "Review Required"
      "Risk Intervention Required" → "Resolved"
      "Proceed with Caution"       → "Resolved"
      "Low Priority"               → "Resolved"
      anything else                → "Resolved"
    """
    d = decision.strip().lower()
    if "proceed" in d and "caution" not in d:
        return "None Detected"
    if "review required" in d:
        return "Review Required"
    return "Resolved"


def _label_review(status: str) -> str:
    """
    Normalise ReviewerAgent status to title-case frontend label.

      "approved"      → "Approved"
      "needs_review"  → "Needs Review"
      anything else   → "Pending"
    """
    s = status.strip().lower()
    if s == "approved":
        return "Approved"
    if s in ("needs_review", "needs review"):
        return "Needs Review"
    return "Pending"
