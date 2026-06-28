// ─── Helpers ────────────────────────────────────────────────────────────────

function getRiskMeta(score) {
  if (score > 60) return { label: "High",   color: "#ef4444", bg: "#fef2f2", track: "#fecaca" };
  if (score >= 30) return { label: "Medium", color: "#f59e0b", bg: "#fffbeb", track: "#fde68a" };
  return              { label: "Low",    color: "#22c55e", bg: "#f0fdf4", track: "#bbf7d0" };
}

function getOpportunityMeta(score) {
  if (score > 60) return { label: "High",   color: "#22c55e", bg: "#f0fdf4", track: "#bbf7d0" };
  if (score >= 30) return { label: "Medium", color: "#2563eb", bg: "#eff6ff", track: "#bfdbfe" };
  return              { label: "Low",    color: "#64748b", bg: "#f8fafc", track: "#e2e8f0" };
}

function getPriorityMeta(priority) {
  const p = (priority || "").toLowerCase();
  if (p === "high" || p === "critical")
    return { color: "#ef4444", bg: "#fef2f2", border: "#fecaca" };
  if (p === "medium")
    return { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" };
  if (p === "low")
    return { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" };
  return   { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScoreCard({ label, score, meta }) {
  const pct = Math.min(Math.max(score || 0, 0), 100);
  return (
    <div
      style={{
        padding: "16px 18px",
        borderRadius: "16px",
        background: meta.bg,
        border: `1px solid ${meta.track}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: meta.color, lineHeight: 1 }}>
          {score ?? "—"}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "5px",
          borderRadius: "999px",
          background: meta.track,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "999px",
            background: meta.color,
            transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      <p
        style={{
          margin: "8px 0 0",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: meta.color,
        }}
      >
        {meta.label} {label === "Risk Score" ? "Risk" : "Opportunity"}
      </p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "14px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "#94a3b8",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0f172a", textAlign: "right" }}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function PriorityRow({ value }) {
  const meta = getPriorityMeta(value);
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "14px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "#94a3b8",
        }}
      >
        Priority
      </span>
      <span
        style={{
          padding: "4px 14px",
          borderRadius: "999px",
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          color: meta.color,
          fontSize: "0.85rem",
          fontWeight: 700,
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function RecommendationBox({ value }) {
  return (
    <div
      style={{
        padding: "18px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)",
        border: "1px solid #bfdbfe",
        marginTop: "4px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "#2563eb",
          }}
        >
          AI Recommendation
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "0.93rem",
          lineHeight: 1.6,
          color: "#1e3a6e",
          fontWeight: 500,
        }}
      >
        {value ?? "No recommendation available for this customer."}
      </p>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

function RecommendationPanel({ selectedCustomer }) {
  const visible = Boolean(selectedCustomer);

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "360px",
        background: "#ffffff",
        borderLeft: "1px solid #dbe7ff",
        boxShadow: "-16px 0 48px rgba(15, 23, 42, 0.10)",
        overflowY: "auto",
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {selectedCustomer && (
        <>
          {/* ── Header ─────────────────────────────────────── */}
          <div
            style={{
              padding: "32px 24px 24px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              flexShrink: 0,
            }}
          >
            <p
              style={{
                margin: "0 0 10px",
                fontSize: "0.72rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.65)",
              }}
            >
              AI Decision Analysis
            </p>
            <h3
              style={{
                margin: 0,
                fontSize: "1.3rem",
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.2,
              }}
            >
              {selectedCustomer.customer_name}
            </h3>

            {/* Decorative dots */}
            <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: `rgba(255,255,255,${i === 1 ? 0.9 : i === 2 ? 0.5 : 0.25})`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Body ───────────────────────────────────────── */}
          <div
            style={{
              padding: "20px 20px 28px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              flex: 1,
            }}
          >
            {/* Score cards */}
            <ScoreCard
              label="Risk Score"
              score={selectedCustomer.risk_score}
              meta={getRiskMeta(selectedCustomer.risk_score)}
            />
            <ScoreCard
              label="Opportunity Score"
              score={selectedCustomer.opportunity_score}
              meta={getOpportunityMeta(selectedCustomer.opportunity_score)}
            />

            {/* Info rows */}
            <InfoRow label="Segment"  value={selectedCustomer.segment} />
            <PriorityRow              value={selectedCustomer.priority} />

            {/* AI Recommendation */}
            <RecommendationBox
              value={
                selectedCustomer.next_best_action ??
                selectedCustomer.recommendation   ??
                selectedCustomer.action           ??
                null
              }
            />
          </div>
        </>
      )}
    </aside>
  );
}

export default RecommendationPanel;
