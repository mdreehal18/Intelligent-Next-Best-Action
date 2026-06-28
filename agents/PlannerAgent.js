import { CATEGORIES, getCategoryNames } from "../data/categories.js";

export class PlannerAgent {
  constructor(blackboard) {
    this.blackboard = blackboard;
  }

  async execute(rawInput, categoryOverride = null) {
    let category, confidence;

    if (categoryOverride && getCategoryNames().includes(categoryOverride)) {
      category = categoryOverride;
      confidence = 1.0;
    } else {
      // Try LLM triage
      const llmResult = await this._llmTriage(rawInput);
      if (llmResult && getCategoryNames().includes(llmResult.category)) {
        category = llmResult.category;
        confidence = llmResult.confidence;
      } else {
        // Fallback to original keyword scoring
        const text = rawInput.toLowerCase();
        const scored = getCategoryNames().map(name => {
          const def = CATEGORIES[name];
          const matchedKeywords = (def.keywords || []).filter(k => text.includes(k));
          return { name, matches: matchedKeywords.length, matchedKeywords };
        });
        scored.sort((a, b) => b.matches - a.matches);
        const top = scored[0];
        if (top.matches === 0) {
          category = "Unclassified";
          confidence = 0.3;
        } else {
          category = top.name;
          const runnerUp = scored[1] || { matches: 0 };
          const margin = top.matches - runnerUp.matches;
          confidence = Math.min(0.65 + top.matches * 0.05 + margin * 0.03, 0.99);
        }
      }
    }

    this.blackboard.update("triage.category", category);
    this.blackboard.update("triage.confidence", confidence);

    const agentPlan = await this.buildAgentPlan(category, rawInput);
    this.blackboard.update("triage.agentPlan", agentPlan);

    this.blackboard.log("PlannerAgent",
      `Triage Complete. Category: [${category}] (${Math.round(confidence * 100)}%). Plan: ${agentPlan.join(" → ")}`
    );
  }

  async _llmTriage(text) {
    try {
      const resp = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `Classify this customer interaction into one of: ${getCategoryNames().join(', ')}. Output JSON: {"category":"...", "confidence":0.0-1.0}` },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          max_tokens: 150
        })
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return JSON.parse(data.content);
    } catch (e) { return null; }
  }

  async buildAgentPlan(category, rawInput) {
    const agents = ["InteractionAgent", "KnowledgeAgent", "MemoryAgent", "RiskAnalysisAgent", "OpportunityAnalysisAgent", "MissingInformationAgent"];
    try {
      const resp = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `You are a workflow planner. For a ${category} case, which of these agents should run? Output a JSON array: ${JSON.stringify(agents)}` },
            { role: 'user', content: rawInput }
          ],
          temperature: 0.2,
          max_tokens: 200
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const plan = JSON.parse(data.content);
        if (Array.isArray(plan) && plan.every(a => agents.includes(a))) return plan;
      }
    } catch (e) { /* fallback */ }
    // Fallback to original rule-based plan
    if (category === "Unclassified") {
      return agents.filter(a => a !== "KnowledgeAgent");
    }
    return agents;
  }
}