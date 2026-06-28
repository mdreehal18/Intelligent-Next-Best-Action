"""
agent_trace.py
--------------
FastAPI router for GET /agent-trace/{customer_id}.

Returns the complete per-step execution trace from the most recent
pipeline run for a given customer.

If the customer was already analysed in this process lifetime the
cached trace is returned instantly.  Otherwise the full pipeline is
executed on-demand and the resulting trace is returned.

Route
-----
  GET /agent-trace/{customer_id}
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.agents.pipeline_orchestrator import get_trace, orchestrator
from app.services.customer_service import get_customers

router = APIRouter()


@router.get("/agent-trace/{customer_id}")
def agent_trace(customer_id: str):
    """
    Return the complete agent execution trace for one customer.

    Each entry in ``workflow`` follows the standard pipeline envelope::

        {
            "agent"            : str,
            "status"           : "completed" | "failed",
            "execution_time_ms": float,
            "output"           : dict
        }

    Parameters
    ----------
    customer_id : str
        Unique customer identifier (e.g. ``"CUST001"``).

    Returns
    -------
    JSON
        ::

            {
                "customer_id": str,
                "customer":    str,
                "workflow":    list[dict]
            }

    Raises
    ------
    HTTPException 404
        When no customer record matches *customer_id*.
    """
    # ── Look up the customer record ───────────────────────────────────────
    all_customers = get_customers()

    customer = next(
        (c for c in all_customers if c.get("customer_id") == customer_id),
        None,
    )

    if customer is None:
        raise HTTPException(
            status_code=404,
            detail=f"Customer '{customer_id}' not found.",
        )

    # ── Use cached trace if available, otherwise run the pipeline ─────────
    trace = get_trace(customer_id)

    if trace is None:
        result = orchestrator.run(customer)
        trace = result.get("trace", [])

    return {
        "customer_id": customer_id,
        "customer": customer.get("name", ""),
        "workflow": trace,
    }
