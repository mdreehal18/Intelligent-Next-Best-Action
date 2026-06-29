import { useRef, useEffect, useState } from 'react';
import { usePipeline } from '../../context/PipelineContext';

const NODES = [
  { id: 'node-triage', label: 'Planner / Triage', icon: '🗂️' },
  { id: 'node-extraction', label: 'Extraction Agent', icon: '🔬' },
  { id: 'node-knowledge', label: 'Knowledge RAG', icon: '📖' },
  { id: 'node-memory', label: 'Memory Agent', icon: '🧠' },
  { id: 'node-bi', label: 'BI Agents (Risk / Opp / Gap)', icon: '📊' },
  { id: 'node-recommendation', label: 'Recommendation + Explanation', icon: '💡' },
];

export default function AgentPipeline() {
  const { bbState, nodeStates, connectorPct, logs, blackboard, bbModified, setBbModified, recalculateRecommendations, CATEGORIES, getCategoryNames } = usePipeline();
  const logsRef = useRef(null);

  // Editing States
  const [editingCategory, setEditingCategory] = useState(false);
  const [editingSentiment, setEditingSentiment] = useState(false);
  const [editingUrgency, setEditingUrgency] = useState(false);
  const [editingRisk, setEditingRisk] = useState(false);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  const handleFieldChange = (path, value) => {
    blackboard.update(path, value);
    setBbModified(true);
  };

  const ctx = bbState.context || {};

  return (
    <div style={{ paddingBottom: bbModified ? 80 : 0 }}>
      {/* Agent Graph */}
      <div className="card mb-6">
        <div className="card-header"><h3>Agent execution graph</h3></div>
        <div className="agent-graph">
          <div className="graph-connector-line">
            <div className="graph-connector-fill" style={{ width: `${connectorPct}%` }} />
          </div>
          {NODES.map(n => (
            <div key={n.id} className={`agent-node ${nodeStates[n.id] || ''}`}>
              <div className="agent-node-icon">{n.icon}</div>
              <div className="agent-node-label">{n.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Blackboard Summary Cards */}
      <div className="blackboard-grid">
        {/* Triage Card */}
        <div className="card bb-card">
          <div className="card-header">
            <h3>Triage result</h3>
            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => setEditingCategory(!editingCategory)}>
              {editingCategory ? 'Done' : '✏️ Edit'}
            </button>
          </div>
          <div className="bb-row">
            <span className="bb-label">Category:</span>
            {editingCategory ? (
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                value={bbState.triage.category}
                onChange={e => handleFieldChange('triage.category', e.target.value)}
              >
                <option value="Unclassified">Unclassified</option>
                {getCategoryNames().map(name => (
                  <option key={name} value={name}>{CATEGORIES[name].label || name}</option>
                ))}
              </select>
            ) : (
              <span className="bb-value">{bbState.triage.category || '—'}</span>
            )}
          </div>
          <div className="bb-row">
            <span className="bb-label">Confidence:</span>
            <span className="bb-value">{bbState.triage.confidence ? `${Math.round(bbState.triage.confidence * 100)}%` : '—'}</span>
          </div>
        </div>

        {/* Extraction Card */}
        <div className="card bb-card">
          <div className="card-header">
            <h3>Extraction</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => { setEditingSentiment(!editingSentiment); setEditingUrgency(!editingUrgency); }}>
                {editingSentiment ? 'Done' : '✏️ Edit'}
              </button>
            </div>
          </div>
          <div className="bb-row">
            <span className="bb-label">Sentiment:</span>
            {editingSentiment ? (
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                value={bbState.extraction.sentiment}
                onChange={e => handleFieldChange('extraction.sentiment', e.target.value)}
              >
                <option value="Positive">Positive</option>
                <option value="Neutral">Neutral</option>
                <option value="Negative">Negative</option>
              </select>
            ) : (
              <span className="bb-value" style={{ color: bbState.extraction.sentiment === 'Negative' ? 'var(--color-danger)' : bbState.extraction.sentiment === 'Positive' ? 'var(--color-success)' : '' }}>
                {bbState.extraction.sentiment || '—'}
              </span>
            )}
          </div>
          <div className="bb-row">
            <span className="bb-label">Urgency:</span>
            {editingUrgency ? (
              <select
                className="form-select"
                style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                value={bbState.extraction.urgency}
                onChange={e => handleFieldChange('extraction.urgency', e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="P1 Blocker">P1 Blocker</option>
              </select>
            ) : (
              <span className="bb-value">{bbState.extraction.urgency || '—'}</span>
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            {(bbState.extraction.entities || []).map((ent, i) => (
              <span key={i} className="badge badge-indigo" style={{ marginRight: 4, marginBottom: 4 }}>{ent}</span>
            ))}
            {(!bbState.extraction.entities || bbState.extraction.entities.length === 0) && <span className="text-muted text-sm">No entities found</span>}
          </div>
        </div>

        {/* Account Metadata */}
        <div className="card bb-card">
          <div className="card-header"><h3>Account metadata</h3></div>
          <div className="bb-meta">
            <div><strong>Account:</strong> {ctx.accountName || 'Unknown'}</div>
            <div><strong>ARR:</strong> {ctx.arr || 'Unknown'}</div>
            <div><strong>Renewal window:</strong> {ctx.renewalDays ? ctx.renewalDays + ' days' : 'Unknown'}</div>
            <div><strong>Usage change:</strong> {ctx.usageChange || '0%'}</div>
            <div><strong>Key contact:</strong> {ctx.primaryContact || 'Unknown'}</div>
            <div><strong>Decision maker:</strong> {ctx.decisionMaker || 'Unknown'}</div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="card bb-card">
          <div className="card-header">
            <h3>Risk assessment</h3>
            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => setEditingRisk(!editingRisk)}>
              {editingRisk ? 'Done' : '✏️ Edit'}
            </button>
          </div>
          <div className="bb-row">
            <span className="bb-label">Score:</span>
            {editingRisk ? (
              <input
                type="number"
                min="0"
                max="100"
                style={{ padding: '4px 8px', fontSize: 12, width: '70px', background: 'var(--bg-input)' }}
                value={bbState.biAnalysis.riskScore || 0}
                onChange={e => handleFieldChange('biAnalysis.riskScore', Math.min(100, Math.max(0, Number(e.target.value))))}
              />
            ) : (
              <span className="bb-value" style={{ color: bbState.biAnalysis.riskScore > 60 ? 'var(--color-danger)' : bbState.biAnalysis.riskScore > 30 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {bbState.biAnalysis.riskScore ? `${bbState.biAnalysis.riskScore}%` : '—%'}
              </span>
            )}
          </div>
          <div className="risk-meter">
            <div className="risk-fill" style={{ width: `${bbState.biAnalysis.riskScore || 0}%`, backgroundColor: bbState.biAnalysis.riskScore > 60 ? 'var(--color-danger)' : bbState.biAnalysis.riskScore > 30 ? 'var(--color-warning)' : 'var(--color-success)' }} />
          </div>
          <div style={{ marginTop: 8 }}>
            {(bbState.biAnalysis.riskFactors || []).map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'start', gap: 6 }}>⚠️ <span style={{ fontSize: 12 }}>{f}</span></div>
            ))}
            {(!bbState.biAnalysis.riskFactors || bbState.biAnalysis.riskFactors.length === 0) && <span className="text-muted text-sm">No risk flags active.</span>}
          </div>
        </div>
      </div>

      {/* Console Logs */}
      <div className="card mt-6">
        <div className="card-header">
          <h3>Console logs</h3>
        </div>
        <div className="console-box" ref={logsRef}>
          {logs.map((log, i) => {
            let cls = 'console-line';
            if (log.message.includes('failed') || log.message.includes('Error')) cls += ' warn';
            if (log.message.includes('Successfully') || log.message.includes('Complete')) cls += ' success';
            return <div key={i} className={cls}><span>[{log.timestamp}]</span>{log.message}</div>;
          })}
          {logs.length === 0 && <div className="text-muted text-sm" style={{ padding: 12 }}>No logs yet. Run a pipeline to see agent output.</div>}
        </div>
      </div>

      {/* Recalculate Recommendations Floating Banner */}
      {bbModified && (
        <div className="floating-recalc-banner">
          <div className="floating-banner-content">
            <span>⚠️ <strong>Blackboard state modified!</strong> Your manual adjustments will affect the generated Next Best Actions.</span>
            <button className="btn btn-primary btn-sm" onClick={recalculateRecommendations}>🔄 Recalculate Recommendations</button>
          </div>
        </div>
      )}
    </div>
  );
}
