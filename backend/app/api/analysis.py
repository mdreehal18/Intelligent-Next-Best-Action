"""
analysis.py
-----------
FastAPI router for GET /analysis/{customer_id}.

Replaces the static decision_engine call in main.py with a full
9-step multi-agent pipeline executed by PipelineOrchestrator.

The response includes every field the frontend expects plus the
complete agent trace and persistence identifiers.

Route
-----
  GET /analysis/{customer_id}
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.agents.pipeline_orchestrator import orchestrator
from app.services.customer_service import get_customers

router = APIRouter()


@router.get("/analysis/{customer_id}")
def analysis(customer_id: str):
    """
    Run the full 9-agent decision pipeline for one customer.

    Parameters
    ----------
    customer_id : str
        Unique customer identifier (e.g. ``"CUST001"``).

    Returns
    -------
    JSON
        Unified decision response containing risk, opportunity, product
        recommendation, conflict resolution, review status, explanation,
        memory identifiers, audit ID, and the full pipeline trace.

    Raises
    ------
    HTTPException 404
        When no customer record matches *customer_id*.
    """
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

    return orchestrator.run(customer)
