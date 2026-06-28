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
import { CATEGORIES, getCategoryNames, registerCategory } from "./data/categories.js";

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

const selectScenario = document.getElementById("scenario-select");
const textareaInput = document.getElementById("raw-input");
const btnRun = document.getElementById("btn-run");
const btnClearDb = document.getElementById("btn-clear-db");
const selectStepDelay = document.getElementById("step-delay");
const selectOverride = document.getElementById("category-override");
const btnClearLogs = document.getElementById("btn-clear-logs");
const divLogs = document.getElementById("console-logs");
const divLoopModal = document.getElementById("loop-modal");
const divGapsList = document.getElementById("gaps-list");
const inputGapResolver = document.getElementById("gap-resolver-input");
const labelGapInput = document.getElementById("gap-input-label");
const btnSubmitGap = document.getElementById("btn-submit-gap");
const btnCancelGather = document.getElementById("btn-cancel-gather");
const divNbaOutput = document.getElementById("nba-output-section");
const divNbaEmptyState = document.getElementById("nba-empty-state");
const textCot = document.getElementById("explanation-cot");
const textConfidence = document.getElementById("explanation-confidence");
const ulEvidence = document.getElementById("explanation-evidence");
const divNbaCards = document.getElementById("nba-cards-list");
const cellCategory = document.getElementById("bb-category");
const cellTriageConf = document.getElementById("bb-triage-conf");
const cellSentiment = document.getElementById("bb-sentiment");
const cellUrgency = document.getElementById("bb-urgency");
const cellAccountMeta = document.getElementById("bb-account-meta");
const cellRiskScore = document.getElementById("bb-risk-score");
const fillRiskMeter = document.getElementById("bb-risk-fill");
const divRiskFactors = document.getElementById("bb-risk-factors");
const divEntities = document.getElementById("bb-entities");
const divVectorDbList = document.getElementById("vector-db-list");
const inputNewCatName = document.getElementById("new-cat-name");
const inputNewCatKeywords = document.getElementById("new-cat-keywords");
const inputNewCatGuideline = document.getElementById("new-cat-guideline");
const btnAddCategory = document.getElementById("btn-add-category");
const divNewCategoryStatus = document.getElementById("new-category-status");

let currentScenario = null;
let activeGaps = [];
let currentGapIndex = 0;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function init() {
  populateScenarios();
  populateCategoryOverrides();
  renderVectorDBMemories();
  renderOutcomesDashboard();

  selectScenario.addEventListener("change", (e) => {
    const selected = SCENARIOS.find(s => s.id === e.target.value);
    if (selected) {
      currentScenario = selected;
      textareaInput.value = selected.rawInput;
      blackboard.reset();
      clearNodeGraph();
      divNbaOutput.style.display = "none";
      divNbaEmptyState.style.display = "flex";
      blackboard.log("System", `Loaded scenario profile: "${selected.title}"`);
    }
  });

  btnRun.addEventListener("click", () => runPipeline());

  btnClearDb.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear long-term memories back to defaults?")) {
      vectorDb.clear();
      renderVectorDBMemories();
      renderOutcomesDashboard();
      blackboard.log("System", "Vector DB memory reset to defaults.");
    }
  });

  btnClearLogs.addEventListener("click", () => {
    divLogs.innerHTML = "";
  });

  btnAddCategory.addEventListener("click", () => handleRegisterCategory());

  blackboard.subscribe((state) => {
    updateBlackboardUI(state);
    updateLogsUI(state);
  });

  if (SCENARIOS.length > 0) {
    selectScenario.value = SCENARIOS[0].id;
    selectScenario.dispatchEvent(new Event("change"));
  }
}

function populateCategoryOverrides() {
  const names = getCategoryNames();
  selectOverride.innerHTML = `<option value="">None (Auto-triage)</option>` +
    names.map(name => `<option value="${name}">Force ${CATEGORIES[name].label || name}</option>`).join("");
}

