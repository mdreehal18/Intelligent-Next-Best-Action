"""
audit_service.py
----------------
Immutable compliance audit trail for every AI decision produced by the
agent pipeline.

Purpose and scope
-----------------
This service is distinct from the two other stores in the project:

  MemoryAgent       — operational store, keyed by customer_id, feeds the
                      frontend DecisionTimeline.
  agent_logger      — execution store, one entry per individual agent run,
                      used for performance monitoring and debugging.
  AuditService      — compliance store, one entry per end-to-end decision,
                      captures the full agent-output snapshot alongside the
                      human-readable fields required for an audit trail.

Each AuditRecord captures
--------------------------
  audit_id        UUID4 — unique, immutable identifier for this decision
  timestamp       ISO 8601 UTC — when the decision was recorded
  customer_id     str
  customer_name   str
  recommendation  str  — the recommended action or product
  reason          str  — human-readable rationale (next_best_action or explanation)
  confidence      int  — overall confidence score (0–100)
  agent_outputs   dict — snapshot of every agent's raw output
  review_status   str | None — "approved" / "needs_review" from ReviewerAgent

Records are append-only (never mutated after creation) to preserve
audit integrity.  A threading.Lock protects concurrent writes.

Public API
----------
  store_decision(decision, *, agent_outputs, review_result)  → AuditRecord
  get_all_records()                                          → list[dict]
  get_customer_records(customer_id)                          → list[dict]
  export_records()                                           → list[dict]
  find_by_audit_id(audit_id)                                 → dict | None
  count()                                                    → int
  clear()                                                    → None  (test only)

Module-level singleton
----------------------
  from app.services.audit_service import audit
  audit.store_decision(result)
"""

from __future__ import annotations

import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Any

