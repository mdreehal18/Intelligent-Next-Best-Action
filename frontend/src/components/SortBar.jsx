import { useState } from "react";

function SortBar({ sortBy, setSortBy }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          padding: "12px 44px 12px 18px",
          background: "#f8fafc",
          border: `1px solid ${focused ? "#bfdbfe" : "#e2e8f0"}`,
          borderRadius: "14px",
          color: sortBy ? "#0f172a" : "#64748b",
          fontSize: "0.95rem",
          fontWeight: "500",
          cursor: "pointer",
          outline: "none",
          boxShadow: focused
            ? "0 0 0 3px rgba(37, 99, 235, 0.10), 0 2px 8px rgba(15, 23, 42, 0.04)"
            : "0 2px 8px rgba(15, 23, 42, 0.04)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease",
        }}
      >
        <option value="">Default</option>
        <option value="risk-desc">Highest Risk</option>
        <option value="risk-asc">Lowest Risk</option>
        <option value="revenue-desc">Highest Revenue</option>
        <option value="revenue-asc">Lowest Revenue</option>
      </select>

      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={focused ? "#2563eb" : "#94a3b8"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: "absolute",
          right: "14px",
          pointerEvents: "none",
          transition: "stroke 0.2s ease",
        }}
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

export default SortBar;
