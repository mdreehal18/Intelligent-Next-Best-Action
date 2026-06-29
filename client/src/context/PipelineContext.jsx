import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Blackboard } from '../services/memory/Blackboard.js';
import { VectorDB } from '../services/memory/VectorDB.js';
import { PlannerAgent } from '../services/agents/PlannerAgent.js';
import { InteractionAgent } from '../services/agents/InteractionAgent.js';
import { KnowledgeAgent } from '../services/agents/KnowledgeAgent.js';
import { MemoryAgent } from '../services/agents/MemoryAgent.js';
import { RiskAnalysisAgent, OpportunityAnalysisAgent, MissingInformationAgent } from '../services/agents/BiAgents.js';
import { RecommendationAgent } from '../services/agents/RecommendationAgent.js';
import { ExplanationAgent } from '../services/agents/ExplanationAgent.js';
import { SCENARIOS } from '../services/data/scenarios.js';
import { CATEGORIES, getCategoryNames, registerCategory } from '../services/data/categories.js';

const PipelineContext = createContext(null);

export function PipelineProvider({ children }) {
  const navigate = useNavigate();

  // Refs for agent instances (created once)
  const blackboardRef = useRef(new Blackboard());
  const vectorDbRef = useRef(new VectorDB());
  const agentsRef = useRef(null);

  if (!agentsRef.current) {
    const bb = blackboardRef.current;
    agentsRef.current = {
      planner: new PlannerAgent(bb),
      interaction: new InteractionAgent(bb),
      knowledge: new KnowledgeAgent(bb),
      memory: new MemoryAgent(bb),
      risk: new RiskAnalysisAgent(bb),
      opportunity: new OpportunityAnalysisAgent(bb),
      missingInfo: new MissingInformationAgent(bb),
      recommendation: new RecommendationAgent(bb),
      explanation: new ExplanationAgent(bb),
    };
  }

  const blackboard = blackboardRef.current;
  const vectorDb = vectorDbRef.current;
  const agents = agentsRef.current;

  // State
  const [bbState, setBbState] = useState(blackboard.getState());
  const [currentScenario, setCurrentScenario] = useState(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [nodeStates, setNodeStates] = useState({});
  const [connectorPct, setConnectorPct] = useState(0);
  const [showNbaOutput, setShowNbaOutput] = useState(false);
  const [gapModal, setGapModal] = useState({ show: false, gaps: [], allFields: [], currentIndex: 0 });
  const [bbModified, setBbModified] = useState(false);

  // Subscribe to blackboard changes
  useEffect(() => {
    const unsub = blackboard.subscribe((state) => {
      setBbState(state);
      // Aggregate logs
      const allLogs = [
        ...state.triage.logs, ...state.extraction.logs, ...state.knowledge.logs,
        ...state.memory.logs, ...state.biAnalysis.logs, ...state.loopState.logs,
        ...state.recommendation.logs, ...state.explanation.logs, ...state.execution.logs
      ];
      setLogs(allLogs);
    });
    return unsub;
  }, [blackboard]);

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  const highlightNode = useCallback((id, state) => {
    setNodeStates(prev => ({ ...prev, [id]: state }));
  }, []);

  const clearNodes = useCallback(() => {
    setNodeStates({});
    setConnectorPct(0);
    setBbModified(false);
  }, []);

  // Pipeline execution
  const runPipeline = useCallback(async (rawInput, stepDelayMs, categoryOverride, scenario) => {
    if (!rawInput.trim()) { alert("Please write or paste customer interaction details."); return; }

    setPipelineRunning(true);
    clearNodes();
    setShowNbaOutput(false);

    blackboard.reset();
    blackboard.update("rawInput", rawInput);
    if (scenario) blackboard.update("context", { ...scenario.context });

    navigate('/pipeline');

    try {
      highlightNode("node-triage", "active");
      setConnectorPct(15);
      await agents.planner.execute(rawInput, categoryOverride || null);

      if (stepDelayMs > 0) await delay(stepDelayMs);
      highlightNode("node-triage", "completed");
      highlightNode("node-extraction", "active");
      highlightNode("node-knowledge", "active");
      highlightNode("node-memory", "active");
      setConnectorPct(55);
      blackboard.log("Orchestrator", "Triggering parallel Extraction, Knowledge RAG, and Memory agents...");

      await Promise.all([
        agents.interaction.execute(rawInput),
        agents.knowledge.execute(),
        agents.memory.execute(rawInput)
      ]);

      if (stepDelayMs > 0) await delay(stepDelayMs);
      highlightNode("node-extraction", "completed");
      highlightNode("node-knowledge", "completed");
      highlightNode("node-memory", "completed");
      highlightNode("node-bi", "active");
      setConnectorPct(80);
      blackboard.log("Orchestrator", "Triggering parallel BI Agents: Risk, Opportunity, and Missing Info...");

      await Promise.all([
        agents.risk.execute(),
        agents.opportunity.execute(),
        agents.missingInfo.execute()
      ]);

      if (stepDelayMs > 0) await delay(stepDelayMs);
      highlightNode("node-bi", "completed");

      const currentState = blackboard.getState();
      if (currentState.loopState.dataGatheringNeeded) {
        blackboard.log("Orchestrator", "CRITICAL gaps found! Pausing pipeline execution for Data Gathering Loop.");
        const critical = currentState.biAnalysis.missingFields.filter(f => f.importance === "Critical");
        setGapModal({
          show: true,
          gaps: critical,
          allFields: currentState.biAnalysis.missingFields,
          currentIndex: 0,
          stepDelayMs
        });
        return;
      }

      await _finalizeRecommendations(stepDelayMs);
    } catch (error) {
      console.error("Pipeline failed:", error);
      blackboard.log("System Error", `Execution halted: ${error.message}`);
      setPipelineRunning(false);
    }
  }, [blackboard, agents, navigate, highlightNode, clearNodes]);

  const _finalizeRecommendations = async (stepDelayMs) => {
    highlightNode("node-recommendation", "active");
    setConnectorPct(100);
    blackboard.log("Orchestrator", "Generating final recommendations and explanations...");

    await agents.recommendation.execute();
    await agents.explanation.execute();

    if (stepDelayMs > 0) await delay(stepDelayMs);
    highlightNode("node-recommendation", "completed");

    setShowNbaOutput(true);
    setPipelineRunning(false);
    blackboard.log("Orchestrator", "Recommendation process successfully finished. Awaiting Human-in-the-Loop decision.");
    navigate('/recommendations');
  };

  // Recalculate recommendations after manual Blackboard adjustments
  const recalculateRecommendations = useCallback(async () => {
    setPipelineRunning(true);
    blackboard.log("Orchestrator", "Recalculating recommendations based on manual Blackboard adjustments...");
    await agents.recommendation.execute();
    await agents.explanation.execute();
    setBbModified(false);
    setPipelineRunning(false);
    blackboard.log("Orchestrator", "Recalculation complete. Awaiting Human-in-the-Loop decision.");
    navigate('/recommendations');
  }, [blackboard, agents, navigate]);

  // Generate AI email draft
  const generateDraft = useCallback(async (nba) => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        context: blackboard.getState().context,
        category: blackboard.getState().triage.category,
        nba
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate draft');
    return data.draft;
  }, [blackboard]);

  const submitGapResolution = useCallback(async (value) => {
    if (!value.trim()) { alert("Please provide the missing detail to proceed."); return; }
    const gap = gapModal.gaps[gapModal.currentIndex];
    blackboard.log("HITL Data Gathering", `Provided detail for [${gap.field}]: "${value}"`);
    const context = blackboard.getState().context;
    context[gap.field] = value;
    blackboard.update("context", context);

    const nextIndex = gapModal.currentIndex + 1;
    if (nextIndex >= gapModal.gaps.length) {
      setGapModal(prev => ({ ...prev, show: false }));
      blackboard.log("Orchestrator", "Feedback received. Re-running BI validation...");
      await Promise.all([agents.risk.execute(), agents.opportunity.execute(), agents.missingInfo.execute()]);
      const state = blackboard.getState();
      if (state.loopState.dataGatheringNeeded) {
        const critical = state.biAnalysis.missingFields.filter(f => f.importance === "Critical");
        setGapModal({ show: true, gaps: critical, allFields: state.biAnalysis.missingFields, currentIndex: 0, stepDelayMs: gapModal.stepDelayMs });
      } else {
        await _finalizeRecommendations(gapModal.stepDelayMs);
      }
    } else {
      setGapModal(prev => ({ ...prev, currentIndex: nextIndex }));
    }
  }, [gapModal, blackboard, agents]);

  const cancelGapGathering = useCallback(() => {
    setGapModal(prev => ({ ...prev, show: false }));
    blackboard.log("Orchestrator", "Data gathering loop aborted by user.");
    setPipelineRunning(false);
  }, [blackboard]);

  const approveAction = useCallback(async (id) => {
    const state = blackboard.getState();
    const nba = state.recommendation.nbas.find(n => n.id === id);
    if (!nba) return;
    blackboard.log("HITL", `Recommendation APPROVED: "${nba.title}"`);
    blackboard.log("Executor", `[Execution Action] Successfully executed: ${nba.actionType}. Detail: "${nba.details}"`);
    await vectorDb.addMemory({
      accountName: state.context.accountName || "Unknown Account",
      category: state.triage.category,
      rawInput: state.rawInput,
      outcome: `Approved NBA: ${nba.title}. Action Type: ${nba.actionType}`,
      feedback: "Approved by CS Manager with no modifications. Recommendation validated.",
      status: "Approved"
    });
  }, [blackboard, vectorDb]);

  const rejectAction = useCallback(async (id, reason) => {
    const state = blackboard.getState();
    const nba = state.recommendation.nbas.find(n => n.id === id);
    if (!nba) return;
    blackboard.log("HITL", `Recommendation REJECTED: "${nba.title}". Reason: "${reason}"`);
    await vectorDb.addMemory({
      accountName: state.context.accountName || "Unknown Account",
      category: state.triage.category,
      rawInput: state.rawInput,
      outcome: `Rejected NBA: ${nba.title}`,
      feedback: `Rejected by human. Reason: ${reason}`,
      status: "Rejected"
    });
  }, [blackboard, vectorDb]);

  const handleRegisterCategory = useCallback((name, keywordsRaw, guideline) => {
    if (!name || !keywordsRaw) { alert("Please provide at least a category name and one or more trigger keywords."); return false; }
    const keywords = keywordsRaw.split(",").map(k => k.trim().toLowerCase()).filter(Boolean);
    registerCategory(name, {
      label: name, icon: CATEGORIES[name]?.icon || "🆕", keywords,
      playbook: {
        name: CATEGORIES[name]?.playbook?.name || `${name} Playbook (User-Defined)`,
        description: CATEGORIES[name]?.playbook?.description || `Custom playbook registered at runtime for the "${name}" issue type.`,
        guidelines: guideline ? [guideline] : (CATEGORIES[name]?.playbook?.guidelines || ["Triage manually and confirm best response with a senior CSM."]),
        rules: guideline ? [guideline] : (CATEGORIES[name]?.playbook?.rules || [])
      },
      nbaTemplates: CATEGORIES[name]?.nbaTemplates || [
        { title: () => `Triage new "${name}" issue with account owner`, actionType: "Task Creation", details: (ctx) => `${guideline || "Manually review this newly categorized issue type."} Route to the account owner for ${ctx.accountName || "this account"}.`, impact: "Ensures the new issue type gets a deliberate first response while more cases build up history.", priority: "High" },
        { title: () => "Log outcome to strengthen future triage", actionType: "System Configuration", details: () => `Record the outcome of this "${name}" case in long-term memory so future similar tickets are matched faster.`, impact: "Improves recommendation quality for this category as more examples accumulate.", priority: "Medium" }
      ]
    });
    blackboard.log("System", `Category "${name}" registered/updated at runtime with ${keywords.length} trigger keyword(s).`);
    return true;
  }, [blackboard]);

  const value = {
    blackboard, vectorDb, bbState, logs,
    nodeStates, connectorPct,
    currentScenario, setCurrentScenario,
    pipelineRunning, showNbaOutput,
    gapModal, submitGapResolution, cancelGapGathering,
    runPipeline, approveAction, rejectAction,
    handleRegisterCategory, clearNodes,
    bbModified, setBbModified, recalculateRecommendations, generateDraft,
    SCENARIOS, CATEGORIES, getCategoryNames
  };

  return <PipelineContext.Provider value={value}>{children}</PipelineContext.Provider>;
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) throw new Error('usePipeline must be used within a PipelineProvider');
  return context;
}
