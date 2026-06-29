import { usePipeline } from '../../context/PipelineContext';

export default function Analytics() {
  const { vectorDb } = usePipeline();
  const all = vectorDb.getMemories();
  
  // Stats calculations
  const approved = all.filter(m => m.status === 'Approved');
  const rejected = all.filter(m => m.status === 'Rejected');
  
  const approvalRatePct = all.length ? Math.round((approved.length / all.length) * 100) : 0;
  const rejectionRatePct = all.length ? Math.round((rejected.length / all.length) * 100) : 0;
  
  const approvalRateVal = all.length ? `${approvalRatePct}%` : '--%';
  const rejectionRateVal = all.length ? `${rejectionRatePct}%` : '--%';

  // 1. Category Distribution
  const categoryCounts = {};
  all.forEach(m => {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
  });
  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  // 2. Urgency Breakdown
  const urgencyCounts = { 'Low': 0, 'Medium': 0, 'High': 0, 'P1 Blocker': 0 };
  all.forEach(m => {
    // Map status/outcome or rawInput keywords to estimate urgency for historical cases
    const text = (m.rawInput + ' ' + m.outcome).toLowerCase();
    if (text.includes('p1') || text.includes('blocker') || text.includes('down')) {
      urgencyCounts['P1 Blocker']++;
    } else if (text.includes('urgent') || text.includes('high') || text.includes('threat')) {
      urgencyCounts['High']++;
    } else if (text.includes('low') || text.includes('training')) {
      urgencyCounts['Low']++;
    } else {
      urgencyCounts['Medium']++;
    }
  });

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card highlight-green">
          <div className="kpi-label">Approval rate</div>
          <div className="kpi-value">{approvalRateVal}</div>
        </div>
        <div className="kpi-card highlight-rose">
          <div className="kpi-label">Rejection rate</div>
          <div className="kpi-value">{rejectionRateVal}</div>
        </div>
        <div className="kpi-card highlight-indigo">
          <div className="kpi-label">Total processed cases</div>
          <div className="kpi-value">{all.length}</div>
        </div>
        <div className="kpi-card highlight-amber">
          <div className="kpi-label">Active playbooks</div>
          <div className="kpi-value">6</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Category Distribution */}
        <div className="card">
          <div className="card-header">
            <h3>Category distribution</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {Object.keys(categoryCounts).length === 0 ? (
              <div className="text-muted text-sm" style={{ padding: '20px 0', textAlign: 'center' }}>No category data yet.</div>
            ) : (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / maxCategoryCount) * 100);
                return (
                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span><strong>{cat}</strong></span>
                      <span className="text-muted">{count} case(s)</span>
                    </div>
                    <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden', width: '100%' }}>
                      <div style={{ height: '100%', background: 'var(--color-primary)', width: `${pct}%`, borderRadius: 6 }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Urgency Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3>Urgency ratio</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {all.length === 0 ? (
              <div className="text-muted text-sm" style={{ padding: '20px 0', textAlign: 'center' }}>No urgency data yet.</div>
            ) : (
              Object.entries(urgencyCounts).map(([urgency, count]) => {
                const pct = Math.round((count / all.length) * 100);
                let color = 'var(--color-primary)';
                if (urgency === 'P1 Blocker') color = 'var(--color-danger)';
                else if (urgency === 'High') color = 'var(--color-warning)';
                else if (urgency === 'Low') color = 'var(--color-success)';

                return (
                  <div key={urgency} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span><strong>{urgency}</strong></span>
                      <span className="text-muted">{pct}% ({count})</span>
                    </div>
                    <div style={{ height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden', width: '100%' }}>
                      <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: 6 }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Approval vs Rejection breakdown & Risk Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Approval breakdown donut representation */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <div className="card-header" style={{ width: '100%' }}>
            <h3>Approval ratio</h3>
          </div>
          <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}>
            {/* Simple CSS Circular Progress Ring */}
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: `conic-gradient(var(--color-success) ${approvalRatePct * 3.6}deg, var(--color-danger) 0deg)`,
              display: 'flex',
              alignItems: 'center',
              justify: 'center'
            }}>
              <div style={{
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 'auto'
              }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{approvalRatePct}%</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Approved</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)' }} />
              <span>Approved ({approved.length})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-danger)' }} />
              <span>Rejected ({rejected.length})</span>
            </div>
          </div>
        </div>

        {/* Risk Trend */}
        <div className="card">
          <div className="card-header">
            <h3>Risk trend</h3>
          </div>
          <div className="chart-bars" style={{ height: 180, marginTop: 12 }}>
            {all.filter(m => m.riskScore).length > 0 ? (
              all.filter(m => m.riskScore).slice(-12).map((m, i) => (
                <div key={i} className="bar" style={{
                  height: `${m.riskScore}%`,
                  background: m.riskScore > 70 ? 'var(--color-danger)' : 'var(--color-primary)'
                }} />
              ))
            ) : (
              <div style={{ flex: 1, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', alignSelf: 'center' }}>No risk data yet</div>
            )}
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 8, textAlign: 'center' }}>Showing account risk score trend for the last 12 processed cases.</p>
        </div>
      </div>
    </div>
  );
}
