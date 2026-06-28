"""
analysis.py
-----------
FastAPI router for GET /analysis/{customer_id} and POST /analysis/review.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.agents.pipeline_orchestrator import orchestrator
from app.services.customer_service import get_customers

router = APIRouter()


@router.get("/analysis/{customer_id}")
def analysis(customer_id: str):
    """
    Run the full dynamic multi-agent decision pipeline for one customer.
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


class ReviewRequest(BaseModel):
    decision_id: str
    status: str  # "Approved" or "Rejected"
    modifications: Optional[dict] = None


@router.post("/analysis/review")
def review_decision(req: ReviewRequest):
    """
    Update the status of a recommendation (Human-in-the-Loop approval).
    """
    from app.memory.memory_agent import memory
    success = memory.update_decision_status(req.decision_id, req.status, req.modifications)

    if not success:
        raise HTTPException(status_code=404, detail="Decision ID not found.")

    return {"message": f"Decision {req.decision_id} marked as {req.status}"}