# ─────────────────────────────────────────────────────────────────────────────
# AuditRecord
# ─────────────────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class AuditRecord:
    """
    Immutable snapshot of one end-to-end AI decision.

    ``frozen=True`` prevents accidental mutation after creation, which
    would compromise audit integrity.
    """

    audit_id: str
    timestamp: str
    customer_id: str
    customer_name: str
    recommendation: str
    reason: str
    confidence: int
    agent_outputs: dict[str, Any]
    review_status: str | None = field(default=None)

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-serialisable copy of this record."""
        return {
            "audit_id": self.audit_id,
            "timestamp": self.timestamp,
            "customer_id": self.customer_id,
            "customer_name": self.customer_name,
            "recommendation": self.recommendation,
            "reason": self.reason,
            "confidence": self.confidence,
            "agent_outputs": deepcopy(self.agent_outputs),
            "review_status": self.review_status,
        }


# ─────────────────────────────────────────────────────────────────────────────
# AuditService
# ─────────────────────────────────────────────────────────────────────────────


class AuditService:
    """Append-only compliance store for AI decisions."""

    def __init__(self) -> None:
        self._records: list[AuditRecord] = []
        self._index: dict[str, AuditRecord] = {}  # audit_id → record
        self._by_cid: dict[str, list[AuditRecord]] = {}  # customer_id → records
        self._lock: Lock = Lock()

    # ── Write ─────────────────────────────────────────────────────────────

    def store_decision(
        self,
        decision: dict[str, Any],
        *,
        agent_outputs: dict[str, Any] | None = None,
        review_result: dict[str, Any] | None = None,
    ) -> AuditRecord:
        """
        Create and store an immutable AuditRecord from a pipeline decision.

        Parameters
        ----------
        decision : dict
            Final recommendation dict — typically the output of
            ``AgentOrchestrator.run()`` or ``DecisionGraph.run()``.
            The following keys are extracted when present:

              customer_id, customer_name
              recommended_action | recommended_product  → recommendation
              next_best_action | explanation            → reason
              confidence
              risk_score, risk_level, opportunity_score,
              segment, priority, rationale, signals

        agent_outputs : dict, optional
            Mapping of agent name → raw agent output dict.
            When omitted the service reconstructs a snapshot from the
            fields present in *decision*.

        review_result : dict, optional
            Output of ``ReviewerAgent.run()`` — used to populate
            ``review_status`` (``"approved"`` / ``"needs_review"``).

        Returns
        -------
        AuditRecord
            The stored (frozen) record.
        """
        customer_id = str(decision.get("customer_id") or "unknown")
        customer_name = str(decision.get("customer_name") or "Unknown Customer")

        recommendation = (
            decision.get("recommended_action")
            or decision.get("recommended_product")
            or "No recommendation"
        )

        reason = (
            decision.get("next_best_action")
            or decision.get("explanation")
            or decision.get("rationale", [""])[0]
            if isinstance(decision.get("rationale"), list)
            else decision.get("rationale") or "No reason provided"
        )

        confidence = int(decision.get("confidence") or 0)

        review_status: str | None = None
        if review_result and isinstance(review_result, dict):
            review_status = review_result.get("status")

        # Build agent-output snapshot ─────────────────────────────────────
        if agent_outputs and isinstance(agent_outputs, dict):
            outputs_snapshot = deepcopy(agent_outputs)
        else:
            outputs_snapshot = self._extract_agent_snapshot(decision)

        record = AuditRecord(
            audit_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
            customer_id=customer_id,
            customer_name=customer_name,
            recommendation=str(recommendation),
            reason=str(reason),
            confidence=confidence,
            agent_outputs=outputs_snapshot,
            review_status=review_status,
        )

        with self._lock:
            self._records.append(record)
            self._index[record.audit_id] = record
            self._by_cid.setdefault(customer_id, []).append(record)

        return record

    # ── Read ──────────────────────────────────────────────────────────────

    def get_all_records(self) -> list[dict[str, Any]]:
        """
        Return every audit record, newest first.

        Returns
        -------
        list[dict]
            All records serialised via ``AuditRecord.to_dict()``.
        """
        with self._lock:
            snapshot = list(reversed(self._records))
        return [r.to_dict() for r in snapshot]

    def get_customer_records(self, customer_id: str) -> list[dict[str, Any]]:
        """
        Return all audit records for one customer, newest first.

        Parameters
        ----------
        customer_id : str

        Returns
        -------
        list[dict]
            Empty list when no records exist for this customer.
        """
        with self._lock:
            records = list(reversed(self._by_cid.get(str(customer_id), [])))
        return [r.to_dict() for r in records]

    def find_by_audit_id(self, audit_id: str) -> dict[str, Any] | None:
        """
        Look up a single record by its ``audit_id``.

        Returns
        -------
        dict | None
            Serialised record, or ``None`` if not found.
        """
        with self._lock:
            record = self._index.get(str(audit_id))
        return record.to_dict() if record else None

    def export_records(self) -> list[dict[str, Any]]:
        """
        Export every record as a list of plain dicts, oldest first.

        Suitable for writing to a JSON file or sending to an external
        compliance system.
        """
        with self._lock:
            snapshot = list(self._records)
        return [r.to_dict() for r in snapshot]

    # ── Utility ───────────────────────────────────────────────────────────

    def count(self) -> int:
        """Return the total number of stored audit records."""
        with self._lock:
            return len(self._records)

    def clear(self) -> None:
        """
        Delete all audit records.

        For use in tests or development resets **only**.
        Production audit trails must never be cleared.
        """
        with self._lock:
            self._records.clear()
            self._index.clear()
            self._by_cid.clear()

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AuditService records={self.count()}>"

    # ── Private helpers ───────────────────────────────────────────────────

    @staticmethod
    def _extract_agent_snapshot(decision: dict[str, Any]) -> dict[str, Any]:
        """
        Reconstruct a per-agent output snapshot from the flat decision dict
        when explicit ``agent_outputs`` were not supplied.

        Groups known fields back under their originating agent name so the
        audit record is consistent whether the caller passes agent_outputs
        explicitly or relies on auto-extraction.
        """
        return {
            "RiskAgent": {
                "risk_score": decision.get("risk_score"),
                "risk_level": decision.get("risk_level"),
                "risk_factors": decision.get("risk_factors", []),
            },
            "OpportunityAgent": {
                "opportunity_score": decision.get("opportunity_score"),
                "opportunity_level": decision.get("opportunity_level"),
                "segment": decision.get("segment"),
                "opportunity_drivers": decision.get("opportunity_drivers", []),
            },
            "ProductRecommendationAgent": {
                "recommended_action": decision.get("recommended_action"),
                "recommended_product": decision.get("recommended_product"),
                "recommended_action_description": decision.get(
                    "recommended_action_description"
                ),
                "product_recommendations": decision.get("product_recommendations", []),
                "confidence": decision.get("confidence"),
                "priority": decision.get("priority"),
            },
            "ExplanationAgent": {
                "explanation": decision.get("explanation"),
                "next_best_action": decision.get("next_best_action"),
                "rationale": decision.get("rationale", []),
                "signals": decision.get("signals", []),
            },
        }


# ── Module-level singleton ────────────────────────────────────────────────────
# Import this instance everywhere so all parts of the application share
# one audit trail.
#
#   from app.services.audit_service import audit
#
audit: AuditService = AuditService()
