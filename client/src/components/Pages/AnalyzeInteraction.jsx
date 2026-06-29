import { useState, useRef } from 'react';
import { usePipeline } from '../../context/PipelineContext';

export default function AnalyzeInteraction() {
  const { SCENARIOS, CATEGORIES, getCategoryNames, currentScenario, setCurrentScenario, runPipeline, pipelineRunning, handleRegisterCategory, blackboard, clearNodes } = usePipeline();

  const [rawInput, setRawInput] = useState('');
  const [stepDelay, setStepDelay] = useState(500);
  const [categoryOverride, setCategoryOverride] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatKeywords, setNewCatKeywords] = useState('');
  const [newCatGuideline, setNewCatGuideline] = useState('');
  const [newCatStatus, setNewCatStatus] = useState('');
  const [newCatOpen, setNewCatOpen] = useState(false);
  const textareaRef = useRef(null);

  const handleScenarioChange = (e) => {
    const selected = SCENARIOS.find(s => s.id === e.target.value);
    if (selected) {
      setCurrentScenario(selected);
      setRawInput(selected.rawInput);
      blackboard.reset();
      clearNodes();
      blackboard.log("System", `Loaded scenario profile: "${selected.title}"`);
    }
  };

  const handleRun = () => {
    runPipeline(rawInput, stepDelay, categoryOverride, currentScenario);
  };

  const handleAddCategory = () => {
    const ok = handleRegisterCategory(newCatName, newCatKeywords, newCatGuideline);
    if (ok) {
      setNewCatStatus(`✅ Category "${newCatName}" registered and is now triageable. Total categories: ${getCategoryNames().length}.`);
      setNewCatName('');
      setNewCatKeywords('');
      setNewCatGuideline('');
    }
  };

  return (
    <div>
      <div className="card mb-6">
        <div className="card-header">
          <h3>Select a scenario or write your own</h3>
        </div>
        <div className="form-group">
          <label>Pre-loaded scenario</label>
          <select className="form-select" onChange={handleScenarioChange} defaultValue="">
            <option value="" disabled>Choose a scenario…</option>
            {SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>{s.title} ({s.category})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Customer interaction details</label>
          <textarea
            ref={textareaRef}
            rows={8}
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder="Paste a customer email, transcript, CRM note, or Slack message here..."
          />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16 }}>
          <div className="form-group" style={{ flex: 1, minWidth: 140, marginBottom: 0 }}>
            <label>Step delay</label>
            <select className="form-select" value={stepDelay} onChange={e => setStepDelay(Number(e.target.value))}>
              <option value={0}>No delay</option>
              <option value={300}>300 ms</option>
              <option value={500}>500 ms</option>
              <option value={1000}>1 s</option>
              <option value={2000}>2 s</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 160, marginBottom: 0 }}>
            <label>Category override</label>
            <select className="form-select" value={categoryOverride} onChange={e => setCategoryOverride(e.target.value)}>
              <option value="">None (Auto-triage)</option>
              {getCategoryNames().map(name => (
                <option key={name} value={name}>Force {CATEGORIES[name].label || name}</option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleRun} disabled={pipelineRunning}>
          {pipelineRunning ? '⏳ Running pipeline...' : '▶ Analyze & generate recommendations'}
        </button>
      </div>

      {/* Register new category */}
      <div className="card">
        <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setNewCatOpen(!newCatOpen)}>
          <h3>Register a new category</h3>
          <span className="collapsible-toggle">{newCatOpen ? '−' : '+'}</span>
        </div>
        {newCatOpen && (
          <div style={{ paddingTop: 12 }}>
            <div className="form-group">
              <label>Category name</label>
              <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="e.g. Compliance" />
            </div>
            <div className="form-group">
              <label>Trigger keywords (comma separated)</label>
              <input type="text" value={newCatKeywords} onChange={e => setNewCatKeywords(e.target.value)} placeholder="e.g. compliance, gdpr, audit, regulation" />
            </div>
            <div className="form-group">
              <label>Guideline / SOP rule (optional)</label>
              <input type="text" value={newCatGuideline} onChange={e => setNewCatGuideline(e.target.value)} placeholder="e.g. Escalate all compliance issues to the legal team within 4 hours." />
            </div>
            <button className="btn btn-primary" onClick={handleAddCategory}>Register category</button>
            {newCatStatus && <p className="text-sm" style={{ marginTop: 8, color: 'var(--color-success)' }}>{newCatStatus}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
