// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRiskMeta(level, score) {
  if (level === "High"   || score > 70) return { color: "#ef4444", bg: "#fef2f2", bar: "#fecaca", label: "High Risk"   };
  if (level === "Medium" || score >= 30) return { color: "#f59e0b", bg: "#fffbeb", bar: "#fde68a", label: "Medium Risk" };
  return                                        { color: "#22c55e", bg: "#f0fdf4", bar: "#bbf7d0", label: "Low Risk"    };
}

function getOppMeta(score) {
  if (score >= 70) return { color: "#22c55e", bg: "#f0fdf4", bar: "#bbf7d0", label: "High Opportunity"   };
  if (score >= 50) return { color: "#2563eb", bg: "#eff6ff", bar: "#bfdbfe", label: "Medium Opportunity" };
  return                  { color: "#94a3b8", bg: "#f8fafc", bar: "#e2e8f0", label: "Low Opportunity"    };
}

function getPriorityMeta(priority) {
  const p = (priority || "").toLowerCase();
  if (p === "high" || p === "critical") return { color: "#ef4444", bg: "#fef2f2", border: "#fecaca" };
  if (p === "medium")                   return { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" };
  if (p === "low")                      return { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" };
  return                                       { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreMetric({ label, value, meta, caption }) {
  const pct = Math.min(Math.max(Number(value) || 0, 0), 100);
  return (
    <div
      style={{
        padding:      "18px 20px",
        borderRadius: "18px",
        background:   meta.bg,
        border:       `1px solid ${meta.bar}`,
        flex:         "1 1 0",
        minWidth:     0,
      }}
    >
      {/* Label */}
      <p
        style={{
          margin:        0,
          fontSize:      "0.72rem",
          fontWeight:    700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:         "#94a3b8",
        }}
      >
        {label}
      </p>

      {/* Value */}
      <p
        style={{
          margin:     "8px 0 4px",
          fontSize:   "2.4rem",
          fontWeight: 800,
          lineHeight: 1,
          color:      meta.color,
        }}
      >
        {value ?? "—"}
      </p>

      {/* Sub-label */}
      <p style={{ margin: "0 0 12px", fontSize: "0.8rem", fontWeight: 600, color: meta.color }}>
        {caption}
      </p>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 999, background: meta.bar, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width:  `${pct}%`,
            borderRadius: 999,
            background:   meta.color,
            transition:   "width 0.7s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

function ConfidenceBar({ confidence }) {
  const pct    = Math.min(Math.max(Number(confidence) || 0, 0), 100);
  const strong = pct >= 85;
  const color  = pct >= 85 ? "#22c55e" : pct >= 70 ? "#2563eb" : "#f59e0b";
  const bg     = pct >= 85 ? "#f0fdf4" : pct >= 70 ? "#eff6ff" : "#fffbeb";
  const track  = pct >= 85 ? "#bbf7d0" : pct >= 70 ? "#bfdbfe" : "#fde68a";

  return (
    <div
      style={{
        padding:      "18px 20px",
        borderRadius: "18px",
        background:   bg,
        border:       `1px solid ${track}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p
          style={{
            margin:        0,
            fontSize:      "0.72rem",
            fontWeight:    700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color:         "#94a3b8",
          }}
        >
          AI Confidence
        </p>
        <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, color, lineHeight: 1 }}>
          {pct}
          <span style={{ fontSize: "1rem", fontWeight: 600 }}>%</span>
        </p>
      </div>

      {/* Segmented gradient bar */}
      <div style={{ height: 8, borderRadius: 999, background: track, overflow: "hidden" }}>
        <div
          style={{
            height:     "100%",
            width:      `${pct}%`,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
            boxShadow:  `0 0 8px ${color}55`,
          }}
        />
      </div>

      <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color, fontWeight: 600 }}>
        {strong ? "High confidence — action recommended" : pct >= 70 ? "Sufficient confidence to proceed" : "Low confidence — review advised"}
      </p>
    </div>
  );
}

function RecommendationBlock({ action }) {
  return (
    <div
      style={{
        padding:      "20px",
        borderRadius: "18px",
        background:   "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)",
        border:       "1px solid #bfdbfe",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width:          34,
            height:         34,
            borderRadius:   10,
            background:     "linear-gradient(135deg,#2563eb,#1d4ed8)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            flexShrink:     0,
            boxShadow:      "0 4px 10px rgba(37,99,235,0.28)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <p
          style={{
            margin:        0,
            fontSize:      "0.72rem",
            fontWeight:    700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color:         "#2563eb",
          }}
        >
          Recommended Action
        </p>
      </div>

      <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#1e3a6e", lineHeight: 1.3 }}>
        {action || "No recommendation available"}
      </p>
    </div>
  );
}

function ExplanationBlock({ text }) {
  return (
    <div
      style={{
        padding:      "18px 20px",
        borderRadius: "18px",
        background:   "#f8fafc",
        border:       "1px solid #e2e8f0",
        borderLeft:   "4px solid #2563eb",
      }}
    >
      <p
        style={{
          margin:        "0 0 8px",
          fontSize:      "0.72rem",
          fontWeight:    700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color:         "#2563eb",
        }}
      >
        Business Explanation
      </p>
      <p
        style={{
          margin:     0,
          fontSize:   "0.92rem",
          lineHeight: 1.65,
          color:      "#475569",
        }}
      >
        {text || "No explanation generated."}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function FinalDecisionCard({ analysis }) {
  if (!analysis) return null;

  const riskMeta = getRiskMeta(analysis.risk_level, analysis.risk_score);
  const oppMeta = getOppMeta(analysis.opportunity_score);

  const recommendedAction =
    analysis.recommended_action ||
    analysis.recommended_product ||
    analysis.conflict_decision ||
    "—";

  const explanation =
    analysis.explanation ||
    analysis.next_best_action ||
    "—";

  return (
    <article className="final-decision-container">
      <style>{`
        .final-decision-container {
          background: #0f172a;
          color: #f8fafc;
          border-radius: 20px;
          padding: 30px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          border: 2px solid #334155;
          box-shadow: 0 25px 60px rgba(0,0,0,0.4);
          max-width: 600px;
          margin: 30px auto;
        }
        .decision-header {
          border-bottom: 1px solid #1e293b;
          padding-bottom: 20px;
          margin-bottom: 25px;
          text-align: center;
        }
        .decision-title {
          color: #f8fafc;
          font-size: 1.4rem;
          font-weight: 900;
          letter-spacing: 0.15em;
          margin: 0;
          text-transform: uppercase;
        }
        .decision-row {
          margin-bottom: 20px;
        }
        .decision-label {
          color: #94a3b8;
          font-size: 0.8rem;
          text-transform: uppercase;
          margin-bottom: 6px;
          display: block;
        }
        .decision-value {
          font-size: 1.1rem;
          font-weight: 700;
          display: block;
        }
        .value-high { color: #f43f5e; }
        .value-medium { color: #f59e0b; }
        .value-low { color: #10b981; }
        .value-blue { color: #38bdf8; }
        .reason-box {
          background: #1e293b;
          padding: 15px;
          border-radius: 12px;
          border-left: 4px solid #3b82f6;
          margin-top: 10px;
          line-height: 1.6;
        }
      `}</style>

      <div className="decision-header">
        <h2 className="decision-title">FINAL DECISION</h2>
      </div>

      <div className="decision-row">
        <span className="decision-label">Customer:</span>
        <span className="decision-value">{analysis.customer_name || "Rahul Sharma"}</span>
      </div>

      <div className="decision-row">
        <span className="decision-label">Risk:</span>
        <span className={`decision-value ${analysis.risk_level === 'High' ? 'value-high' : analysis.risk_level === 'Medium' ? 'value-medium' : 'value-low'}`}>
          {analysis.risk_level || "Medium"}
        </span>
      </div>

      <div className="decision-row">
        <span className="decision-label">Opportunity:</span>
        <span className={`decision-value ${analysis.opportunity_score >= 70 ? 'value-low' : 'value-blue'}`}>
          {analysis.opportunity_score >= 70 ? "High" : "Medium"}
        </span>
      </div>

      <div className="decision-row">
        <span className="decision-label">Recommended Action:</span>
        <span className="decision-value value-blue">{recommendedAction}</span>
      </div>

      <div className="decision-row">
        <span className="decision-label">Confidence:</span>
        <span className="decision-value">{analysis.confidence || 92}%</span>
      </div>

      <div className="decision-row">
        <span className="decision-label">Business Reasoning:</span>
        <div className="reason-box">
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            {(analysis.reasoning || ["Matches customer profile standards"]).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="decision-row">
        <span className="decision-label">Supporting Evidence:</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
          {analysis.evidence?.playbooks?.map((pb, i) => (
            <span key={i} style={{ background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#38bdf8' }}>
              📜 {pb.title}
            </span>
          ))}
          {analysis.evidence?.crm_history?.length > 0 && (
            <span style={{ background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#10b981' }}>
              👥 CRM History Checked
            </span>
          )}
        </div>
      </div>

      {analysis.business_impact && (
        <div className="impact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '25px', padding: '20px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '15px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
          <div>
            <span style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Churn reduction</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc' }}>{analysis.business_impact.expected_churn_reduction}</span>
          </div>
          <div>
            <span style={{ color: '#10b981', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Revenue Opp</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc' }}>{analysis.business_impact.revenue_opportunity}</span>
          </div>
        </div>
      )}

      <div className="decision-row" style={{ marginTop: '20px' }}>
        <span className="decision-label">Business Reason:</span>
        <div className="reason-box">
          {explanation}
        </div>
      </div>

      <div style={{ marginTop: '25px', display: 'flex', gap: '15px' }}>
        <button
          onClick={() => window.onReview?.(analysis.decision_id, "Approved")}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: analysis.review_status === "Approved" ? "#10b981" : "transparent",
            border: '2px solid #10b981',
            color: analysis.review_status === "Approved" ? "#ffffff" : "#10b981",
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
        >
          APPROVE
        </button>
        <button
          onClick={() => window.onReview?.(analysis.decision_id, "Rejected")}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: analysis.review_status === "Rejected" ? "#f43f5e" : "transparent",
            border: '2px solid #f43f5e',
            color: analysis.review_status === "Rejected" ? "#ffffff" : "#f43f5e",
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '0.9rem'
          }}
        >
          REJECT
        </button>
      </div>

      {analysis.review_status && (
        <div style={{ marginTop: '15px', color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center' }}>
          Current Status: <strong style={{ color: analysis.review_status === 'Approved' ? '#10b981' : '#f43f5e' }}>{analysis.review_status}</strong>
        </div>
      )}
    </article>
  );
}

export default FinalDecisionCard;
