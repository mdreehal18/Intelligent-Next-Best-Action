import { CATEGORIES } from "../data/categories.js";
import { apiFetch } from "../api.js";

export class RecommendationAgent {
  constructor(blackboard) {
    this.blackboard = blackboard;
  }

  async execute() {
    this.blackboard.log("RecommendationAgent", "Synthesizing risks, opportunities, and historical memory to generate Next Best Actions...");
    const state = this.blackboard.getState();
    const category = state.triage.category;
    const context = state.context || {};
    const opportunities = state.biAnalysis.opportunities || [];
    const entities = state.extraction.entities || [];

    const ctx = {
      accountName: context.accountName,
      primaryContact: context.primaryContact,
      decisionMaker: context.decisionMaker,
      entityHint: entities[0],
      hasCrossSell: opportunities.some(o => o.type === "Module Cross-Sell"),
    };

    const llmNBAs = await this._llmGenerate(state);
    if (llmNBAs) {
      this.blackboard.update("recommendation.nbas", llmNBAs);
      this.blackboard.log("RecommendationAgent", `LLM-generated ${llmNBAs.length} NBAs.`);
      return;
    }

    const categoryDef = CATEGORIES[category];
    const templates = categoryDef && categoryDef.nbaTemplates ? categoryDef.nbaTemplates : this._genericTemplates();
    const nbas = templates.map((tpl, idx) => ({
      id: `nba_${category.toLowerCase()}_${idx + 1}`,
      title: this.resolve(tpl.title, ctx),
      actionType: this.resolve(tpl.actionType, ctx),
      details: this.resolve(tpl.details, ctx),
      impact: this.resolve(tpl.impact, ctx),
      priority: this.resolve(tpl.priority, ctx)
    }));

    opportunities.forEach((opp, i) => {
      const alreadyCovered = nbas.some(n => n.details.toLowerCase().includes(opp.type.toLowerCase()));
      if (!alreadyCovered) {
        nbas.push({
          id: `nba_opp_${category.toLowerCase()}_${i + 1}`,
          title: `Pursue Opportunity: ${opp.type}`,
          actionType: "Flag for Sales/CS Review",
          details: `${opp.signal} ${opp.details}`,
          impact: "Captures upside identified by the Opportunity Analysis Agent.",
          priority: "Medium"
        });
      }
    });

    this.blackboard.update("recommendation.nbas", nbas);
    this.blackboard.log("RecommendationAgent", `Template-generated ${nbas.length} NBAs.`);
  }

  async _llmGenerate(state) {
    try {
      const contextStr = JSON.stringify({
        category: state.triage.category,
        extraction: state.extraction,
        risk: state.biAnalysis.riskScore,
        opportunities: state.biAnalysis.opportunities,
        missingInfo: state.biAnalysis.missingFields,
        memory: state.memory.similarPastCases.map(m => ({ outcome: m.outcome, feedback: m.feedback }))
      });
      const resp = await apiFetch('/api/complete', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `You are a customer success advisor. Generate 3 Next Best Actions as a JSON array. Each object must have:
- title (string)
- actionType (string, e.g. "Create Ticket", "Send Email")
- details (string, personalized)
- impact (string)
- priority (High/Medium/Low)

Base your suggestions on the given context.` },
            { role: 'user', content: contextStr }
          ],
          temperature: 0.5,
          max_tokens: 600
        })
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      const nbas = JSON.parse(data.content).slice(0, 3);
      nbas.forEach((n, i) => n.id = `nba_${state.triage.category.toLowerCase()}_${i+1}`);
      return nbas;
    } catch (e) { return null; }
  }

  resolve(value, ctx) {
    if (typeof value === "function") return value(ctx);
    return value;
  }

  _genericTemplates() {
    return [
      {
        title: () => "Acknowledge and Triage with Account Owner",
        actionType: "Task Creation",
        details: (ctx) => `This issue did not match an existing playbook category. Route to the account owner for ${ctx.accountName || "this account"} for manual triage, and consider defining a new category if this issue type recurs.`,
        impact: "Ensures unclassified issues are not silently dropped.",
        priority: "High"
      },
      {
        title: () => "Log Interaction for Pattern Detection",
        actionType: "System Configuration",
        details: () => "Store this interaction in long-term memory so future similar tickets can be matched and a dedicated playbook can be authored.",
        impact: "Improves future triage accuracy as new issue types recur.",
        priority: "Medium"
      }
    ];
  }
}
