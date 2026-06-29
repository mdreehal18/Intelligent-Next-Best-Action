import { usePipeline } from '../../context/PipelineContext';

export default function Dashboard() {
  const { vectorDb } = usePipeline();
  const all = vectorDb.getMemories();
  const approved = all.filter(m => m.status === 'Approved');
  const rejected = all.filter(m => m.status === 'Rejected');
  const approvalRate = all.length ? `${Math.round(approved.length / all.length * 100)}%` : '--%';

  // Top category insight
  const categoryCounts = {};
  all.forEach(m => { categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1; });
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const insightText = topCategory
    ? `Most common issue type: "${topCategory[0]}" with ${topCategory[1]} case(s). This category should have the most refined playbook and memory.`
    : 'No cases processed yet. Go to Analyze interaction to start.';

  return (
    <div>
      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total cases analysed</div>
          <div className="kpi-value">{all.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Approval rate</div>
          <div className="kpi-value">{approvalRate}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg risk score</div>
          <div className="kpi-value">--</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg pipeline time</div>
          <div className="kpi-value">--s</div>
        </div>
      </div>

      {/* Quick Insight */}
      <div className="card mb-6">
        <div className="card-header"><h3>Quick insight</h3></div>
        <p className="text-sm text-muted">{insightText}</p>
      </div>

      {/* Recent Cases */}
      <div className="card">
        <div className="card-header"><h3>Recent cases</h3></div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                <th>Category</th>
                <th>Outcome</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {all.length === 0 ? (
                <tr><td colSpan={4} className="table-empty">No cases processed yet. Go to Analyze interaction to start.</td></tr>
              ) : (
                all.slice(0, 8).map(mem => (
                  <tr key={mem.id}>
                    <td>{mem.accountName}</td>
                    <td>{mem.category}</td>
                    <td>{mem.outcome.substring(0, 45)}{mem.outcome.length > 45 ? '...' : ''}</td>
                    <td><span className={`badge ${mem.status === 'Approved' ? 'badge-green' : 'badge-red'}`}>{mem.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
