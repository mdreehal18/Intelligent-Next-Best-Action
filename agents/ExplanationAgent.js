export class ExplanationAgent {
  constructor(blackboard) {
    this.blackboard = blackboard;
  }

  async execute() {
    this.blackboard.log("ExplanationAgent", "Generating explanation, citing playbooks, and evaluating confidence scores...");
    const state = this.blackboard.getState();

    // Try LLM explanation
    const llmExp = await this._llmExplain(state);
    if (llmExp) {
      this.blackboard.update("explanation.chainOfThought", llmExp.chainOfThought);
      this.blackboard.update("explanation.evidence", llmExp.evidence);
      this.blackboard.update("explanation.confidenceScore", llmExp.confidenceScore);
      this.blackboard.log("ExplanationAgent", `LLM explanation generated, confidence ${llmExp.confidenceScore}%.`);
      return;
    }

    // Fallback to original rule-based explanation (unchanged)
    const category = state.triage.category;
    const triageConfidence = state.triage.confidence || 0;
    const sentiment = state.extraction.sentiment;
    const urgency = state.extraction.urgency;
    const riskScore = state.biAnalysis.riskScore || 0;
    const riskFactors = state.biAnalysis.riskFactors || [];
    const opportunities = state.biAnalysis.opportunities || [];
    const playbook = state.knowledge.retrievedPlaybook || {};
    const memories = state.memory.similarPastCases || [];
    const accountName = (state.context && state.context.accountName) || "this account";

    const sentences = [];
    sentences.push(`The interaction was triaged as [${category}] with ${Math.round(triageConfidence * 100)}% confidence based on the language used in the raw input.`);
    if (urgency === "P1 Blocker" || urgency === "High") {
      sentences.push(`Extraction flagged ${urgency} urgency with ${sentiment.toLowerCase()} sentiment, indicating this needs a fast response.`);
    } else {
      sentences.push(`Extraction flagged ${urgency} urgency with ${sentiment.toLowerCase()} sentiment.`);
    }
    if (playbook.name) {
      sentences.push(`Per the "${playbook.name}", the recommended response follows established guidelines for this issue type.`);
    }
    if (riskFactors.length > 0) {
      sentences.push(`Risk analysis calculated a score of ${riskScore}/100 for ${accountName}, driven by: ${riskFactors.join("; ")}.`);
    } else {
      sentences.push(`Risk analysis calculated a low score of ${riskScore}/100 for ${accountName}, with no major risk factors detected.`);
    }
    if (opportunities.length > 0) {
      sentences.push(`The Opportunity Analysis Agent also identified ${opportunities.length} expansion signal(s): ${opportunities.map(o => o.type).join(", ")}.`);
    }
    if (memories.length > 0) {
      sentences.push(`Long-term memory surfaced a similar past case at "${memories[0].accountName}" (similarity ${memories[0].similarityScore}%), which resulted in: ${memories[0].outcome}`);
    } else {
      sentences.push("No closely matching historical case was found in long-term memory; this recommendation relies primarily on the playbook and current signals.");
    }
    if (category === "Unclassified") {
      sentences.push("Because no existing category matched this input strongly, recommendations are generic and a human should confirm or define a new category for this issue type.");
    }

    const chainOfThought = sentences.join("\n");
    let confidenceScore = Math.round(triageConfidence * 70);
    if (playbook.rules && playbook.rules.length > 0) confidenceScore += 15;
    if (memories.length > 0) confidenceScore += Math.round((memories[0].similarityScore || 0) * 0.15);
    if (category === "Unclassified") confidenceScore = Math.min(confidenceScore, 45);
    confidenceScore = Math.max(10, Math.min(confidenceScore, 99));

    const evidence = [];
    if (playbook.name && playbook.rules && playbook.rules.length > 0) {
      evidence.push(`Playbook Citation: "${playbook.name}" — Rule: "${playbook.rules[0]}"`);
    }
    if (memories.length > 0) {
      evidence.push(`Semantic Match: "${memories[0].accountName}" case (Similarity: ${memories[0].similarityScore}%) — Feedback: "${memories[0].feedback}"`);
    }
    if (riskFactors.length > 0) {
      evidence.push(`Risk Signal: ${riskFactors[0]}`);
    }

    this.blackboard.update("explanation.chainOfThought", chainOfThought);
    this.blackboard.update("explanation.evidence", evidence);
    this.blackboard.update("explanation.confidenceScore", confidenceScore);
    this.blackboard.log("ExplanationAgent", `Fallback explanation compiled. Confidence Score: ${confidenceScore}%.`);
  }

  async _llmExplain(state) {
    try {
      const context = {
        triage: state.triage,
        extraction: state.extraction,
        knowledge: state.knowledge.retrievedPlaybook?.name,
        risk: state.biAnalysis.riskScore,
        opportunities: state.biAnalysis.opportunities,
        memory: state.memory.similarPastCases.slice(0, 2).map(m => ({
          account: m.accountName,
          outcome: m.outcome,
          similarity: m.similarityScore
        })),
        recommendations: state.recommendation.nbas.map(r => r.title)
      };
      const resp = await fetch('/api/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `Generate a chain-of-thought explanation, a list of evidence items, and a confidence score (0-100) for the recommendations.
Output ONLY valid JSON: {"chainOfThought": "...", "evidence": ["...", "..."], "confidenceScore": number}` },
            { role: 'user', content: JSON.stringify(context) }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      return JSON.parse(data.content);
    } catch (e) { return null; }
  }
}