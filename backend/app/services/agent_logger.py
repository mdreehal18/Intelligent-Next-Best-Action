"""
agent_logger.py
---------------
Lightweight in-memory logging layer for every agent execution.

Every log entry stores
----------------------
  timestamp     ISO 8601 UTC string
  agent         name of the agent that ran
  input         data passed into the agent (customer dict or similar)
  output        data returned by the agent
  execution_ms  wall-clock duration measured with time.perf_counter()
  status        "ok" or "error"
  customer_id   extracted from input automatically when present
  log_id        UUID4, unique per entry

Public API
----------
  log_agent_run(agent_name, status, output, execution_ms,
                *, input_data, customer_id)    → LogEntry

  get_logs(customer_id=None)                   → list[dict]
      Pass a customer_id to filter; omit (or None) for all logs.

  get_agent_logs(agent_name)                   → list[dict]
  get_latest(n)                                → list[dict]
  summary()                                    → dict
  clear_logs()                                 → None

  track_execution(agent_name, *, customer_id, input_data)
      Context manager — set .output before exit; logs automatically.

  timed_run(agent_name, fn, /, *args, **kwargs) → Any
      Calls fn, auto-extracts customer_id from first arg when possible.
"""

from __future__ import annotations

import logging
import time
import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Callable

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# LogEntry
# ─────────────────────────────────────────────────────────────────────────────


