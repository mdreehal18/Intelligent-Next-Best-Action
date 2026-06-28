from app.services.customer_service import get_customers
from app.services.decision_engine import analyze_customer


def get_recommendation(customer_id: str):
    """Return a recommendation for a customer using decision-engine analysis."""

    # Load all customers from the customer service.
    customers = get_customers()

    # Search for the requested customer by ID.
    customer = next(
        (item for item in customers if item.get("customer_id") == customer_id), None
    )

    # Return an error response if the customer does not exist.
    if not customer:
        return {"error": "Customer not found"}

    # Analyze the customer using the decision engine.
    analysis = analyze_customer(customer)

    # Apply recommendation rules based on decision-engine output.
    if analysis["risk_score"] >= 50:
        recommended_action = "Risk Monitoring Program"
        reason = "Customer requires proactive monitoring."
        confidence = 92
    elif analysis["segment"] == "Enterprise":
        recommended_action = "Corporate Credit Line"
        reason = "Enterprise customer with high business potential."
        confidence = 90
    elif analysis["priority"] == "High":
        recommended_action = "Premium Business Package"
        reason = "High opportunity customer."
        confidence = 88
    else:
        recommended_action = "Business Credit Card"
        reason = "General banking growth opportunity."
        confidence = 80

    # Return the response in the existing JSON format.
    return {
        "customer_id": customer.get("customer_id"),
        "customer_name": customer.get("name"),
        "recommended_action": recommended_action,
        "reason": reason,
        "confidence": confidence,
    }
