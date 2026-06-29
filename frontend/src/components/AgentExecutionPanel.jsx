import { useState, useEffect } from "react";

// ─── CSS keyframe animations (injected once) ─────────────────────────────────
const STYLES = `
  @keyframes aep-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes aep-pulse {
    0%, 100% { opacity: 1;   }
    50%       { opacity: 0.4; }
  }
  @keyframes aep-appear {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
`;

// ─── Agent display names ──────────────────────────────────────────────────────
const AGENT_LABELS = {
  PlannerAgent:               "Dynamic Planning",
  KnowledgeRetrievalAgent:    "Knowledge Retrieval",
  RiskAssessmentAgent:        "Risk Assessment",
  OpportunityAgent:           "Opportunity Analysis",
  ProductRecommendationAgent: "Recommendation Engine",
  ExplanationAgent:           "Explainability Layer",
  ReviewerAgent:              "Human-in-the-Loop",
  MemoryAgent:                "Memory Update",
  AuditAgent:                 "Compliance Logging",
};

const PIPELINE_ORDER = Object.keys(AGENT_LABELS);

// ─── Colour tokens per status ─────────────────────────────────────────────────
const STATUS_STYLES = {
  completed: {
    border: "#bbf7d0", bg: "#f0fdf4",
    text: "#16a34a",   dot: "#22c55e",
    label: "Completed",
    shadow: "0 4px 16px rgba(34, 197, 94, 0.10)",
  },
  running: {
    border: "#bfdbfe", bg: "#eff6ff",
    text: "#2563eb",   dot: "#2563eb",
    label: "Running…",
    shadow: "0 4px 16px rgba(37, 99, 235, 0.12)",
  },
  failed: {
    border: "#fecaca", bg: "#fef2f2",
    text: "#dc2626",   dot: "#ef4444",
    label: "Failed",
    shadow: "0 4px 16px rgba(239, 68, 68, 0.10)",
  },
  waiting: {
    border: "#e2e8f0", bg: "#f8fafc",
    text: "#94a3b8",   dot: "#cbd5e1",
    label: "Waiting",
    shadow: "none",
  },
};

