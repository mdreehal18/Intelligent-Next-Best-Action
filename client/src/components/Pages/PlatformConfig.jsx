import { useState } from 'react';
import { usePipeline } from '../../context/PipelineContext';

export default function PlatformConfig() {
  const { vectorDb, blackboard, CATEGORIES, getCategoryNames, handleRegisterCategory } = usePipeline();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [keywordsRaw, setKeywordsRaw] = useState('');
  const [playbookName, setPlaybookName] = useState('');
  const [playbookDesc, setPlaybookDesc] = useState('');
  const [guidelines, setGuidelines] = useState([]);
  const [newGuideline, setNewGuideline] = useState('');
  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState('');

  // Editing Category States
  const handleEditClick = (catName) => {
    const cat = CATEGORIES[catName];
    setSelectedCategory(catName);
    setKeywordsRaw((cat.keywords || []).join(', '));
    setPlaybookName(cat.playbook?.name || '');
    setPlaybookDesc(cat.playbook?.description || '');
    setGuidelines([...(cat.playbook?.guidelines || [])]);
    setRules([...(cat.playbook?.rules || [])]);
  };

  const handleSavePlaybook = () => {
    if (!selectedCategory) return;

    const cat = CATEGORIES[selectedCategory];
    cat.keywords = keywordsRaw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    if (!cat.playbook) cat.playbook = {};
    cat.playbook.name = playbookName;
    cat.playbook.description = playbookDesc;
    cat.playbook.guidelines = guidelines;
    cat.playbook.rules = rules;

    blackboard.log('System', `Playbook and rules for category [${selectedCategory}] updated successfully.`);
    alert(`Playbook for [${selectedCategory}] saved successfully!`);
    setSelectedCategory(null);
  };

  const handleClearDb = () => {
    if (window.confirm('Are you sure you want to clear long-term memories back to defaults?')) {
      vectorDb.clear();
      blackboard.log('System', 'Vector DB memory reset to defaults.');
    }
  };

  const handleAddGuideline = () => {
    if (newGuideline.trim()) {
      setGuidelines(prev => [...prev, newGuideline.trim()]);
      setNewGuideline('');
    }
  };

  const handleRemoveGuideline = (idx) => {
    setGuidelines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddRule = () => {
    if (newRule.trim()) {
      setRules(prev => [...prev, newRule.trim()]);
      setNewRule('');
    }
  };

  const handleRemoveRule = (idx) => {
    setRules(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {/* Visual Playbook Builder / Manager */}
      <div className="card mb-6">
        <div className="card-header">
          <h3>Visual Playbook Manager</h3>
        </div>
        <p className="text-sm text-muted mb-4">View, edit, and configure operational guidelines, trigger keywords, and compliance rules for all issue categories.</p>

        {selectedCategory ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--color-primary)', padding: 20, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Configure Category: <strong>{selectedCategory}</strong></h4>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCategory(null)}>Cancel</button>
            </div>

            <div className="form-group">
              <label>Trigger keywords (comma-separated)</label>
              <input type="text" value={keywordsRaw} onChange={e => setKeywordsRaw(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Playbook name</label>
              <input type="text" value={playbookName} onChange={e => setPlaybookName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Playbook description</label>
              <input type="text" value={playbookDesc} onChange={e => setPlaybookDesc(e.target.value)} />
            </div>

            {/* Guidelines */}
            <div className="form-group">
              <label>SOP Guidelines</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {guidelines.map((g, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{g}</span>
                    <button className="btn btn-danger-outline btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleRemoveGuideline(idx)}>Delete</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={newGuideline} onChange={e => setNewGuideline(e.target.value)} placeholder="Add a new guideline step..." />
                <button className="btn btn-secondary" onClick={handleAddGuideline}>Add</button>
              </div>
            </div>

            {/* Enforcement Rules */}
            <div className="form-group">
              <label>Compliance & Enforcement Rules</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {rules.map((r, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: 13 }}>⚠️ {r}</span>
                    <button className="btn btn-danger-outline btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleRemoveRule(idx)}>Delete</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={newRule} onChange={e => setNewRule(e.target.value)} placeholder="Add a new compliance rule..." />
                <button className="btn btn-secondary" onClick={handleAddRule}>Add</button>
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleSavePlaybook} style={{ alignSelf: 'flex-start' }}>💾 Save Playbook Config</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {getCategoryNames().map(name => {
              const cat = CATEGORIES[name];
              return (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{cat.icon || '🆕'}</span>
                      <strong>{cat.label || name}</strong>
                      <span className="badge badge-indigo">{cat.keywords?.length || 0} keywords</span>
                    </div>
                    <div className="text-sm text-muted" style={{ marginTop: 4 }}>
                      {cat.playbook?.name || 'No Playbook Configured'} — {cat.playbook?.guidelines?.length || 0} Guidelines
                    </div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleEditClick(name)}>⚙️ Edit Playbook</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="card mb-6">
        <div className="card-header"><h3>System status</h3></div>
        <div className="status-row">
          <span className="status-dot green" />
          <span>Blackboard shared state</span>
          <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>Active</span>
        </div>
        <div className="status-row">
          <span className="status-dot green" />
          <span>Vector DB (Local Storage)</span>
          <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>Synchronized</span>
        </div>
        <div className="status-row">
          <span className="status-dot amber" />
          <span>Gemini LLM connection</span>
          <span className="text-muted text-sm" style={{ marginLeft: 'auto' }}>Check server/.env file</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card">
        <div className="card-header"><h3>Danger zone</h3></div>
        <p className="text-sm text-muted mb-4">Reset the long-term memory database back to its default seed memories. This cannot be undone.</p>
        <button className="btn btn-danger-outline" onClick={handleClearDb}>🧹 Reset Vector DB memory</button>
      </div>
    </div>
  );
}