@dataclass
class LogEntry:
    """One recorded agent execution."""

    log_id: str
    agent: str
    status: str  # "ok" | "error"
    input: dict[str, Any]
    output: dict[str, Any]
    execution_ms: float
    timestamp: str  # ISO 8601 UTC
    customer_id: str | None = field(default=None)

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-serialisable copy of this entry."""
        return {
            "log_id": self.log_id,
            "agent": self.agent,
            "status": self.status,
            "input": deepcopy(self.input),
            "output": deepcopy(self.output),
            "execution_ms": self.execution_ms,
            "timestamp": self.timestamp,
            "customer_id": self.customer_id,
        }


# ─────────────────────────────────────────────────────────────────────────────
# In-memory store
# ─────────────────────────────────────────────────────────────────────────────

_logs: list[LogEntry] = []
_lock: Lock = Lock()


# ─────────────────────────────────────────────────────────────────────────────
# Core write
# ─────────────────────────────────────────────────────────────────────────────


def log_agent_run(
    agent_name: str,
    status: str,
    output: dict[str, Any],
    execution_ms: float,
    *,
    input_data: dict[str, Any] | None = None,
    customer_id: str | None = None,
) -> LogEntry:
    """
    Record one agent execution.

    Parameters
    ----------
    agent_name   : str    Agent label (e.g. ``"RiskAgent"``).
    status       : str    ``"ok"`` on success, ``"error"`` on failure.
    output       : dict   The agent's return value.
    execution_ms : float  Wall-clock duration in milliseconds.
    input_data   : dict   Data passed into the agent (keyword-only, optional).
    customer_id  : str    Explicit customer ID (keyword-only, optional).
                          When omitted, auto-extracted from *input_data*.

    Returns
    -------
    LogEntry
        The stored entry.
    """
    safe_input: dict[str, Any] = (
        deepcopy(input_data) if isinstance(input_data, dict) else {}
    )
    safe_output: dict[str, Any] = deepcopy(output) if isinstance(output, dict) else {}

    # Resolve customer_id: explicit arg > extracted from input > None
    cid: str | None = (
        customer_id
        or safe_input.get("customer_id")
        or safe_output.get("customer_id")
        or None
    )

    entry = LogEntry(
        log_id=str(uuid.uuid4()),
        agent=agent_name,
        status=status,
        input=safe_input,
        output=safe_output,
        execution_ms=round(float(execution_ms), 2),
        timestamp=datetime.now(timezone.utc).isoformat(),
        customer_id=str(cid) if cid else None,
    )

    with _lock:
        _logs.append(entry)

    logger.debug(
        "[%s] agent=%s customer=%s status=%s duration=%.2f ms",
        entry.log_id[:8],
        agent_name,
        entry.customer_id or "—",
        status,
        entry.execution_ms,
    )

    return entry


# ─────────────────────────────────────────────────────────────────────────────
# Read helpers
# ─────────────────────────────────────────────────────────────────────────────


def get_logs(customer_id: str | None = None) -> list[dict[str, Any]]:
    """
    Return log entries, newest first.

    Parameters
    ----------
    customer_id : str, optional
        When provided, only entries whose ``customer_id`` matches are
        returned.  When omitted or ``None``, every entry is returned.

    Returns
    -------
    list[dict]
        Serialised entries.
    """
    with _lock:
        snapshot = list(reversed(_logs))

    if customer_id is not None:
        snapshot = [e for e in snapshot if e.customer_id == str(customer_id)]

    return [e.to_dict() for e in snapshot]


def get_agent_logs(agent_name: str) -> list[dict[str, Any]]:
    """
    Return all entries for one agent, newest first.

    Parameters
    ----------
    agent_name : str
        Exact label used when the entry was created (case-sensitive).
    """
    with _lock:
        entries = [e for e in reversed(_logs) if e.agent == agent_name]
    return [e.to_dict() for e in entries]


def get_latest(n: int = 10) -> list[dict[str, Any]]:
    """Return the *n* most recent entries across all agents."""
    with _lock:
        entries = list(reversed(_logs))[:n]
    return [e.to_dict() for e in entries]


def summary() -> dict[str, Any]:
    """
    Return aggregate execution statistics keyed by agent name.

    Schema
    ------
    ::

        {
            "total_runs": int,
            "agents": {
                "<agent_name>": {
                    "runs":             int,
                    "successful":       int,
                    "failed":           int,
                    "avg_execution_ms": float,
                    "min_execution_ms": float,
                    "max_execution_ms": float,
                    "last_run":         str
                }
            }
        }
    """
    with _lock:
        snapshot = list(_logs)

    agents: dict[str, dict[str, Any]] = {}

    for entry in snapshot:
        agg = agents.setdefault(
            entry.agent,
            {
                "runs": 0,
                "successful": 0,
                "failed": 0,
                "_durations": [],
                "last_run": None,
            },
        )
        agg["runs"] += 1
        agg["_durations"].append(entry.execution_ms)
        agg["last_run"] = entry.timestamp

        if entry.status == "ok":
            agg["successful"] += 1
        else:
            agg["failed"] += 1

    for agg in agents.values():
        durations = agg.pop("_durations")
        agg["avg_execution_ms"] = (
            round(sum(durations) / len(durations), 2) if durations else 0.0
        )
        agg["min_execution_ms"] = round(min(durations), 2) if durations else 0.0
        agg["max_execution_ms"] = round(max(durations), 2) if durations else 0.0

    return {"total_runs": len(snapshot), "agents": agents}


def clear_logs() -> None:
    """Delete all log entries (intended for tests / dev resets)."""
    with _lock:
        _logs.clear()
    logger.debug("Agent log store cleared.")


# ─────────────────────────────────────────────────────────────────────────────
# Context manager
# ─────────────────────────────────────────────────────────────────────────────


class track_execution:
    """
    Context manager that times and logs one agent execution automatically.

    Set ``tracker.output`` inside the block; the entry is written on
    ``__exit__`` whether or not an exception occurred.

    Example
    -------
    ::

        with track_execution("RiskAgent", customer_id="CUST001",
                             input_data=customer) as tracker:
            result = risk_agent.run(customer)
            tracker.output = result
    """

    def __init__(
        self,
        agent_name: str,
        *,
        customer_id: str | None = None,
        input_data: dict[str, Any] | None = None,
    ) -> None:
        self.agent_name: str = agent_name
        self.output: dict[str, Any] = {}
        self.customer_id: str | None = customer_id
        self.input_data: dict[str, Any] = input_data or {}
        self._t0: float = 0.0

    def __enter__(self) -> track_execution:
        self._t0 = time.perf_counter()
        return self

    def __exit__(
        self,
        exc_type: type | None,
        exc_val: BaseException | None,
        exc_tb: Any,
    ) -> bool:
        execution_ms = round((time.perf_counter() - self._t0) * 1_000, 2)

        status = "error" if exc_type else "ok"
        output = {"error": str(exc_val)} if exc_type else self.output

        log_agent_run(
            self.agent_name,
            status,
            output,
            execution_ms,
            input_data=self.input_data,
            customer_id=self.customer_id,
        )

        return False  # never suppress exceptions


# ─────────────────────────────────────────────────────────────────────────────
# Convenience runner
# ─────────────────────────────────────────────────────────────────────────────


def timed_run(
    agent_name: str,
    fn: Callable[..., Any],
    /,
    *args: Any,
    **kwargs: Any,
) -> Any:
    """
    Call *fn*, log the execution, and return the result.

    ``customer_id`` and ``input`` are auto-extracted from the first
    positional argument when it is a dict (covers all standard agents
    that accept a customer record as their first parameter).

    Parameters
    ----------
    agent_name : str        Label stored in the log entry.
    fn         : Callable   Function to call (typically ``agent.run``).
    *args                   Forwarded to *fn*.
    **kwargs                Forwarded to *fn*.

    Returns
    -------
    Any
        Return value of ``fn(*args, **kwargs)``.

    Raises
    ------
    Exception
        Any exception raised by *fn* is logged then re-raised.
    """
    # Auto-detect input and customer_id from the first argument
    input_data: dict[str, Any] = {}
    customer_id: str | None = None

    if args and isinstance(args[0], dict):
        input_data = dict(args[0])  # shallow copy is enough
        customer_id = args[0].get("customer_id") or None

    t0 = time.perf_counter()
    try:
        result = fn(*args, **kwargs)
        status = "ok"
        output = result if isinstance(result, dict) else {"result": result}
    except Exception as exc:
        execution_ms = round((time.perf_counter() - t0) * 1_000, 2)
        log_agent_run(
            agent_name,
            "error",
            {"error": str(exc)},
            execution_ms,
            input_data=input_data,
            customer_id=customer_id,
        )
        raise

    execution_ms = round((time.perf_counter() - t0) * 1_000, 2)
    log_agent_run(
        agent_name,
        status,
        output,
        execution_ms,
        input_data=input_data,
        customer_id=customer_id,
    )
    return result