// ─── Status icon ──────────────────────────────────────────────────────────────
function StatusIcon({ status }) {
  const sz   = 34;
  const base = {
    width: sz, height: sz, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  };

  if (status === "completed") {
    return (
      <div style={{ ...base, background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 4px 10px rgba(34,197,94,0.30)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }

  if (status === "running") {
    return (
      <div style={{ ...base, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow: "0 4px 10px rgba(37,99,235,0.30)" }}>
        <svg
          width="17" height="17" viewBox="0 0 17 17"
          style={{ animation: "aep-spin 0.85s linear infinite" }}
        >
          <circle cx="8.5" cy="8.5" r="6.5" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
          <path d="M8.5 2 A6.5 6.5 0 0 1 15 8.5"
            fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div style={{ ...base, background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 4px 10px rgba(239,68,68,0.30)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#fff" strokeWidth="3" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
    );
  }

  // waiting
  return (
    <div style={{ ...base, background: "#e2e8f0" }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    </div>
  );
}

// ─── Vertical connector between steps ────────────────────────────────────────
function Connector({ done }) {
  const color = done ? "#bbf7d0" : "#e2e8f0";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2px 0", margin: "0 0 0 16px" }}>
      <div style={{ width: 2, height: 14, background: color, borderRadius: 1 }} />
      <svg width="10" height="7" viewBox="0 0 10 7" aria-hidden="true">
        <polyline points="0,0 5,7 10,0"
          fill="none" stroke={color} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ width: 2, height: 6, background: color, borderRadius: 1 }} />
    </div>
  );
}

// ─── Single agent card ────────────────────────────────────────────────────────
function AgentCard({ agentKey, status, executionMs, visible, isLast }) {
  const s     = STATUS_STYLES[status] ?? STATUS_STYLES.waiting;
  const label = AGENT_LABELS[agentKey]
    ?? agentKey.replace(/([A-Z])/g, " $1").trim();

  return (
    <div>
      {/* Card */}
      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             "14px",
          padding:         "14px 18px",
          borderRadius:    "18px",
          border:          `1px solid ${s.border}`,
          background:      s.bg,
          boxShadow:       s.shadow,
          opacity:         visible ? 1 : 0,
          transform:       visible ? "translateY(0)" : "translateY(10px)",
          transition:      "opacity 0.35s ease, transform 0.35s ease, box-shadow 0.2s ease",
          animation:       visible && status === "running" ? "aep-pulse 2s ease-in-out infinite" : "none",
        }}
      >
        <StatusIcon status={status} />

        {/* Label + status text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {label}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: "0.78rem", fontWeight: 600, color: s.text }}>
            {s.label}
          </p>
        </div>

        {/* Execution time badge */}
        {executionMs != null && status === "completed" && (
          <span
            style={{
              flexShrink:   0,
              padding:      "3px 10px",
              borderRadius: "999px",
              background:   "#f0fdf4",
              border:       "1px solid #bbf7d0",
              color:        "#16a34a",
              fontSize:     "0.75rem",
              fontWeight:   700,
              whiteSpace:   "nowrap",
            }}
          >
            {executionMs < 1 ? "<1 ms" : `${Math.round(executionMs)} ms`}
          </span>
        )}

        {/* Spinner badge for running */}
        {status === "running" && (
          <span
            style={{
              flexShrink:   0,
              padding:      "3px 10px",
              borderRadius: "999px",
              background:   "#eff6ff",
              border:       "1px solid #bfdbfe",
              color:        "#2563eb",
              fontSize:     "0.75rem",
              fontWeight:   700,
            }}
          >
            executing
          </span>
        )}
      </div>

      {/* Connector to next step */}
      {!isLast && (
        <Connector done={status === "completed"} />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function AgentExecutionPanel({ trace = [], loading = false }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    if (!trace || trace.length === 0) {
      setVisibleCount(0);
      return;
    }
    setVisibleCount(0);
    const timers = trace.map((_, i) =>
      setTimeout(() => setVisibleCount((prev) => Math.max(prev, i + 1)), i * 500),
    );
    return () => timers.forEach(clearTimeout);
  }, [trace]);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    setLoadingStep(0);
    const iv = setInterval(
      () => setLoadingStep((prev) => Math.min(prev + 1, PIPELINE_ORDER.length - 1)),
      700,
    );
    return () => clearInterval(iv);
  }, [loading]);

  if (!loading && (!trace || trace.length === 0)) return null;

  const hasTrace = !loading && trace.length > 0;
  const steps = hasTrace
    ? trace.map((step, i) => ({
        key: step.agent || String(i),
        agentKey: step.agent || "",
        status: i < visibleCount ? "completed" : "waiting",
        executionMs: step.execution_time_ms ?? null,
        visible: i < visibleCount,
        details: step.details || getAgentDetails(step.agent),
      }))
    : PIPELINE_ORDER.map((name, i) => ({
        key: name,
        agentKey: name,
        status: i < loadingStep ? "completed" : i === loadingStep ? "running" : "waiting",
        executionMs: null,
        visible: true,
        details: i === loadingStep ? "Analyzing data..." : "",
      }));

  function getAgentDetails(agent) {
    const detailsMap = {
      PlannerAgent: "Tailoring execution path...",
      KnowledgeRetrievalAgent: "Sourcing enterprise context...",
      RiskAssessmentAgent: "Evaluating risk factors...",
      OpportunityAgent: "Identifying growth opportunities...",
      ProductRecommendationAgent: "Selecting optimal products...",
      ExplanationAgent: "Generating business logic...",
      ReviewerAgent: "Waiting for human signal...",
      MemoryAgent: "Updating customer history...",
      AuditAgent: "Logging transaction for compliance...",
    };
    return detailsMap[agent] || "Processing...";
  }

  return (
    <section className="section-block audit-log-container">
      <style>{`
        .audit-log-container {
          background: #0f172a;
          color: #f8fafc;
          border-radius: 20px;
          padding: 30px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          border: 1px solid #1e293b;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          max-width: 600px;
          margin: 40px auto;
        }
        .audit-header { margin-bottom: 20px; }
        .audit-title { color: #38bdf8; font-size: 1.2rem; font-weight: 800; margin: 0; }
        .audit-subtitle { color: #94a3b8; font-size: 0.9rem; margin: 4px 0 0; }
        .audit-separator { border: none; border-top: 1px dashed #334155; margin: 20px 0; }
        .agent-step { margin-bottom: 16px; transition: all 0.3s ease; }
        .agent-status-row { display: flex; align-items: center; gap: 12px; }
        .status-dot { width: 10px; height: 10px; borderRadius: 50%; }
        .status-dot.completed { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
        .status-dot.running { background: #eab308; box-shadow: 0 0 8px #eab308; animation: pulse 1.5s infinite; }
        .status-dot.waiting { background: #475569; }
        .agent-name { font-weight: 700; color: #f1f5f9; }
        .agent-details { color: #94a3b8; font-size: 0.85rem; margin: 4px 0 0 22px; }
        .agent-result { color: #22c55e; font-size: 0.85rem; margin: 4px 0 0 22px; display: flex; align-items: center; gap: 8px; }
        .arrow-down { color: #334155; margin: 8px 0 8px 25px; font-size: 1.2rem; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
      `}</style>

      <div className="audit-header">
        <h3 className="audit-title">DecisionPilot AI</h3>
        <p className="audit-subtitle">Running Multi-Agent Decision Engine...</p>
      </div>

      <div className="audit-separator">──────────────────────────────</div>

      <div className="audit-steps">
        {steps.map((step, idx) => (
          <div key={step.key} className="agent-step" style={{ opacity: step.visible ? 1 : 0.4 }}>
            <div className="agent-status-row">
              <div className={`status-dot ${step.status}`} />
              <span className="agent-name">{AGENT_LABELS[step.agentKey] || step.agentKey}</span>
            </div>
            
            {step.details && (
              <p className="agent-details">{step.details}</p>
            )}
            
            {step.status === "completed" && (
              <p className="agent-result">
                ✓ Completed {step.executionMs ? `(${Math.round(step.executionMs)} ms)` : ""}
              </p>
            )}

            {idx < steps.length - 1 && (
              <div className="arrow-down">↓</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default AgentExecutionPanel;
