export class RiskAnalysisAgent {
  constructor(blackboard) {
    this.blackboard = blackboard;
  }
  async execute() {
    this.blackboard.log("RiskAnalysisAgent", "Evaluating account churn/escalation risk factors...");
    const state = this.blackboard.getState();
    const sentiment = state.extraction.sentiment;
    const urgency = state.extraction.urgency;
    const context = state.context || {};
    const usageChangeStr = context.usageChange || "0%";
    const usageChange = parseFloat(usageChangeStr.replace("%", ""));
    const renewalDays = context.renewalDays !== undefined ? parseInt(context.renewalDays) : 365;
    let riskScore = 15;
    const riskFactors = [];
    if (sentiment === "Negative") {
      riskScore += 25;
      riskFactors.push("Negative sentiment detected in customer communications.");
    }
    if (urgency === "P1 Blocker") {
      riskScore += 30;
      riskFactors.push("Critical P1 blocker is currently preventing system operation.");
    } else if (urgency === "High") {
      riskScore += 15;
      riskFactors.push("High urgency communication thread.");
    }
    if (usageChange < 0) {
      const drop = Math.abs(usageChange);
      riskScore += drop * 0.8;
      riskFactors.push(`Usage engagement dropped by ${drop}% in last 30 days.`);
    }
    if (renewalDays <= 60) {
      riskScore += 15;
      riskFactors.push(`Renewal date is close (${renewalDays} days remaining).`);
    } else if (renewalDays <= 30) {
      riskScore += 25;
      riskFactors.push(`Critical renewal window: Only ${renewalDays} days left.`);
    }
    riskScore = Math.round(Math.min(riskScore, 100));
    this.blackboard.update("biAnalysis.riskScore", riskScore);
    this.blackboard.update("biAnalysis.riskFactors", riskFactors);
    this.blackboard.log("RiskAnalysisAgent", `Analysis complete. Calculated Risk Score: ${riskScore}/100. Factors: ${riskFactors.length}`);
  }
}

export class OpportunityAnalysisAgent {
  constructor(blackboard) {
    this.blackboard = blackboard;
  }
  async execute() {
    this.blackboard.log("OpportunityAnalysisAgent", "Scanning blackboard for upsell/expansion signals...");
    const state = this.blackboard.getState();
    const context = state.context || {};
    const text = state.rawInput.toLowerCase();
    const usageChangeStr = context.usageChange || "0%";
    const usageChange = parseFloat(usageChangeStr.replace("%", ""));
    const opportunities = [];
    if (usageChange > 10) {
      opportunities.push({
        type: "Seat Expansion",
        signal: `User engagement grew by ${usageChange}% over the past 30 days.`,
        details: "Account is ready for seat/license expansion discussions."
      });
    }
    if (text.includes("addon") || text.includes("add-on") || text.includes("security") || text.includes("advanced")) {
      opportunities.push({
        type: "Module Cross-Sell",
        signal: "Customer explicitly mentioned Advanced Security addon.",
        details: "Bundle premium security modules in upcoming renewal negotiation."
      });
    }
    if (context.arr && parseInt(context.arr.replace(/[^0-9]/g, "")) > 100000) {
      opportunities.push({
        type: "Executive Sponsor EBR",
        signal: "High ARR client ($100k+).",
        details: "Schedule Executive Business Review (EBR) to lock in multi-year extension."
      });
    }
    this.blackboard.update("biAnalysis.opportunities", opportunities);
    this.blackboard.log("OpportunityAnalysisAgent", `Scanning complete. Identified opportunities: ${opportunities.length}`);
  }
}

export class MissingInformationAgent {
  constructor(blackboard) {
    this.blackboard = blackboard;
  }
  async execute() {
    this.blackboard.log("MissingInformationAgent", "Checking for critical gaps in customer profile & transaction history...");
    const state = this.blackboard.getState();
    const context = state.context || {};
    const category = state.triage.category;
    const missingFields = [];
    const decisionMakerRelevant = ["Pricing", "Adoption", "Onboarding"].includes(category);
    if (decisionMakerRelevant && (!context.decisionMaker || context.decisionMaker.toLowerCase() === "unknown")) {
      missingFields.push({
        field: "decisionMaker",
        importance: "Critical",
        description: "Renewal decision maker / Economic buyer identity is unknown."
      });
    }
    if (!context.primaryContact || context.primaryContact.toLowerCase() === "unknown") {
      missingFields.push({
        field: "primaryContact",
        importance: "Critical",
        description: "Primary point of contact for day-to-day operations is unknown."
      });
    }
    const text = state.rawInput.toLowerCase();
    const hasBudgetSignal = text.includes("budget") || text.includes("price") || text.includes("$") || context.arr;
    if (!hasBudgetSignal && ["Pricing", "Billing"].includes(category)) {
      missingFields.push({
        field: "budgetAvailability",
        importance: "Medium",
        description: "Customer budget constraints and financial status are unspecified."
      });
    }
    this.blackboard.update("biAnalysis.missingFields", missingFields);
    const criticalGaps = missingFields.filter(f => f.importance === "Critical");
    this.blackboard.update("loopState.dataGatheringNeeded", criticalGaps.length > 0);
    this.blackboard.log("MissingInformationAgent",
      `Found ${missingFields.length} missing fields (${criticalGaps.length} CRITICAL). Data gathering loop triggered: ${criticalGaps.length > 0}`
    );
  }
}