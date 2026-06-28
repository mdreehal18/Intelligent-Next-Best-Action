"""
memory_agent.py
---------------
In-memory store for every AI decision produced by the agent pipeline.

No database is used — all records live in a plain Python dict for the
lifetime of the running process.  This makes the module a natural
drop-in to swap for a persistent backend (Redis, Postgres, etc.) later:
only this file needs to change.

Storage structure
-----------------
  _store : dict[customer_id → list[decision_record]]

  Each decision_record is a copy of the dict passed to save_decision(),
  enriched with:
    - decision_id  : str   (UUID4, unique across all records)
    - timestamp    : str   (ISO 8601 UTC, added if caller omits it)

Thread safety
-------------
  A threading.Lock guards every read/write so the agent is safe under
  FastAPI's default multi-thread worker model.

Public API
----------
  save_decision(decision)              → stored record (dict)
  get_customer_history(customer_id)    → list[dict], newest first
  get_all_decisions()                  → list[dict], newest first
  clear()                              → None  (test helper)
  count()                              → int

Module-level singleton
----------------------
  Import `memory` directly to share one store across the application:

      from app.memory.memory_agent import memory
      memory.save_decision(result)
"""

from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import datetime, timezone
from threading import Lock
from typing import Any


class MemoryAgent:
    """Stores and retrieves AI decisions using an in-memory dictionary."""

    name = "MemoryAgent"

    def __init__(self) -> None:
        # customer_id → ordered list of decision records (append order)
        self._store: dict[str, list[dict[str, Any]]] = {}
        self._lock: Lock = Lock()

    # ── Write ─────────────────────────────────────────────────────────────

    def save_decision(self, decision: dict[str, Any]) -> dict[str, Any]:
        """
        Persist one AI decision.

        The caller may pass any dict — typically the unified response
        produced by ``AgentOrchestrator.run()``.  Two fields are
        injected automatically if absent:

          ``decision_id``  — UUID4 string, unique per record.
          ``timestamp``    — ISO 8601 UTC datetime string.

        Parameters
        ----------
        decision : dict
            Decision record.  Should contain at minimum ``customer_id``.
            All other keys are stored as-is.

        Returns
        -------
        dict
            A deep copy of the stored record (including injected fields).

        Raises
        ------
        ValueError
            If *decision* is not a non-empty dict.
        """
        if not isinstance(decision, dict) or not decision:
            raise ValueError("decision must be a non-empty dict")

        record = deepcopy(decision)

        # Inject metadata if the caller did not supply it
        if not record.get("decision_id"):
            record["decision_id"] = str(uuid.uuid4())

        if not record.get("timestamp"):
            record["timestamp"] = datetime.now(timezone.utc).isoformat()

        customer_id: str = str(record.get("customer_id") or "unknown")

        with self._lock:
            if customer_id not in self._store:
                self._store[customer_id] = []
            self._store[customer_id].append(record)

        return deepcopy(record)

    def update_decision_status(self, decision_id: str, status: str, modifications: dict[str, Any] = None) -> bool:
        """
        Update the status and optionally modify a decision record.
        """
        with self._lock:
            for customer_id in self._store:
                for i, record in enumerate(self._store[customer_id]):
                    if record.get("decision_id") == decision_id:
                        record["review_status"] = status
                        if modifications:
                            record.update(modifications)
                        return True
        return False

    # ── Read ──────────────────────────────────────────────────────────────

    def get_customer_history(self, customer_id: str) -> list[dict[str, Any]]:
        """
        Return all decisions for one customer, newest first.

        Parameters
        ----------
        customer_id : str
            The customer identifier used when the decision was saved.

        Returns
        -------
        list[dict]
            Chronologically reversed list of decision records.
            Empty list if no decisions exist for this customer.
        """
        with self._lock:
            records = self._store.get(str(customer_id), [])
            return list(reversed(deepcopy(records)))

    def get_all_decisions(self) -> list[dict[str, Any]]:
        """
        Return every stored decision across all customers, newest first.

        Useful for populating the ``DecisionTimeline`` frontend component.

        Returns
        -------
        list[dict]
            All records sorted by ``timestamp`` descending.
        """
        with self._lock:
            all_records: list[dict[str, Any]] = [
                deepcopy(record)
                for records in self._store.values()
                for record in records
            ]

        all_records.sort(
            key=lambda r: r.get("timestamp") or "",
            reverse=True,
        )
        return all_records

    # ── Utility ───────────────────────────────────────────────────────────

    def count(self) -> int:
        """Return the total number of stored decisions across all customers."""
        with self._lock:
            return sum(len(records) for records in self._store.values())

    def clear(self) -> None:
        """
        Delete all stored decisions.

        Intended for use in tests or development resets only.
        """
        with self._lock:
            self._store.clear()

    def __repr__(self) -> str:  # pragma: no cover
        customers = len(self._store)
        decisions = self.count()
        return f"<MemoryAgent customers={customers} decisions={decisions}>"


# ── Module-level singleton ────────────────────────────────────────────────────
# Import this instance everywhere so all agents share one store.
#
#   from app.memory.memory_agent import memory
#
memory: MemoryAgent = MemoryAgent()
