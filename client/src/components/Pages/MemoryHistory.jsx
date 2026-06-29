import { useState } from 'react';
import { usePipeline } from '../../context/PipelineContext';

export default function MemoryHistory() {
  const { vectorDb } = usePipeline();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const memories = vectorDb.getMemories();

  let filtered = memories;
  if (statusFilter !== 'all') {
    filtered = filtered.filter(m => m.status === statusFilter);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(m =>
      m.accountName.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.rawInput.toLowerCase().includes(q) ||
      m.outcome.toLowerCase().includes(q)
    );
  }

  return (
    <div>
      {/* Search and filters */}
      <div className="card mb-6">
        <div className="card-header"><h3>Search long-term memory</h3></div>
        <input
          type="text"
          placeholder="Search by account name, category, input, or outcome..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <div className="filter-tabs" style={{ marginTop: 12 }}>
          {['all', 'Approved', 'Rejected'].map(f => (
            <button
              key={f}
              className={`filter-tab${statusFilter === f ? ' active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Memory cards */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <span className="text-muted">No memory entries{searchQuery ? ' matching your search' : ''}.</span>
        </div>
      ) : (
        filtered.map(mem => (
          <div key={mem.id} className="memory-history-card">
            <div className="memory-header">
              <span>{mem.accountName} — {mem.category}</span>
              <span className={`badge ${mem.status === 'Approved' ? 'badge-green' : 'badge-red'}`}>{mem.status}</span>
            </div>
            <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontStyle: 'italic' }}>
              "{mem.rawInput.substring(0, 80)}{mem.rawInput.length > 80 ? '...' : ''}"
            </div>
            <div style={{ color: 'var(--text-primary)' }}><strong>Decision:</strong> {mem.outcome}</div>
            <div style={{ color: 'var(--color-success)', marginTop: 6, fontSize: 12, background: 'var(--color-success-light)', padding: '6px 10px', borderRadius: 6 }}>
              📝 {mem.feedback}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
