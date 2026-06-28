import { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout";
import DashboardHeader from "../components/DashboardHeader";
import KpiGrid from "../components/KpiGrid";
import CustomerGrid from "../components/CustomerGrid";
import SearchBar from "../components/SearchBar";
import SortBar from "../components/SortBar";
import AgentExecutionPanel from "../components/AgentExecutionPanel";
import FinalDecisionCard from "../components/FinalDecisionCard";
import api from "../services/api";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function HomePage() {
  // ── Customer data ─────────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Analysis state ────────────────────────────────────────────────────
  const [analysis, setAnalysis] = useState(null);
  const [trace, setTrace] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // ── Card entrance animation ───────────────────────────────────────────
  const [decisionVisible, setDecisionVisible] = useState(false);

  // ── Filters / sort ────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");

  // ── Fetch customers on mount ──────────────────────────────────────────
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/customers");
        setCustomers(response.data);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // ── Fade-in the FinalDecisionCard once analysis arrives ───────────────
  useEffect(() => {
    if (analysis && !analysisLoading) {
      const timer = setTimeout(() => setDecisionVisible(true), 200);
      return () => clearTimeout(timer);
    }
    setDecisionVisible(false);
  }, [analysis, analysisLoading]);

  // ── Run AI analysis ───────────────────────────────────────────────────
  const runAnalysis = async (customerId) => {
    // Reset previous run
    setAnalysis(null);
    setTrace([]);
    setDecisionVisible(false);
    setAnalysisLoading(true);

    try {
      // Step 1: Full pipeline — runs all 9 agents, caches trace on backend
      const analysisResp = await api.get(`/analysis/${customerId}`);
      setAnalysis(analysisResp.data);

      // Step 2: Fetch trace (instant — backend returns cached result)
      const traceResp = await api.get(`/agent-trace/${customerId}`);
      setTrace(traceResp.data?.workflow ?? []);
    } catch (err) {
      console.error(err);
      alert("Unable to run AI analysis. Please check the backend is running.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ── Close analysis panel ──────────────────────────────────────────────
  const closeAnalysis = () => {
    setAnalysis(null);
    setTrace([]);
    setDecisionVisible(false);
  };

  // ── Derived customer cards ────────────────────────────────────────────
  const customerCards = useMemo(() => {
    return customers.map((customer) => ({
      id: customer.customer_id,
      name: customer.name,
      industry: customer.industry,
      revenue: formatCurrency(customer.revenue),
      rawRevenue: customer.revenue || 0,
      riskScore: customer.risk_score,
      products: Array.isArray(customer.products)
        ? customer.products.join(", ")
        : "",
    }));
  }, [customers]);

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customerCards;
    return customerCards.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.industry.toLowerCase().includes(query) ||
        c.products.toLowerCase().includes(query),
    );
  }, [customerCards, search]);

  const sortedCards = useMemo(() => {
    if (!sortBy) return filteredCards;
    return [...filteredCards].sort((a, b) => {
      if (sortBy === "risk-desc") return b.riskScore - a.riskScore;
      if (sortBy === "risk-asc") return a.riskScore - b.riskScore;
      if (sortBy === "revenue-desc") return b.rawRevenue - a.rawRevenue;
      if (sortBy === "revenue-asc") return a.rawRevenue - b.rawRevenue;
      return 0;
    });
  }, [filteredCards, sortBy]);

  const kpis = useMemo(() => {
    const totalCustomers = customers.length;

    const totalRisk = customers.reduce(
      (sum, c) => sum + (c.risk_score || 0),
      0,
    );

    const averageRisk = totalCustomers
      ? (totalRisk / totalCustomers).toFixed(1)
      : "0.0";

    const highRiskCustomers = customers.filter(
      (c) => (c.risk_score || 0) > 60,
    ).length;

    const totalRevenue = customers.reduce(
      (sum, c) => sum + (c.revenue || 0),
      0,
    );

    const averageRevenue = totalCustomers
      ? formatCurrency(totalRevenue / totalCustomers)
      : formatCurrency(0);

    return [
      {
        title: "Total Customers",
        value: String(totalCustomers),
        note: "Active portfolio accounts",
      },
      {
        title: "Average Risk Score",
        value: averageRisk,
        note: "Across monitored customers",
      },
      {
        title: "High Risk Customers",
        value: String(highRiskCustomers),
        note: "Customers with risk score above 60",
      },
      {
        title: "Average Revenue",
        value: averageRevenue,
        note: "Mean annual customer revenue",
      },
    ];
  }, [customers]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <PageLayout>
      <DashboardHeader
        title="DecisionPilot AI"
        subtitle="Enterprise Decision Intelligence Platform"
      />

      {/* ── Portfolio dashboard ──────────────────────────────────────── */}
      {loading ? (
        <section className="status-panel">
          <div className="loading-spinner" />
          <p className="status-text">Loading customer portfolio...</p>
        </section>
      ) : error ? (
        <section className="status-panel status-panel-error">
          <p className="status-title">Connection issue</p>
          <p className="status-text">{error}</p>
        </section>
      ) : (
        <>
          <KpiGrid items={kpis} />

          <SearchBar search={search} setSearch={setSearch} />
          <SortBar sortBy={sortBy} setSortBy={setSortBy} />

          <CustomerGrid
            customers={sortedCards}
            onAnalyze={runAnalysis}
            analysisLoading={analysisLoading}
          />
        </>
      )}

      {/* ── Agent execution panel + final decision ───────────────────── */}
      {(analysisLoading || analysis) && (
        <>
          {/* Live execution trace */}
          <AgentExecutionPanel trace={trace} loading={analysisLoading} />

          {/* Final decision card — fades in after analysis arrives */}
          {analysis && !analysisLoading && (
            <>
              <div
                style={{
                  opacity: decisionVisible ? 1 : 0,
                  transform: decisionVisible
                    ? "translateY(0)"
                    : "translateY(16px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                  marginTop: "28px",
                }}
              >
                <FinalDecisionCard analysis={analysis} />
              </div>

              {/* Close button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "24px",
                  opacity: decisionVisible ? 1 : 0,
                  transition: "opacity 0.5s ease 0.2s",
                }}
              >
                <button
                  onClick={closeAnalysis}
                  style={{
                    padding: "12px 32px",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#475569",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition:
                      "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#bfdbfe";
                    e.currentTarget.style.color = "#2563eb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f8fafc";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.color = "#475569";
                  }}
                >
                  Close Analysis
                </button>
              </div>
            </>
          )}
        </>
      )}
    </PageLayout>
  );
}

export default HomePage;
