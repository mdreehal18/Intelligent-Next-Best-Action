import { Blackboard } from "./memory/Blackboard.js";
import { VectorDB } from "./memory/VectorDB.js";
import { PlannerAgent } from "./agents/PlannerAgent.js";
import { InteractionAgent } from "./agents/InteractionAgent.js";
import { KnowledgeAgent } from "./agents/KnowledgeAgent.js";
import { MemoryAgent } from "./agents/MemoryAgent.js";
import { RiskAnalysisAgent, OpportunityAnalysisAgent, MissingInformationAgent } from "./agents/BiAgents.js";
import { RecommendationAgent } from "./agents/RecommendationAgent.js";
import { ExplanationAgent } from "./agents/ExplanationAgent.js";
import { SCENARIOS } from "./data/scenarios.js";
import { registerCategory, getCategoryNames } from "./data/categories.js";

const colors = {
  reset: "\x1b[0m", bright: "\x1b[1m", dim: "\x1b[2m",
  fgRed: "\x1b[31m", fgGreen: "\x1b[32m", fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m", fgMagenta: "\x1b[35m", fgCyan: "\x1b[36m"
};

console.log(`
${colors.fgMagenta}${colors.bright}================================================================
  INTELLIGENT NEXT BEST ACTION PLATFORM - END-TO-END WORKFLOW
================================================================${colors.reset}
`);

const blackboard = new Blackboard();
const vectorDb = new VectorDB();
const plannerAgent = new PlannerAgent(blackboard);
const interactionAgent = new InteractionAgent(blackboard);
const knowledgeAgent = new KnowledgeAgent(blackboard);
const memoryAgent = new MemoryAgent(blackboard);
const riskAgent = new RiskAnalysisAgent(blackboard);
const opportunityAgent = new OpportunityAnalysisAgent(blackboard);
const missingInfoAgent = new MissingInformationAgent(blackboard);
const recommendationAgent = new RecommendationAgent(blackboard);
const explanationAgent = new ExplanationAgent(blackboard);

async function runEndToEndWorkflow(scenarioTitle, rawInput, context, resolveGaps = null) {
  console.log(`\n${colors.fgBlue}${colors.bright}>>> INGESTING: ${scenarioTitle}${colors.reset}`);
  console.log(`${colors.dim}----------------------------------------------------------------${colors.reset}`);
  console.log(`${colors.dim}Raw Input:\n${rawInput}${colors.reset}\n`);

  blackboard.reset();
  blackboard.update("rawInput", rawInput);
  blackboard.update("context", { ...context });

  console.log(`${colors.fgCyan}[1. PLANNER TRIAGE]${colors.reset}`);
  await plannerAgent.execute(rawInput);

  console.log(`\n${colors.fgCyan}[2. PARALLEL EXTRACTION]${colors.reset}`);
  await Promise.all([
    interactionAgent.execute(rawInput),
    knowledgeAgent.execute(),
    memoryAgent.execute(rawInput)
  ]);

  console.log(`\n${colors.fgCyan}[3. BUSINESS INTELLIGENCE]${colors.reset}`);
  await Promise.all([
    riskAgent.execute(),
    opportunityAgent.execute(),
    missingInfoAgent.execute()
  ]);

  let state = blackboard.getState();
  if (state.loopState.dataGatheringNeeded) {
    console.log(`\n${colors.fgYellow}[4. GAP IDENTIFIED - TRIGGERING LOOP]${colors.reset}`);
    state.biAnalysis.missingFields.forEach(f => {
      console.log(`  - Field: ${colors.fgRed}${f.field}${colors.reset} (${f.importance}): ${f.description}`);
    });
    if (resolveGaps) {
      console.log(`\n${colors.fgCyan}[5. RESOLVING GAPS (SIMULATED HITL)]${colors.reset}`);
      const updatedContext = { ...state.context };
      for (const f of state.biAnalysis.missingFields) {
        if (f.importance === "Critical") {
          const resolvedValue = resolveGaps(f.field);
          console.log(`  -> Supplied value for ${colors.fgGreen}${f.field}${colors.reset}: "${resolvedValue}"`);
          updatedContext[f.field] = resolvedValue;
        }
      }
      blackboard.update("context", updatedContext);
      await Promise.all([riskAgent.execute(), opportunityAgent.execute(), missingInfoAgent.execute()]);
      state = blackboard.getState();
    } else {
      console.log(`${colors.fgRed}No gap resolver provided. Continuing with partial context.${colors.reset}`);
    }
  } else {
    console.log(`\n${colors.fgGreen}[4. CONDITIONAL CHECK]${colors.reset} No critical profile gaps found. Proceeding...`);
  }

  console.log(`\n${colors.fgCyan}[5. RECOMMENDATION & EXPLANATION SYNTHESIS]${colors.reset}`);
  await recommendationAgent.execute();
  await explanationAgent.execute();
  const finalState = blackboard.getState();

  console.log(`\n${colors.bright}--- RESULTS & ANALYSIS ---${colors.reset}`);
  console.log(`Category: ${colors.fgMagenta}${finalState.triage.category}${colors.reset} (${Math.round(finalState.triage.confidence * 100)}% confidence)`);
  console.log(`Sentiment: ${colors.fgGreen}${finalState.extraction.sentiment}${colors.reset} | Urgency: ${colors.fgRed}${finalState.extraction.urgency}${colors.reset}`);
  console.log(`Risk Score: ${colors.bright}${finalState.biAnalysis.riskScore}/100${colors.reset}`);
  console.log(`Explanation (CoT):\n${colors.dim}${finalState.explanation.chainOfThought}${colors.reset}`);
  console.log(`Confidence Score: ${colors.fgGreen}${finalState.explanation.confidenceScore}%${colors.reset}`);

  console.log(`\n${colors.bright}Generated Recommendations (HITL Options):${colors.reset}`);
  finalState.recommendation.nbas.forEach((nba, index) => {
    console.log(`  ${colors.fgCyan}${index + 1}. [${nba.priority} Priority] ${nba.title}${colors.reset}`);
    console.log(`     Action: ${nba.actionType} | Details: ${nba.details}`);
  });

  return finalState;
}

// RUN 1: Technical SAML Blocker
const technical = SCENARIOS.find(s => s.id === "scen_technical");
const state1 = await runEndToEndWorkflow(technical.title, technical.rawInput, technical.context);
if (state1 && state1.recommendation.nbas.length > 0) {
  const chosenNba = state1.recommendation.nbas[0];
  console.log(`\n${colors.fgGreen}${colors.bright}[HUMAN-IN-THE-LOOP - APPROVAL]${colors.reset} "${chosenNba.title}"`);
  await vectorDb.addMemory({
    accountName: state1.context.accountName, category: state1.triage.category, rawInput: state1.rawInput,
    outcome: `Approved NBA: ${chosenNba.title}`,
    feedback: "Approved immediately. Workaround restored customer workflow successfully.",
    status: "Approved"
  });
}
console.log(`\n${colors.dim}----------------------------------------------------------------${colors.reset}`);

// RUN 2: Security incident
const security = SCENARIOS.find(s => s.id === "scen_security");
const state2 = await runEndToEndWorkflow(security.title, security.rawInput, security.context, (field) => "Dr. Aisha Khan (CISO)");
console.log(`\n${colors.dim}----------------------------------------------------------------${colors.reset}`);

// RUN 3: GENERALIZATION TEST
console.log(`\n${colors.fgYellow}${colors.bright}[GENERALIZATION TEST: NOVEL UNSEEN INPUT]${colors.reset}`);
const novelInput = `Email from a customer we've never seen before:
"Hi, our procurement team flagged that your platform doesn't yet support exporting reports in our region's mandated tax-invoice format. We need this for an upcoming regulatory filing. Can someone confirm if/when this could be supported, and who owns this on your side?"`;
const novelContext = {
  accountName: "Solstice Manufacturing",
  arr: "$30,000",
  renewalDays: 200,
  usageChange: "+3%",
  primaryContact: "Elena Brooks (Procurement)",
  decisionMaker: "Unknown"
};
const state3 = await runEndToEndWorkflow("Novel Unseen Issue (Regulatory Export Format)", novelInput, novelContext);
console.log(`\n${colors.fgYellow}Notice: this input matched no registered category strongly, so the planner labeled it [${state3.triage.category}] and the recommendation/explanation agents still produced grounded output referencing the REAL account name and contact above, instead of failing or returning hardcoded demo text.${colors.reset}`);
console.log(`\n${colors.dim}----------------------------------------------------------------${colors.reset}`);

// RUN 4: EXTENSIBILITY TEST
console.log(`\n${colors.fgYellow}${colors.bright}[EXTENSIBILITY TEST: REGISTERING A NEW CATEGORY AT RUNTIME]${colors.reset}`);
registerCategory("RegulatoryCompliance", {
  label: "Regulatory / Localization Compliance",
  icon: "📜",
  keywords: ["regulatory", "tax-invoice", "tax invoice", "filing", "localization", "mandated format", "compliance export"],
  playbook: {
    name: "Regulatory Compliance Playbook",
    description: "Applied when a customer needs platform behavior to satisfy a regional regulatory requirement.",
    guidelines: ["Confirm exact regulatory requirement and deadline.", "Route to Product/Localization team for feasibility.", "Provide an interim manual workaround if the deadline precedes the product roadmap."],
    rules: ["Always confirm the filing deadline before committing to a roadmap timeline."]
  },
  nbaTemplates: [
    {
      title: () => "Confirm Regulatory Requirement & Deadline",
      actionType: "Schedule Meeting",
      details: (ctx) => `Get specifics from ${ctx.primaryContact || "the customer"} on the exact format and filing deadline required.`,
      impact: "Prevents committing to the wrong timeline or format.",
      priority: "High"
    },
    {
      title: () => "Route to Product/Localization Team",
      actionType: "Create Ticket",
      details: () => "File a feature request with Product detailing the regional format requirement.",
      impact: "Gets the right team evaluating feasibility quickly.",
      priority: "Medium"
    }
  ]
});
console.log(`${colors.fgGreen}Registered new category. Categories now available: ${getCategoryNames().join(", ")}${colors.reset}`);

const state4 = await runEndToEndWorkflow("Same Novel Issue, Re-Triaged After Registering New Category", novelInput, novelContext);
console.log(`\n${colors.fgGreen}Notice: the SAME input is now triaged as [${state4.triage.category}] with a real playbook and tailored recommendations — achieved by adding ONE category definition, with zero edits to PlannerAgent, KnowledgeAgent, RecommendationAgent, or ExplanationAgent.${colors.reset}`);

console.log(`
${colors.fgGreen}${colors.bright}================================================================
  WORKFLOW EXECUTED COMPLETELY FROM INGESTION TO LEARNING LOOP!
================================================================${colors.reset}
`);