function handleRegisterCategory() {
  const name = inputNewCatName.value.trim();
  const keywordsRaw = inputNewCatKeywords.value.trim();
  const guideline = inputNewCatGuideline.value.trim();

  if (!name || !keywordsRaw) {
    alert("Please provide at least a category name and one or more trigger keywords.");
    return;
  }
  if (CATEGORIES[name]) {
    alert(`Category "${name}" already exists.`);
    return;
  }

  const keywords = keywordsRaw.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);

  registerCategory(name, {
    label: name,
    icon: "🆕",
    keywords,
    playbook: {
      name: `${name} Playbook (User-Defined)`,
      description: `Custom playbook registered at runtime for the "${name}" issue type.`,
      guidelines: guideline ? [guideline] : ["Triage manually and confirm best response with a senior CSM."],
      rules: guideline ? [guideline] : []
    },
    nbaTemplates: [
      {
        title: () => `Triage New "${name}" Issue with Account Owner`,
        actionType: "Task Creation",
        details: (ctx) => `${guideline || "Manually review this newly categorized issue type."} Route to the account owner for ${ctx.accountName || "this account"}.`,
        impact: "Ensures the new issue type gets a deliberate first response while more cases build up history.",
        priority: "High"
      },
      {
        title: () => "Log Outcome to Strengthen Future Triage",
        actionType: "System Configuration",
        details: () => `Record the outcome of this "${name}" case in long-term memory so future similar tickets are matched faster.`,
        impact: "Improves recommendation quality for this category as more examples accumulate.",
        priority: "Medium"
      }
    ]
  });

  populateCategoryOverrides();
  inputNewCatName.value = "";
  inputNewCatKeywords.value = "";
  inputNewCatGuideline.value = "";

  divNewCategoryStatus.style.display = "block";
  divNewCategoryStatus.innerText = `✅ Category "${name}" registered and is now triageable. Total categories: ${getCategoryNames().length}.`;
  blackboard.log("System", `New category registered at runtime: "${name}" with ${keywords.length} trigger keyword(s).`);
}

function populateScenarios() {
  selectScenario.innerHTML = SCENARIOS.map(
    s => `<option value="${s.id}">${s.title} (${s.category})</option>`
  ).join("");
}

async function runPipeline() {
  const rawInput = textareaInput.value.trim();
  if (!rawInput) {
    alert("Please write or paste customer interaction details.");
    return;
  }

  btnRun.disabled = true;
  clearNodeGraph();
  divNbaOutput.style.display = "none";
  divNbaEmptyState.style.display = "none";

  blackboard.reset();
  blackboard.update("rawInput", rawInput);
  if (currentScenario) {
    blackboard.update("context", { ...currentScenario.context });
  }

  const stepDelayMs = parseInt(selectStepDelay.value);

  try {
    highlightNode("node-triage", "active");
    updateConnectorLine(15);
    const categoryOverride = selectOverride.value || null;
    await plannerAgent.execute(rawInput, categoryOverride);

    if (stepDelayMs > 0) await delay(stepDelayMs);
    highlightNode("node-triage", "completed");
    highlightNode("node-extraction", "active");
    highlightNode("node-knowledge", "active");
    highlightNode("node-memory", "active");
    updateConnectorLine(55);
    blackboard.log("Orchestrator", "Triggering parallel Extraction, Knowledge RAG, and Memory agents...");

    await Promise.all([
      interactionAgent.execute(rawInput),
      knowledgeAgent.execute(),
      memoryAgent.execute(rawInput)
    ]);

    if (stepDelayMs > 0) await delay(stepDelayMs);
    highlightNode("node-extraction", "completed");
    highlightNode("node-knowledge", "completed");
    highlightNode("node-memory", "completed");
    highlightNode("node-bi", "active");
    updateConnectorLine(80);

    blackboard.log("Orchestrator", "Triggering parallel BI Agents: Risk, Opportunity, and Missing Info...");

    await Promise.all([
      riskAgent.execute(),
      opportunityAgent.execute(),
      missingInfoAgent.execute()
    ]);

    if (stepDelayMs > 0) await delay(stepDelayMs);
    highlightNode("node-bi", "completed");

    const currentState = blackboard.getState();
    if (currentState.loopState.dataGatheringNeeded) {
      blackboard.log("Orchestrator", "CRITICAL gaps found! Pausing pipeline execution for Data Gathering Loop.");
      handleDataGatheringLoop(currentState.biAnalysis.missingFields);
      return;
    }

    await finalizeRecommendations(stepDelayMs);
  } catch (error) {
    console.error("Pipeline failed:", error);
    blackboard.log("System Error", `Execution halted: ${error.message}`);
    btnRun.disabled = false;
  }
}

