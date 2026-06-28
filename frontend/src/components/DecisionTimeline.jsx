// ─── Helpers ────────────────────────────────────────────────────────────────

function getPriorityMeta(priority) {
  const p = (priority || "").toLowerCase();
  if (p === "high" || p === "critical")
    return { color: "#ef4444", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444" };
  if (p === "medium")
    return { color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b" };
  if (p === "low")
    return { color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e" };
  return   { color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0", dot: "#cbd5e1" };
}

function formatTimestamp(ts) {
  if (!ts) return "—";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return String(ts);

  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr  = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin <  1)  return "Just now";
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr  < 24)  return `${diffHr}h ago`;
  if (diffDay <  7)  return `${diffDay}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    hour:  "2-digit",
    minute:"2-digit",
  });
}

function resolveRecommendation(item) {
  return (
    item.next_best_action ??
    item.recommendation   ??
    item.action           ??
    "No recommendation recorded."
  );
}

function sortByTimestamp(arr) {
  return [...arr].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tb - ta;
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "14px",
        padding:        "52px 24px",
        borderRadius:   "22px",
        border:         "1px dashed #dbe7ff",
        background:     "#f8fbff",
        textAlign:      "center",
      }}
    >
      <div
        style={{
          width:        "48px",
          height:       "48px",
          borderRadius: "14px",
          background:   "linear-gradient(135deg, #eff6ff, #dbeafe)",
          border:       "1px solid #bfdbfe",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
        No decisions yet
      </p>
      <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b", maxWidth: "280px" }}>
        AI recommendations will appear here after running analysis on a customer.
      </p>
    </div>
  );
}

function TimelineItem({ item, isLast }) {
  const meta = getPriorityMeta(item.priority);
  const recommendation = resolveRecommendation(item);

  return (
    <div style={{ display: "flex", gap: "0", position: "relative" }}>

      {/* ── Left rail: line + dot ─────────────────────────── */}
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          flexShrink:     0,
          width:          "32px",
          marginRight:    "16px",
        }}
      >
        {/* Dot */}
        <div
          style={{
            width:        "14px",
            height:       "14px",
            borderRadius: "50%",
            background:   meta.dot,
            border:       "3px solid #ffffff",
            boxShadow:    `0 0 0 2px ${meta.border}, 0 2px 6px rgba(15,23,42,0.10)`,
            flexShrink:   0,
            marginTop:    "18px",
            zIndex:       1,
          }}
        />
        {/* Connector line */}
        {!isLast && (
          <div
            style={{
              flex:       1,
              width:      "2px",
              background: "linear-gradient(180deg, #e2e8f0 0%, #f1f5f9 100%)",
              marginTop:  "6px",
              minHeight:  "24px",
            }}
          />
        )}
      </div>

      {/* ── Card ─────────────────────────────────────────── */}
      <div
        style={{
          flex:         1,
          marginBottom: isLast ? 0 : "14px",
          padding:      "16px 18px",
          borderRadius: "18px",
          background:   "#ffffff",
          border:       "1px solid #e2e8f0",
          boxShadow:    "0 4px 14px rgba(15, 23, 42, 0.05)",
          transition:   "box-shadow 0.2s ease, border-color 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#bfdbfe";
          e.currentTarget.style.boxShadow   = "0 8px 24px rgba(37, 99, 235, 0.09)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#e2e8f0";
          e.currentTarget.style.boxShadow   = "0 4px 14px rgba(15, 23, 42, 0.05)";
        }}
      >
        {/* Top row: customer + timestamp */}
        <div
          style={{
            display:        "flex",
            justifyContent: "space-between",
            alignItems:     "flex-start",
            gap:            "12px",
            marginBottom:   "8px",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "0.97rem", color: "#0f172a" }}>
            {item.customer_name ?? item.customer ?? "Unknown Customer"}
          </span>

          <span
            style={{
              flexShrink:  0,
              fontSize:    "0.78rem",
              fontWeight:  500,
              color:       "#94a3b8",
              whiteSpace:  "nowrap",
              paddingTop:  "2px",
            }}
          >
            {formatTimestamp(item.timestamp)}
          </span>
        </div>

        {/* Recommendation */}
        <p
          style={{
            margin:           "0 0 12px",
            fontSize:         "0.88rem",
            lineHeight:       1.55,
            color:            "#475569",
            display:          "-webkit-box",
            WebkitLineClamp:  3,
            WebkitBoxOrient:  "vertical",
            overflow:         "hidden",
          }}
        >
          {recommendation}
        </p>

        {/* Priority badge */}
        <span
          style={{
            display:      "inline-block",
            padding:      "3px 12px",
            borderRadius: "999px",
            background:   meta.bg,
            border:       `1px solid ${meta.border}`,
            color:        meta.color,
            fontSize:     "0.78rem",
            fontWeight:   700,
            letterSpacing:"0.04em",
          }}
        >
          {item.priority ?? "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function DecisionTimeline({ history = [] }) {
  const sorted = sortByTimestamp(history);

  return (
    <section className="section-block">
      <div className="section-header">
        <div>
          <p className="section-eyebrow">Decision Log</p>
          <h2 className="section-title">AI Decision Timeline</h2>
        </div>

        {sorted.length > 0 && (
          <span
            style={{
              padding:      "6px 16px",
              borderRadius: "999px",
              background:   "#eff6ff",
              border:       "1px solid #bfdbfe",
              color:        "#2563eb",
              fontSize:     "0.85rem",
              fontWeight:   700,
              whiteSpace:   "nowrap",
            }}
          >
            {sorted.length} {sorted.length === 1 ? "decision" : "decisions"}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ paddingTop: "4px" }}>
          {sorted.map((item, index) => (
            <TimelineItem
              key={item.id ?? item.timestamp ?? index}
              item={item}
              isLast={index === sorted.length - 1}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default DecisionTimeline;
