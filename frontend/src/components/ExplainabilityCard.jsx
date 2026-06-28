// ─── Helpers ────────────────────────────────────────────────────────────────

const REVENUE_THRESHOLD = 500_000;

function formatRevenue(value) {
  if (!value && value !== 0) return null;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function getRevenueMeta(raw) {
  if (raw === null || raw === undefined)
    return { badge: "No data", color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0", status: "neutral" };
  if (raw > REVENUE_THRESHOLD)
    return { badge: "Exceeds",  color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", status: "pass" };
  return   { badge: "Below",   color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", status: "warn" };
}

function getRiskMeta(score) {
  if (score === null || score === undefined)
    return { badge: "No data", color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0", sub: "—" };
  if (score > 60)
    return { badge: "High",   color: "#ef4444", bg: "#fef2f2", border: "#fecaca", sub: "Immediate action needed" };
  if (score >= 30)
    return { badge: "Medium", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", sub: "Monitor closely" };
  return   { badge: "Low",   color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", sub: "Stable — low exposure" };
}

function getOpportunityMeta(score) {
  if (score === null || score === undefined)
    return { badge: "No data", color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0", sub: "—" };
  if (score > 60)
    return { badge: "High",   color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0", sub: "Strong upsell potential" };
  if (score >= 30)
    return { badge: "Medium", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", sub: "Moderate engagement window" };
  return   { badge: "Low",   color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", sub: "Limited near-term window" };
}

function getProductsMeta(products) {
  const has = products && String(products).trim().length > 0;
  return has
    ? { badge: "Active", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" }
    : { badge: "None",   color: "#94a3b8", bg: "#f8fafc", border: "#e2e8f0" };
}

// ─── Status icon ─────────────────────────────────────────────────────────────

function StatusIcon({ status, color }) {
  const icons = {
    pass: (
      <polyline points="20 6 9 17 4 12"
        stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    ),
    warn: (
      <>
        <line x1="12" y1="8" x2="12" y2="13"
          stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1.2" fill="#ffffff" />
      </>
    ),
    fail: (
      <>
        <line x1="8" y1="8" x2="16" y2="16"
          stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="16" y1="8" x2="8" y2="16"
          stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      </>
    ),
    neutral: (
      <line x1="8" y1="12" x2="16" y2="12"
        stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    ),
    info: (
      <>
        <line x1="12" y1="11" x2="12" y2="17"
          stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="8" r="1.2" fill="#ffffff" />
      </>
    ),
  };

  return (
    <div
      style={{
        width:          "32px",
        height:         "32px",
        borderRadius:   "10px",
        background:     color,
        flexShrink:     0,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        boxShadow:      `0 4px 10px ${color}44`,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        {icons[status] ?? icons.neutral}
      </svg>
    </div>
  );
}

// ─── Factor row ──────────────────────────────────────────────────────────────

function FactorRow({ icon, label, value, sub, meta, isLast }) {
  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "flex-start",
        gap:          "14px",
        padding:      "14px 0",
        borderBottom: isLast ? "none" : "1px solid #f1f5f9",
      }}
    >
      {/* Status icon */}
      {icon}

      {/* Label + sub */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.93rem", color: "#0f172a" }}>
          {label}
        </p>
        {sub && (
          <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
            {sub}
          </p>
        )}
      </div>

      {/* Value + badge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px", flexShrink: 0 }}>
        {value !== null && value !== undefined && (
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
            {value}
          </span>
        )}
        <span
          style={{
            padding:      "2px 10px",
            borderRadius: "999px",
            background:   meta.bg,
            border:       `1px solid ${meta.border}`,
            color:        meta.color,
            fontSize:     "0.75rem",
            fontWeight:   700,
            letterSpacing:"0.03em",
          }}
        >
          {meta.badge}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

function ExplainabilityCard({ analysis }) {
  if (!analysis) return null;

  const rawRevenue   = analysis.rawRevenue ?? analysis.revenue_raw ?? null;
  const revenueMeta  = getRevenueMeta(rawRevenue);
  const riskMeta     = getRiskMeta(analysis.risk_score);
  const oppMeta      = getOpportunityMeta(analysis.opportunity_score);
  const productsMeta = getProductsMeta(analysis.products);

  const revenueDisplay = formatRevenue(rawRevenue);
  const revenueThresholdDisplay = `${formatRevenue(REVENUE_THRESHOLD)} threshold`;

  const factors = [
    {
      label:  "Revenue exceeds threshold",
      value:  revenueDisplay,
      sub:    revenueDisplay ? revenueThresholdDisplay : "Revenue data unavailable",
      meta:   revenueMeta,
      status: revenueMeta.status,
      color:  revenueMeta.color,
    },
    {
      label:  "Risk level",
      value:  analysis.risk_score ?? null,
      sub:    riskMeta.sub,
      meta:   riskMeta,
      status: analysis.risk_score > 60 ? "fail"
            : analysis.risk_score >= 30 ? "warn"
            : analysis.risk_score != null ? "pass"
            : "neutral",
      color:  riskMeta.color,
    },
    {
      label:  "Existing products",
      value:  analysis.products || null,
      sub:    analysis.products ? "Relationship depth detected" : "No products on record",
      meta:   productsMeta,
      status: analysis.products ? "info" : "neutral",
      color:  productsMeta.color,
    },
    {
      label:  "Opportunity score",
      value:  analysis.opportunity_score ?? null,
      sub:    oppMeta.sub,
      meta:   oppMeta,
      status: analysis.opportunity_score > 60 ? "pass"
            : analysis.opportunity_score >= 30 ? "info"
            : analysis.opportunity_score != null ? "warn"
            : "neutral",
      color:  oppMeta.color,
    },
  ];

  return (
    <div
      style={{
        borderRadius: "22px",
        border:       "1px solid #e2e8f0",
        background:   "#ffffff",
        boxShadow:    "0 10px 24px rgba(15, 23, 42, 0.05)",
        overflow:     "hidden",
      }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div
        style={{
          padding:    "18px 22px",
          background: "linear-gradient(135deg, #f8fbff 0%, #eff6ff 100%)",
          borderBottom:"1px solid #dbe7ff",
          display:    "flex",
          alignItems: "center",
          gap:        "12px",
        }}
      >
        <div
          style={{
            width:        "36px",
            height:       "36px",
            borderRadius: "12px",
            background:   "linear-gradient(135deg, #2563eb, #1d4ed8)",
            display:      "flex",
            alignItems:   "center",
            justifyContent:"center",
            flexShrink:   0,
            boxShadow:    "0 4px 12px rgba(37, 99, 235, 0.30)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div>
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
            Explainability
          </p>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
            Why AI recommended this
          </h3>
        </div>

        {/* Factor count */}
        <span
          style={{
            marginLeft:   "auto",
            padding:      "4px 12px",
            borderRadius: "999px",
            background:   "#dbeafe",
            color:        "#1d4ed8",
            fontSize:     "0.78rem",
            fontWeight:   700,
            flexShrink:   0,
          }}
        >
          {factors.length} signals
        </span>
      </div>

      {/* ── Factor list ────────────────────────────────── */}
      <div style={{ padding: "4px 22px 8px" }}>
        {factors.map((f, i) => (
          <FactorRow
            key={f.label}
            label={f.label}
            value={f.value}
            sub={f.sub}
            meta={f.meta}
            isLast={i === factors.length - 1}
            icon={<StatusIcon status={f.status} color={f.color} />}
          />
        ))}
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div
        style={{
          padding:     "10px 22px 14px",
          borderTop:   "1px solid #f1f5f9",
          display:     "flex",
          alignItems:  "center",
          gap:         "6px",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
          Signals derived from live customer data · DecisionPilot AI
        </span>
      </div>
    </div>
  );
}

export default ExplainabilityCard;
