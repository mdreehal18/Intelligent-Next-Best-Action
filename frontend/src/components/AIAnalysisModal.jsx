/**
 * AIAnalysisModal
 * ───────────────
 * Full-screen modal that orchestrates the complete AI analysis workflow:
 *
 *   Phase 1 – fetching_trace  : calls GET /agent-trace/{id}
 *                               shows 9 expected agents with a cycling indicator
 *   Phase 2 – animating       : reveals each real agent step at 500 ms intervals
 *   Phase 3 – fetching_results: calls GET /analysis/{id} + GET /recommendation/{id}
 *   Phase 4 – complete        : two-column layout — pipeline on left, decision on right
 *   Phase 5 – error           : friendly error message
 */

import { useEffect, useRef, useState } from "react";
import api from "../services/api";

// ─── Keyframe CSS ────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes aicm-spin   { to { transform: rotate(360deg); } }
  @keyframes aicm-pulse  { 0%,100% { opacity:1 } 50% { opacity:.45 } }
  @keyframes aicm-slideR { from { opacity:0; transform:translateX(24px) } to { opacity:1; transform:translateX(0) } }
  @keyframes aicm-fadeUp { from { opacity:0; transform:translateY(14px)} to { opacity:1; transform:translateY(0) } }
`;

// ─── Static data ─────────────────────────────────────────────────────────────
const AGENT_NAMES = {
  PlannerAgent:               "Planner Agent",
  RiskAssessmentAgent:        "Risk Assessment Agent",
  OpportunityAgent:           "Opportunity Agent",
  ProductRecommendationAgent: "Product Recommendation Agent",
  ConflictDetectionAgent:     "Conflict Detection Agent",
  ReviewerAgent:              "Reviewer Agent",
  ExplanationAgent:           "Explanation Agent",
  MemoryAgent:                "Memory Agent",
  AuditAgent:                 "Audit Agent",
};
const PIPELINE_ORDER = Object.keys(AGENT_NAMES);

const PHASE_LABEL = {
  fetching_trace:    "Initializing pipeline…",
  animating:         "Executing agents…",
  fetching_results:  "Compiling decision…",
  complete:          "Analysis complete",
  error:             "Error",
};

// ─── Colour helpers ───────────────────────────────────────────────────────────
function riskMeta(level, score) {
  if (level === "High"   || score > 70) return { color: "#ef4444", bg: "#fef2f2", bar: "#fecaca", label: "High"   };
  if (level === "Medium" || score >= 30) return { color: "#f59e0b", bg: "#fffbeb", bar: "#fde68a", label: "Medium" };
  return                                        { color: "#22c55e", bg: "#f0fdf4", bar: "#bbf7d0", label: "Low"    };
}
function oppMeta(score) {
  if (score >= 70) return { color: "#22c55e", label: "High"   };
  if (score >= 50) return { color: "#2563eb", label: "Medium" };
  return                  { color: "#94a3b8", label: "Low"    };
}
function priorityMeta(p = "") {
  const lp = p.toLowerCase();
  if (lp === "high" || lp === "critical") return { color: "#ef4444", bg: "#fef2f2", border: "#fecaca" };
  if (lp === "medium")                    return { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" };
  if (lp === "low")                       return { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" };
  return                                         { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
}

// ─── Agent output summary ─────────────────────────────────────────────────────
function getAgentSummary(agentKey, output = {}) {
  if (output.error) return `Error: ${output.error}`;
  switch (agentKey) {
    case "PlannerAgent":
      return `${output.strategy ?? "standard"} strategy · ${output.total_steps ?? "?"} steps`;
    case "RiskAssessmentAgent":
      return `${output.risk_level ?? "—"} Risk · Score ${output.risk_score ?? "—"}`;
    case "OpportunityAgent":
      return `Score ${output.opportunity_score ?? "—"} · ${output.segment ?? "—"} segment`;
    case "ProductRecommendationAgent":
      return `${output.recommended_product ?? "—"} · ${output.confidence ?? "—"}% confidence`;
    case "ConflictDetectionAgent":
      return output.conflict_detected ? (output.decision ?? "Conflict detected") : "No conflicts detected";
    case "ReviewerAgent":
      return output.status === "approved"
        ? "All validation checks passed"
        : `Needs review · ${output.issues?.length ?? 0} issue(s)`;
    case "ExplanationAgent": {
      const txt = output.next_best_action ?? "";
      return txt.length > 60 ? txt.slice(0, 60) + "…" : txt || "Explanation generated";
    }
    case "MemoryAgent":
      return output.decision_id
        ? `Saved · ID: ${String(output.decision_id).slice(0, 8)}…`
        : "Decision persisted";
    case "AuditAgent":
      return output.audit_id
        ? `Logged · ID: ${String(output.audit_id).slice(0, 8)}…`
        : "Compliance record written";
    default:
      return "Completed";
  }
}

// ─── Status icon ─────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const base = {
    width: 22, height: 22, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };
  if (status === "completed") return (
    <div style={{ ...base, background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 2px 8px rgba(34,197,94,.35)" }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
  if (status === "running") return (
    <div style={{ ...base, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 2px 8px rgba(37,99,235,.35)" }}>
      <svg width="12" height="12" viewBox="0 0 12 12" style={{ animation: "aicm-spin .8s linear infinite" }}>
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="2" />
        <path d="M6 1.5 A4.5 4.5 0 0 1 10.5 6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
  if (status === "failed") return (
    <div style={{ ...base, background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 2px 8px rgba(239,68,68,.35)" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  );
  return (
    <div style={{ ...base, background: "#e2e8f0" }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    </div>
  );
}

// ─── Single agent row ─────────────────────────────────────────────────────────
function AgentRow({ agentKey, status, executionMs, summary, visible, isLast }) {
  const label = AGENT_NAMES[agentKey] ?? agentKey.replace(/([A-Z])/g, " $1").trim();
  return (
    <div style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateX(0)" : "translateX(-8px)",
      transition: "opacity .35s ease, transform .35s ease",
    }}>
      <div style={{ display: "flex", gap: 10 }}>
        {/* Timeline rail */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 22, flexShrink: 0 }}>
          <StatusDot status={status} />
          {!isLast && (
            <div style={{
              flex: 1, width: 2, marginTop: 4,
              background: status === "completed" ? "#bbf7d0" : "#e2e8f0",
              minHeight: 20,
            }} />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, paddingBottom: isLast ? 0 : 14, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {label}
            </span>
            {executionMs != null && status === "completed" && (
              <span style={{ flexShrink: 0, fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8" }}>
                {executionMs < 1 ? "<1" : Math.round(executionMs)} ms
              </span>
            )}
          </div>
          {summary && visible && (
            <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "#64748b", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {summary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Right-panel loading state ────────────────────────────────────────────────
function LoadingRight({ label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 16, padding: "40px 24px" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(37,99,235,.28)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ animation: "aicm-spin .9s linear infinite" }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="3" />
          <path d="M12 3 A9 9 0 0 1 21 12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Please wait…</p>
    </div>
  );
}

// ─── Final decision panel ─────────────────────────────────────────────────────
function DecisionPanel({ analysis, recommendation, visible }) {
  const rm  = riskMeta(analysis?.risk_level, analysis?.risk_score ?? 0);
  const om  = oppMeta(analysis?.opportunity_score ?? 0);
  const pm  = priorityMeta(analysis?.priority);
  const pct = Math.min(Math.max(Number(analysis?.confidence ?? 0), 0), 100);

  const action = analysis?.recommended_action
    ?? analysis?.recommended_product
    ?? recommendation?.recommended_action
    ?? "—";

  const reason = recommendation?.reason
    ?? analysis?.explanation
    ?? analysis?.next_best_action
    ?? "—";

  const confidenceColor = pct >= 85 ? "#22c55e" : pct >= 70 ? "#2563eb" : "#f59e0b";

  return (
    <div style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(12px)",
      transition: "opacity .55s ease, transform .55s ease",
      display: "flex", flexDirection: "column", gap: 14,
      padding: "8px 0",
    }}>

      {/* Score row */}
      <div style={{ display: "flex", gap: 12 }}>
        {/* Risk */}
        <div style={{ flex: 1, padding: "14px 16px", borderRadius: 16, background: rm.bg, border: `1px solid ${rm.bar}` }}>
          <p style={{ margin: "0 0 4px", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8" }}>Risk Score</p>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: rm.color, lineHeight: 1 }}>
            {analysis?.risk_score ?? "—"}
          </p>
          <p style={{ margin: "4px 0 10px", fontSize: "0.75rem", fontWeight: 600, color: rm.color }}>{rm.label} Risk</p>
          <div style={{ height: 4, borderRadius: 999, background: rm.bar }}>
            <div style={{ height: "100%", width: `${Math.min(analysis?.risk_score ?? 0, 100)}%`, borderRadius: 999, background: rm.color, transition: "width .7s ease" }} />
          </div>
        </div>

        {/* Opportunity */}
        <div style={{ flex: 1, padding: "14px 16px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <p style={{ margin: "0 0 4px", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8" }}>Opportunity</p>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: om.color, lineHeight: 1 }}>
            {analysis?.opportunity_score ?? "—"}
          </p>
          <p style={{ margin: "4px 0 10px", fontSize: "0.75rem", fontWeight: 600, color: om.color }}>{om.label}</p>
          <div style={{ height: 4, borderRadius: 999, background: "#e2e8f0" }}>
            <div style={{ height: "100%", width: `${Math.min(analysis?.opportunity_score ?? 0, 100)}%`, borderRadius: 999, background: om.color, transition: "width .7s ease" }} />
          </div>
        </div>
      </div>

      {/* Priority + Confidence */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ padding: "6px 18px", borderRadius: 999, background: pm.bg, border: `1px solid ${pm.border}` }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: pm.color }}>
            {analysis?.priority ?? "—"} Priority
          </span>
        </div>
        <div style={{ flex: 1, padding: "10px 14px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: `linear-gradient(90deg,${confidenceColor}99,${confidenceColor})`, transition: "width .8s ease" }} />
          </div>
          <span style={{ flexShrink: 0, fontSize: "0.9rem", fontWeight: 800, color: confidenceColor }}>{pct}%</span>
        </div>
      </div>

      {/* Recommended action */}
      <div style={{ padding: "16px 18px", borderRadius: 16, background: "linear-gradient(135deg,#eff6ff,#f0f9ff)", border: "1px solid #bfdbfe" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 3px 8px rgba(37,99,235,.28)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2563eb" }}>
            Recommended Action
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e3a6e", lineHeight: 1.3 }}>
          {action}
        </p>
      </div>

      {/* Business reason */}
      <div style={{ padding: "14px 18px", borderRadius: 16, background: "#f8fafc", border: "1px solid #e2e8f0", borderLeft: "4px solid #2563eb" }}>
        <p style={{ margin: "0 0 6px", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#2563eb" }}>
          Business Reason
        </p>
        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "#475569" }}>
          {reason}
        </p>
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
function AIAnalysisModal({ customerId, customerName, isOpen, onClose }) {
  const [phase, setPhase]               = useState("idle");
  const [agentSteps, setAgentSteps]     = useState([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loadingStep, setLoadingStep]   = useState(0);
  const [analysis, setAnalysis]         = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [resultVisible, setResultVisible]   = useState(false);
  const cancelledRef = useRef(false);

  // ── Main workflow ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !customerId) return;

    cancelledRef.current = false;
    setPhase("fetching_trace");
    setAgentSteps([]);
    setVisibleCount(0);
    setLoadingStep(0);
    setAnalysis(null);
    setRecommendation(null);
    setResultVisible(false);

    const sleep = ms => new Promise(res => setTimeout(res, ms));

    const run = async () => {
      try {
        // ── Phase 1: fetch trace ──────────────────────────────────────
        const traceResp = await api.get(`/agent-trace/${customerId}`);
        if (cancelledRef.current) return;

        const steps = traceResp.data?.workflow ?? [];
        setAgentSteps(steps);
        setPhase("animating");

        // ── Phase 2: animate each agent at 500 ms intervals ───────────
        for (let i = 0; i < steps.length; i++) {
          await sleep(500);
          if (cancelledRef.current) return;
          setVisibleCount(i + 1);
        }

        await sleep(400); // brief pause after last agent
        if (cancelledRef.current) return;

        // ── Phase 3: fetch analysis + recommendation in parallel ──────
        setPhase("fetching_results");
        const [analysisResp, recResp] = await Promise.all([
          api.get(`/analysis/${customerId}`),
          api.get(`/recommendation/${customerId}`),
        ]);
        if (cancelledRef.current) return;

        setAnalysis(analysisResp.data);
        setRecommendation(recResp.data);
        setPhase("complete");

        // Fade-in results after a brief moment
        setTimeout(() => {
          if (!cancelledRef.current) setResultVisible(true);
        }, 150);

      } catch (err) {
        console.error("AIAnalysisModal error:", err);
        if (!cancelledRef.current) setPhase("error");
      }
    };

    run();

    return () => { cancelledRef.current = true; };
  }, [isOpen, customerId]);

  // ── Cycle placeholder steps while waiting for trace ───────────────────
  useEffect(() => {
    if (phase !== "fetching_trace") { setLoadingStep(0); return; }
    const iv = setInterval(() => setLoadingStep(p => (p + 1) % PIPELINE_ORDER.length), 650);
    return () => clearInterval(iv);
  }, [phase]);

  if (!isOpen) return null;

  // ── Build display steps ───────────────────────────────────────────────
  const hasRealSteps = agentSteps.length > 0;
  const displaySteps = hasRealSteps
    ? agentSteps.map((s, i) => ({
        agentKey:    s.agent,
        status:      i < visibleCount ? (s.status === "completed" ? "completed" : s.status === "failed" ? "failed" : "completed") : "waiting",
        executionMs: s.execution_time_ms ?? null,
        summary:     i < visibleCount ? getAgentSummary(s.agent, s.output ?? {}) : null,
        visible:     i < visibleCount,
      }))
    : PIPELINE_ORDER.map((name, i) => ({
        agentKey:    name,
        status:      i < loadingStep ? "completed" : i === loadingStep ? "running" : "waiting",
        executionMs: null,
        summary:     null,
        visible:     true,
      }));

  const phaseBadgeMeta = phase === "complete"
    ? { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" }
    : { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* ── Overlay ──────────────────────────────────────────────────── */}
      <div
        style={{
          position:       "fixed",
          inset:          0,
          background:     "rgba(15,23,42,0.68)",
          backdropFilter: "blur(8px)",
          zIndex:         1000,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "20px",
        }}
        onClick={phase === "complete" ? onClose : undefined}
      >
        {/* ── Modal card ─────────────────────────────────────────────── */}
        <div
          style={{
            background:    "#ffffff",
            borderRadius:  "24px",
            width:         "100%",
            maxWidth:      "1080px",
            maxHeight:     "92vh",
            display:       "flex",
            flexDirection: "column",
            overflow:      "hidden",
            boxShadow:     "0 40px 80px rgba(15,23,42,0.30)",
            animation:     "aicm-fadeUp .35s ease",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ───────────────────────────────────────────────── */}
          <div style={{
            padding:    "24px 28px",
            background: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 65%,#3b82f6 100%)",
            display:    "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap:        16,
            flexShrink: 0,
            position:   "relative",
            overflow:   "hidden",
          }}>
            {/* Decorative circles */}
            <div style={{ position:"absolute", top:-40, right:-30, width:130, height:130, borderRadius:"50%", background:"rgba(255,255,255,0.05)", pointerEvents:"none" }} />
            <div style={{ position:"absolute", bottom:-20, right:80,  width:80,  height:80,  borderRadius:"50%", background:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />

            <div style={{ position: "relative" }}>
              <p style={{ margin:"0 0 6px", fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"rgba(255,255,255,0.6)" }}>
                AI Decision Analysis
              </p>
              <h2 style={{ margin:0, fontSize:"1.4rem", fontWeight:800, color:"#ffffff", lineHeight:1.2 }}>
                {customerName ?? "Customer Analysis"}
              </h2>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative", flexShrink:0 }}>
              <span style={{ padding:"6px 16px", borderRadius:999, background:phaseBadgeMeta.bg, border:`1px solid ${phaseBadgeMeta.border}`, color:phaseBadgeMeta.color, fontSize:"0.8rem", fontWeight:700, animation: phase !== "complete" ? "aicm-pulse 2s ease-in-out infinite" : "none" }}>
                {PHASE_LABEL[phase] ?? phase}
              </span>

              {phase === "complete" && (
                <button
                  onClick={onClose}
                  aria-label="Close"
                  style={{ width:32, height:32, borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.18)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#ffffff", transition:"background .2s" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.28)"}
                  onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.18)"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div style={{ display:"flex", flex:1, overflow:"hidden", minHeight:0 }}>

            {/* Left: Agent pipeline */}
            <div style={{
              flex:          "0 0 340px",
              borderRight:   "1px solid #e2e8f0",
              overflowY:     "auto",
              padding:       "24px 20px",
              background:    "#fafbfc",
            }}>
              <p style={{ margin:"0 0 16px", fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:"#94a3b8" }}>
                Agent Pipeline
              </p>
              {displaySteps.map((step, i) => (
                <AgentRow
                  key={step.agentKey}
                  agentKey={step.agentKey}
                  status={step.status}
                  executionMs={step.executionMs}
                  summary={step.summary}
                  visible={step.visible}
                  isLast={i === displaySteps.length - 1}
                />
              ))}
            </div>

            {/* Right: Status / Results */}
            <div style={{ flex:1, overflowY:"auto", padding:"24px", display:"flex", flexDirection:"column" }}>

              {(phase === "fetching_trace" || phase === "animating") && (
                <LoadingRight label="Executing agent pipeline…" />
              )}

              {phase === "fetching_results" && (
                <LoadingRight label="Compiling final decision…" />
              )}

              {phase === "error" && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flex:1, gap:12, padding:40, textAlign:"center" }}>
                  <p style={{ margin:0, fontSize:"1rem", fontWeight:700, color:"#ef4444" }}>Analysis failed</p>
                  <p style={{ margin:0, fontSize:"0.88rem", color:"#64748b" }}>Check that the backend server is running and try again.</p>
                </div>
              )}

              {phase === "complete" && (
                <>
                  <p style={{ margin:"0 0 16px", fontSize:"0.7rem", fontWeight:700, letterSpacing:"0.09em", textTransform:"uppercase", color:"#94a3b8" }}>
                    Final Decision
                  </p>
                  <DecisionPanel
                    analysis={analysis}
                    recommendation={recommendation}
                    visible={resultVisible}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          {phase === "complete" && (
            <div style={{ padding:"16px 28px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", flexShrink:0 }}>
              <button
                onClick={onClose}
                style={{ padding:"11px 28px", borderRadius:14, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#475569", fontSize:"0.92rem", fontWeight:700, cursor:"pointer", transition:"all .2s ease" }}
                onMouseEnter={e => { e.currentTarget.style.background="#ffffff"; e.currentTarget.style.borderColor="#bfdbfe"; e.currentTarget.style.color="#2563eb"; }}
                onMouseLeave={e => { e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.borderColor="#e2e8f0"; e.currentTarget.style.color="#475569"; }}
              >
                Close Analysis
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default AIAnalysisModal;
