"""
feedback_learning_agent.py
--------------------------
Reads past approve/reject decisions from the MemoryAgent and uses them
to adjust recommendation confidence and provide learning insights.

This agent implements the "Learn from previous interactions" requirement
by analyzing historical decision patterns.

Output schema
-------------
{
    "learning_insights": list[str],
    "historical_acceptance_rate": float,     # 0.0 – 1.0
    "similar_decisions_count": int,
    "confidence_adjustment": int,            # -10 to +10
    "pattern_detected": str | None,
    "recommendation_history": list[dict]
}
"""

from __future__ import annotations

from typing import Any


class FeedbackLearningAgent:
    """Learns from past decisions to improve future recommendations."""

    name = "FeedbackLearningAgent"

    def run(
        self,
        customer: dict[str, Any],
        current_recommendation: dict[str, Any],
        memory_store: Any,
    ) -> dict[str, Any]:
        customer_id = customer.get("customer_id", "")
        customer_name = customer.get("name", "Customer")
        risk_level = current_recommendation.get("risk_level", "Medium")

        # Get all historical decisions
        all_decisions = memory_store.get_all_decisions()
        customer_decisions = memory_store.get_customer_history(customer_id)

        # Calculate acceptance rates
        total_reviewed = [
            d for d in all_decisions
            if d.get("review_status") in ("Approved", "Rejected")
        ]
        approved = [d for d in total_reviewed if d.get("review_status") == "Approved"]
        rejected = [d for d in total_reviewed if d.get("review_status") == "Rejected"]

        acceptance_rate = (
            len(approved) / len(total_reviewed) if total_reviewed else 0.0
        )

        # Find similar decisions (same risk level)
        similar = [
            d for d in total_reviewed
            if d.get("risk_level") == risk_level
        ]
        similar_approved = [
            d for d in similar if d.get("review_status") == "Approved"
        ]
        similar_rate = (
            len(similar_approved) / len(similar) if similar else 0.0
        )

        # Build insights
        insights: list[str] = []
        confidence_adjustment = 0

        if len(total_reviewed) > 0:
            insights.append(
                f"Your team has reviewed {len(total_reviewed)} recommendations "
                f"with an overall acceptance rate of {acceptance_rate:.0%}."
            )

        if len(similar) > 0:
            insights.append(
                f"For {risk_level}-risk customers, {len(similar_approved)} of "
                f"{len(similar)} similar recommendations were approved ({similar_rate:.0%})."
            )
            # Adjust confidence based on similar acceptance
            if similar_rate >= 0.8:
                confidence_adjustment = 5
                insights.append(
                    "High historical acceptance for this profile type → +5% confidence boost."
                )
            elif similar_rate <= 0.3 and len(similar) >= 3:
                confidence_adjustment = -5
                insights.append(
                    "Low acceptance rate for similar profiles → -5% confidence adjustment."
                )

        if len(customer_decisions) > 0:
            insights.append(
                f"{customer_name} has {len(customer_decisions)} previous AI decisions on record."
            )

        # Detect patterns
        pattern = None
        if len(rejected) >= 3:
            # Check if there's a pattern in rejections
            rejected_products = [
                d.get("recommended_action") or d.get("recommended_product")
                for d in rejected
            ]
            from collections import Counter
            product_counts = Counter(p for p in rejected_products if p)
            most_rejected = product_counts.most_common(1)
            if most_rejected and most_rejected[0][1] >= 2:
                pattern = (
                    f"'{most_rejected[0][0]}' has been rejected "
                    f"{most_rejected[0][1]} times — consider alternative products."
                )
                insights.append(f"Pattern detected: {pattern}")

        if not insights:
            insights.append(
                "No previous decision history available yet. "
                "This recommendation is based entirely on current data signals."
            )

        # Summary of recent decisions for this customer
        recommendation_history = [
            {
                "decision_id": d.get("decision_id", "")[:8],
                "action": d.get("recommended_action") or d.get("recommended_product", "—"),
                "status": d.get("review_status", "Pending"),
                "timestamp": d.get("timestamp", ""),
            }
            for d in customer_decisions[:5]
        ]

        return {
            "learning_insights": insights,
            "historical_acceptance_rate": round(acceptance_rate, 2),
            "similar_decisions_count": len(similar),
            "confidence_adjustment": confidence_adjustment,
            "pattern_detected": pattern,
            "recommendation_history": recommendation_history,
        }
