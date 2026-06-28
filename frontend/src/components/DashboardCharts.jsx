import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const RISK_COLORS = {
  "High Risk":   "#ef4444",
  "Medium Risk": "#f59e0b",
  "Low Risk":    "#22c55e",
};

const BAR_GRADIENT_ID = "revenueBarGradient";

const cardStyle = {
  padding: "24px",
  border: "1px solid #e2e8f0",
  borderRadius: "22px",
  background: "#ffffff",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
  minWidth: 0,
};

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
  fontSize: "0.88rem",
  color: "#0f172a",
};

function formatRevenue(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function truncate(str, max = 10) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={700}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function DashboardCharts({ customers }) {
  const riskData = useMemo(() => {
    const high   = customers.filter((c) => c.riskScore > 60).length;
    const medium = customers.filter((c) => c.riskScore >= 30 && c.riskScore <= 60).length;
    const low    = customers.filter((c) => c.riskScore < 30).length;
    return [
      { name: "High Risk",   value: high },
      { name: "Medium Risk", value: medium },
      { name: "Low Risk",    value: low },
    ].filter((d) => d.value > 0);
  }, [customers]);

  const revenueData = useMemo(() => {
    return [...customers]
      .sort((a, b) => b.rawRevenue - a.rawRevenue)
      .map((c) => ({
        name:    truncate(c.name),
        fullName: c.name,
        revenue: c.rawRevenue,
      }));
  }, [customers]);

  return (
    <section className="section-block">
      <div className="section-header">
        <div>
          <p className="section-eyebrow">Analytics</p>
          <h2 className="section-title">Portfolio Insights</h2>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          alignItems: "stretch",
        }}
      >
        {/* ── Pie Chart ───────────────────────────────────────── */}
        <div style={{ ...cardStyle, flex: "1 1 280px" }}>
          <p className="detail-label" style={{ marginBottom: "4px" }}>
            Risk Distribution
          </p>
          <p style={{ margin: "0 0 20px", fontSize: "0.85rem", color: "#64748b" }}>
            Customers by risk tier
          </p>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={CustomPieLabel}
              >
                {riskData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={RISK_COLORS[entry.name]}
                    stroke="none"
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(value, name) => [value + " customers", name]}
                contentStyle={tooltipStyle}
              />

              <Legend
                iconType="circle"
                iconSize={9}
                wrapperStyle={{ fontSize: "0.85rem", color: "#475569", paddingTop: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ── Bar Chart ───────────────────────────────────────── */}
        <div style={{ ...cardStyle, flex: "2 1 360px" }}>
          <p className="detail-label" style={{ marginBottom: "4px" }}>
            Revenue by Customer
          </p>
          <p style={{ margin: "0 0 20px", fontSize: "0.85rem", color: "#64748b" }}>
            Annual revenue ranked highest to lowest
          </p>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={revenueData}
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
              barCategoryGap="30%"
            >
              <defs>
                <linearGradient id={BAR_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#2563eb" stopOpacity={1} />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.75} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tickFormatter={formatRevenue}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />

              <Tooltip
                cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
                formatter={(value, _key, props) => [
                  formatRevenue(value),
                  props.payload.fullName,
                ]}
                contentStyle={tooltipStyle}
              />

              <Bar
                dataKey="revenue"
                fill={`url(#${BAR_GRADIENT_ID})`}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

export default DashboardCharts;