function handleDataGatheringLoop(missingFields) {
  activeGaps = missingFields.filter(f => f.importance === "Critical");
  currentGapIndex = 0;

  if (activeGaps.length === 0) {
    blackboard.log("Orchestrator", "No critical gaps remain. Proceeding to recommendation.");
    finalizeRecommendations(parseInt(selectStepDelay.value));
    return;
  }

  divLoopModal.style.display = "flex";
  divGapsList.innerHTML = missingFields.map(
    f => `<div style="font-size: 0.8rem; border-left: 2px solid ${f.importance === 'Critical' ? 'var(--color-risk-high)' : 'var(--color-risk-med)'}; padding-left: 6px; margin: 4px 0;">
            <strong style="color: #fff">${f.field}</strong> [${f.importance}]: ${f.description}
          </div>`
  ).join("");

  presentNextGapField();

  btnSubmitGap.onclick = () => submitGapResolution();
  btnCancelGather.onclick = () => {
    divLoopModal.style.display = "none";
    blackboard.log("Orchestrator", "Data gathering loop aborted by user.");
    btnRun.disabled = false;
  };
}

function presentNextGapField() {
  if (currentGapIndex >= activeGaps.length) {
    divLoopModal.style.display = "none";
    blackboard.log("Orchestrator", "Feedback received. Re-running BI validation...");

    Promise.all([
      riskAgent.execute(),
      opportunityAgent.execute(),
      missingInfoAgent.execute()
    ]).then(() => {
      const state = blackboard.getState();
      if (state.loopState.dataGatheringNeeded) {
        handleDataGatheringLoop(state.biAnalysis.missingFields);
      } else {
        finalizeRecommendations(parseInt(selectStepDelay.value));
      }
    });
    return;
  }

  const gap = activeGaps[currentGapIndex];
  labelGapInput.innerText = `Enter details for CRITICAL field [${gap.field}]:`;
  inputGapResolver.placeholder = gap.description;
  inputGapResolver.value = "";
  inputGapResolver.focus();
}

function submitGapResolution() {
  const value = inputGapResolver.value.trim();
  if (!value) {
    alert("Please provide the missing detail to proceed.");
    return;
  }

  const gap = activeGaps[currentGapIndex];
  blackboard.log("HITL Data Gathering", `Provided detail for [${gap.field}]: "${value}"`);

  const context = blackboard.getState().context;
  context[gap.field] = value;
  blackboard.update("context", context);

  currentGapIndex++;
  presentNextGapField();
}

async function finalizeRecommendations(stepDelayMs) {
  highlightNode("node-recommendation", "active");
  updateConnectorLine(100);
  blackboard.log("Orchestrator", "Generating final recommendations and explanations...");

  await recommendationAgent.execute();
  await explanationAgent.execute();

  if (stepDelayMs > 0) await delay(stepDelayMs);
  highlightNode("node-recommendation", "completed");

  divNbaOutput.style.display = "flex";
  renderRecommendationsUI();

  btnRun.disabled = false;
  blackboard.log("Orchestrator", "Recommendation process successfully finished. Awaiting Human-in-the-Loop decision.");
}

