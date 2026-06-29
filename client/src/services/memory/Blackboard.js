export class Blackboard {
  constructor() {
    this.subscribers = [];
    this.reset();
  }
  reset() {
    this.state = {
      rawInput: "",
      context: {},
      triage: { category: "", confidence: 0, logs: [] },
      extraction: { sentiment: "Neutral", sentimentScore: 0.5, urgency: "Medium", entities: [], intent: "", logs: [] },
      knowledge: { retrievedPlaybook: null, retrievedDocs: [], logs: [] },
      memory: { similarPastCases: [], sessionHistory: [], logs: [] },
      biAnalysis: { riskScore: 0, riskFactors: [], opportunities: [], missingFields: [], logs: [] },
      loopState: { dataGatheringNeeded: false, loopCount: 0, resolvedGaps: {}, logs: [] },
      recommendation: { nbas: [], logs: [] },
      explanation: { chainOfThought: "", evidence: [], confidenceScore: 0, logs: [] },
      hitl: { status: "Pending", userFeedback: "", decisionDate: null },
      execution: { actionsExecuted: [], logs: [] }
    };
    this.notify();
  }
  update(path, value) {
    const keys = path.split('.');
    let current = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    this.notify();
  }
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }
  log(agentName, message) {
    console.log(`[${agentName}] ${message}`);
    const entry = { timestamp: new Date().toLocaleTimeString(), message };
    if (agentName.includes("Planner")) this.state.triage.logs.push(entry);
    else if (agentName.includes("Interaction")) this.state.extraction.logs.push(entry);
    else if (agentName.includes("Knowledge")) this.state.knowledge.logs.push(entry);
    else if (agentName.includes("Memory")) this.state.memory.logs.push(entry);
    else if (agentName.includes("BI") || agentName.includes("Risk") || agentName.includes("Opportunity") || agentName.includes("Missing")) this.state.biAnalysis.logs.push(entry);
    else if (agentName.includes("Gathering") || agentName.includes("DataCollection")) this.state.loopState.logs.push(entry);
    else if (agentName.includes("Recommendation")) this.state.recommendation.logs.push(entry);
    else if (agentName.includes("Explanation")) this.state.explanation.logs.push(entry);
    else this.state.execution.logs.push(entry);
    this.notify();
  }
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => { this.subscribers = this.subscribers.filter(sub => sub !== callback); };
  }
  notify() {
    this.subscribers.forEach(callback => callback(this.getState()));
  }
}
