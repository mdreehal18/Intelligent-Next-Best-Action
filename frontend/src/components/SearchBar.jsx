import { useState } from "react";

function SearchBar({ search, setSearch }) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "12px 18px",
        background: "#f8fafc",
        border: `1px solid ${focused ? "#bfdbfe" : "#e2e8f0"}`,
        borderRadius: "999px",
        boxShadow: focused
          ? "0 0 0 3px rgba(37, 99, 235, 0.10), 0 2px 8px rgba(15, 23, 42, 0.04)"
          : "0 2px 8px rgba(15, 23, 42, 0.04)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke={focused ? "#2563eb" : "#94a3b8"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, transition: "stroke 0.2s ease" }}
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search customer..."
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "#0f172a",
          fontSize: "0.95rem",
        }}
      />
    </div>
  );
}

export default SearchBar;