function updateBlackboardUI(state) {
  cellCategory.innerText = state.triage.category || "-";
  cellTriageConf.innerText = state.triage.confidence ? `${Math.round(state.triage.confidence * 100)}%` : "-";

  cellSentiment.innerText = state.extraction.sentiment || "-";
  if (state.extraction.sentiment === "Negative") {
    cellSentiment.style.color = "var(--color-risk-high)";
  } else if (state.extraction.sentiment === "Positive") {
    cellSentiment.style.color = "var(--color-risk-low)";
  } else {
    cellSentiment.style.color = "";
  }
  cellUrgency.innerText = state.extraction.urgency || "-";

  const ctx = state.context || {};
  cellAccountMeta.innerHTML = `
    <div><strong>Account:</strong> ${ctx.accountName || "Unknown"}</div>
    <div><strong>ARR:</strong> ${ctx.arr || "Unknown"}</div>
    <div><strong>Renewal Window:</strong> ${ctx.renewalDays ? ctx.renewalDays + ' days' : 'Unknown'}</div>
    <div><strong>Usage Change:</strong> ${ctx.usageChange || '0%'}</div>
    <div><strong>Key Contact:</strong> ${ctx.primaryContact || 'Unknown'}</div>
    <div><strong>Decision Maker:</strong> ${ctx.decisionMaker || 'Unknown'}</div>
  `;

  cellRiskScore.innerText = state.biAnalysis.riskScore ? `${state.biAnalysis.riskScore}%` : "-%";
  fillRiskMeter.style.width = `${state.biAnalysis.riskScore || 0}%`;

  if (state.biAnalysis.riskScore > 60) {
    fillRiskMeter.style.backgroundColor = "var(--color-risk-high)";
    cellRiskScore.style.color = "var(--color-risk-high)";
  } else if (state.biAnalysis.riskScore > 30) {
    fillRiskMeter.style.backgroundColor = "var(--color-risk-med)";
    cellRiskScore.style.color = "var(--color-risk-med)";
  } else {
    fillRiskMeter.style.backgroundColor = "var(--color-risk-low)";
    cellRiskScore.style.color = "var(--color-risk-low)";
  }

  divRiskFactors.innerHTML = state.biAnalysis.riskFactors.map(
    f => `<div style="display:flex; align-items:start; gap:4px;">❌ <span style="font-size:0.7rem;">${f}</span></div>`
  ).join("") || "No risks flags active.";

  divEntities.innerHTML = state.extraction.entities.map(
    ent => `<span class="badge" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:var(--text-glow);">${ent}</span>`
  ).join("") || "<span style='font-size:0.75rem; color:var(--text-muted);'>No entities found</span>";
}

function updateLogsUI(state) {
  const allLogs = [
    ...state.triage.logs.map(l => ({ ...l, type: "triage" })),
    ...state.extraction.logs.map(l => ({ ...l, type: "extraction" })),
    ...state.knowledge.logs.map(l => ({ ...l, type: "knowledge" })),
    ...state.memory.logs.map(l => ({ ...l, type: "memory" })),
    ...state.biAnalysis.logs.map(l => ({ ...l, type: "bi" })),
    ...state.loopState.logs.map(l => ({ ...l, type: "loop" })),
    ...state.recommendation.logs.map(l => ({ ...l, type: "rec" })),
    ...state.explanation.logs.map(l => ({ ...l, type: "explanation" })),
    ...state.execution.logs.map(l => ({ ...l, type: "execution" }))
  ];

  divLogs.innerHTML = allLogs.map(log => {
    let cls = "console-line";
    if (log.message.includes("failed") || log.message.includes("Error")) cls += " warn";
    if (log.message.includes("Successfully") || log.message.includes("Complete")) cls += " success";
    return `<div class="${cls}"><span>[${log.timestamp}]</span>${log.message}</div>`;
  }).join("");

  divLogs.scrollTop = divLogs.scrollHeight;
}

