def analyze_customer(customer: dict):
    """Analyze a customer record and return deterministic decision metrics."""

    # Read input values with safe defaults.
    revenue = customer.get("revenue", 0)
    industry = customer.get("industry", "")
    products = customer.get("products", [])

    # Ensure product_count works for list-based product data.
    product_count = len(products) if isinstance(products, list) else 0

    # -----------------------------
    # Risk Score Calculation
    # -----------------------------
    risk_score = 0

    # Lower revenue increases customer risk.
    if revenue < 3000000:
        risk_score += 30

    # Retail customers are considered higher risk in this rule set.
    if industry == "Retail":
        risk_score += 20

    # Customers with only one product are considered higher risk.
    if product_count == 1:
        risk_score += 20

    # Cap risk score at 100.
    risk_score = min(risk_score, 100)

    # -----------------------------
    # Opportunity Score Calculation
    # -----------------------------
    opportunity_score = 50

    # Higher revenue suggests stronger upsell or strategic opportunity.
    if revenue > 5000000:
        opportunity_score += 20

    # Customers with fewer than three products have cross-sell potential.
    if product_count < 3:
        opportunity_score += 20

    # Technology customers get a positive opportunity adjustment.
    if industry == "Technology":
        opportunity_score += 10

    # Cap opportunity score at 100.
    opportunity_score = min(opportunity_score, 100)

    # -----------------------------
    # Customer Segment Assignment
    # -----------------------------
    if revenue >= 7000000:
        segment = "Enterprise"
    elif revenue >= 3000000:
        segment = "Growth"
    else:
        segment = "Emerging"

    # -----------------------------
    # Priority Assignment
    # -----------------------------
    if opportunity_score >= 80:
        priority = "High"
    elif opportunity_score >= 60:
        priority = "Medium"
    else:
        priority = "Low"

    # Return the final decision-engine output.
    return {
        "risk_score": risk_score,
        "opportunity_score": opportunity_score,
        "segment": segment,
        "priority": priority,
    }