function renderRecommendationsUI() {
  const state = blackboard.getState();

  textCot.innerText = state.explanation.chainOfThought;
  textConfidence.innerText = `CONFIDENCE: ${state.explanation.confidenceScore}%`;

  if (state.explanation.confidenceScore > 85) {
    textConfidence.className = "badge badge-green";
  } else if (state.explanation.confidenceScore > 65) {
    textConfidence.className = "badge badge-orange";
  } else {
    textConfidence.className = "badge badge-red";
  }

  ulEvidence.innerHTML = state.explanation.evidence.map(
    ev => `<div class="evidence-item">📖 <span style="flex:1;">${ev}</span></div>`
  ).join("");

  divNbaCards.innerHTML = state.recommendation.nbas.map((nba, idx) => {
    return `
      <div id="card-${nba.id}" class="nba-card">
        <div class="nba-header">
          <h4 class="nba-title">${idx + 1}. ${nba.title}</h4>
          <span class="badge ${nba.priority === 'High' ? 'badge-red' : 'badge-orange'}">${nba.priority} Priority</span>
        </div>
        <div class="nba-meta">
          <span>Type: <strong>${nba.actionType}</strong></span>
        </div>
        <p class="nba-details">${nba.details}</p>
        <div class="nba-impact">Impact: ${nba.impact}</div>
        <div id="decision-row-${nba.id}" class="nba-actions-row">
          <button class="btn btn-sm btn-approve" data-id="${nba.id}">Approve & Execute</button>
          <button class="btn btn-sm btn-secondary btn-reject" data-id="${nba.id}">Reject Action</button>
        </div>
        <div id="feedback-form-${nba.id}" style="display:none; flex-direction:column; gap:6px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.06); padding-top:8px;">
          <label style="font-size:0.7rem; color:var(--color-risk-high)">Reason for Rejection / Modification:</label>
          <input type="text" id="feedback-input-${nba.id}" placeholder="e.g. Budget discount is too high, customer has low churn risk">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button class="btn btn-sm btn-secondary btn-feedback-cancel" data-id="${nba.id}">Cancel</button>
            <button class="btn btn-sm btn-feedback-submit" data-id="${nba.id}" style="background:var(--color-risk-high)">Log Rejection</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".btn-approve").forEach(btn => {
    btn.onclick = (e) => approveAction(e.target.dataset.id);
  });
  document.querySelectorAll(".btn-reject").forEach(btn => {
    btn.onclick = (e) => showRejectionForm(e.target.dataset.id);
  });
}

async function approveAction(id) {
  const state = blackboard.getState();
  const nba = state.recommendation.nbas.find(n => n.id === id);
  if (!nba) return;

  blackboard.log("HITL", `Recommendation APPROVED: "${nba.title}"`);

  const decisionRow = document.getElementById(`decision-row-${id}`);
  if (decisionRow) decisionRow.style.display = "none";

  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.add("approved");

  blackboard.log("Executor", `[Execution Action] Successfully executed: ${nba.actionType}. Detail: "${nba.details}"`);

  await vectorDb.addMemory({
    accountName: state.context.accountName || "Unknown Account",
    category: state.triage.category,
    rawInput: state.rawInput,
    outcome: `Approved NBA: ${nba.title}. Action Type: ${nba.actionType}`,
    feedback: "Approved by CS Manager with no modifications. Recommendation validated.",
    status: "Approved"
  });

  renderVectorDBMemories();
  renderOutcomesDashboard();
}

function showRejectionForm(id) {
  const feedbackForm = document.getElementById(`feedback-form-${id}`);
  const decisionRow = document.getElementById(`decision-row-${id}`);
  if (feedbackForm && decisionRow) {
    feedbackForm.style.display = "flex";
    decisionRow.style.display = "none";
  }

  const cancelBtn = feedbackForm.querySelector(".btn-feedback-cancel");
  cancelBtn.onclick = () => {
    feedbackForm.style.display = "none";
    decisionRow.style.display = "flex";
  };

  const submitBtn = feedbackForm.querySelector(".btn-feedback-submit");
  submitBtn.onclick = () => {
    const input = document.getElementById(`feedback-input-${id}`);
    const reason = input.value.trim() || "No explanation provided.";
    submitRejection(id, reason);
  };
}

async function submitRejection(id, reason) {
  const state = blackboard.getState();
  const nba = state.recommendation.nbas.find(n => n.id === id);
  if (!nba) return;

  blackboard.log("HITL", `Recommendation REJECTED: "${nba.title}". Reason: "${reason}"`);

  const feedbackForm = document.getElementById(`feedback-form-${id}`);
  if (feedbackForm) feedbackForm.style.display = "none";

  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.add("rejected");

  await vectorDb.addMemory({
    accountName: state.context.accountName || "Unknown Account",
    category: state.triage.category,
    rawInput: state.rawInput,
    outcome: `Rejected NBA: ${nba.title}`,
    feedback: `Rejected by human. Reason: ${reason}`,
    status: "Rejected"
  });

  renderVectorDBMemories();
  renderOutcomesDashboard();
}

function renderVectorDBMemories() {
  const memories = vectorDb.getMemories();

  if (memories.length === 0) {
    divVectorDbList.innerHTML = `<div style="font-size:0.75rem; text-align:center; color:var(--text-muted); margin-top:20px;">No memory entries.</div>`;
    return;
  }

  divVectorDbList.innerHTML = memories.map(mem => {
    let badgeClass = "badge-green";
    if (mem.status === "Rejected") badgeClass = "badge-red";

    return `
      <div class="memory-history-card">
        <div class="memory-header">
          <span>${mem.accountName} [${mem.category}]</span>
          <span class="badge ${badgeClass}" style="font-size: 0.65rem; padding: 1px 4px;">${mem.status}</span>
        </div>
        <div style="color:var(--text-muted); margin-bottom:4px; font-style:italic;">"${mem.rawInput.substring(0, 75)}${mem.rawInput.length > 75 ? '...' : ''}"</div>
        <div style="color:var(--text-glow);"><strong>Decision:</strong> ${mem.outcome}</div>
        <div style="color:#a7f3d0; margin-top:4px; font-size:0.7rem; background:rgba(16,185,129,0.04); padding:3px; border-radius:4px;">
          📝 ${mem.feedback}
        </div>
      </div>
    `;
  }).join("");
}

function renderOutcomesDashboard() {
  const all = vectorDb.getMemories();
  const approved = all.filter(m => m.status === 'Approved');
  const rejected = all.filter(m => m.status === 'Rejected');
  document.getElementById('approval-rate').textContent = all.length ? `${Math.round(approved.length/all.length*100)}%` : '--%';
  document.getElementById('rejection-rate').textContent = all.length ? `${Math.round(rejected.length/all.length*100)}%` : '--%';
  // Placeholder for avg risk and time (we could store them in memory later)
  document.getElementById('avg-risk').textContent = '--';
  document.getElementById('avg-time').textContent = '--s';
  // Risk trend chart using stored risk scores if available; else placeholder
  const chart = document.getElementById('risk-trend-chart');
  const risks = all.filter(m => m.riskScore).map(m => m.riskScore).slice(-12);
  chart.innerHTML = risks.map(r => `<div class="bar" style="height:${r}%; background:${r>70?'#f43f5e':'#4f8cff'}"></div>`).join('')
    || '<div style="flex:1; color:var(--text-muted); font-size:0.7rem; text-align:center; align-self:center;">No risk data yet</div>';
}

function clearNodeGraph() {
  const nodes = ["node-triage", "node-extraction", "node-knowledge", "node-memory", "node-bi", "node-recommendation"];
  nodes.forEach(n => {
    const el = document.getElementById(n);
    if (el) el.className = "agent-node";
  });
  updateConnectorLine(0);
}

function highlightNode(nodeId, state) {
  const el = document.getElementById(nodeId);
  if (el) el.className = `agent-node ${state}`;
}

function updateConnectorLine(pct) {
  const fill = document.getElementById("graph-connector-fill");
  if (fill) fill.style.width = `${pct}%`;
}

window.onload = init;