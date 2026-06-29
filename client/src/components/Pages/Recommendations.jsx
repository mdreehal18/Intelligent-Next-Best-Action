import { useState } from 'react';
import { usePipeline } from '../../context/PipelineContext';

export default function Recommendations() {
  const { bbState, showNbaOutput, approveAction, rejectAction, gapModal, submitGapResolution, cancelGapGathering, generateDraft } = usePipeline();
  const [actionStates, setActionStates] = useState({});
  const [feedbackForms, setFeedbackForms] = useState({});
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [gapInput, setGapInput] = useState('');

  // Draft Modal State
  const [draftModal, setDraftModal] = useState({ show: false, loading: false, text: '', nba: null });

  const handleApproveClick = async (nba) => {
    setDraftModal({ show: true, loading: true, text: '', nba });
    try {
      const draft = await generateDraft(nba);
      setDraftModal({ show: true, loading: false, text: draft, nba });
    } catch (err) {
      setDraftModal({ show: true, loading: false, text: `Failed to generate draft: ${err.message}\n\nYou can still approve and log the action manually.`, nba });
    }
  };

  const handleSendAndLog = async () => {
    const { nba } = draftModal;
    await approveAction(nba.id);
    setActionStates(prev => ({ ...prev, [nba.id]: 'approved' }));
    setDraftModal({ show: false, loading: false, text: '', nba: null });
  };

  const showRejectForm = (id) => {
    setFeedbackForms(prev => ({ ...prev, [id]: true }));
  };

  const cancelReject = (id) => {
    setFeedbackForms(prev => ({ ...prev, [id]: false }));
  };

  const handleReject = async (id) => {
    const reason = feedbackInputs[id] || 'No explanation provided.';
    await rejectAction(id, reason);
    setActionStates(prev => ({ ...prev, [id]: 'rejected' }));
    setFeedbackForms(prev => ({ ...prev, [id]: false }));
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftModal.text);
    alert('Copied draft to clipboard!');
  };

  if (!showNbaOutput) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💡</div>
        <p className="text-muted">Recommendations will appear here after running the agent pipeline from the Analyze page.</p>
      </div>
    );
  }

  const confScore = bbState.explanation.confidenceScore;
  let confClass = 'badge-green';
  if (confScore <= 65) confClass = 'badge-red';
  else if (confScore <= 85) confClass = 'badge-orange';

  return (
    <div>
      {/* Gap Modal */}
      {gapModal.show && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>⚠️ Critical data gaps detected</h3>
            <p className="text-sm text-muted">The following information is missing and needed for accurate recommendations:</p>
            <div style={{ margin: '12px 0' }}>
              {gapModal.allFields.map((f, i) => (
                <div key={i} style={{ fontSize: 13, borderLeft: `3px solid ${f.importance === 'Critical' ? 'var(--color-danger)' : 'var(--color-warning)'}`, paddingLeft: 10, margin: '4px 0' }}>
                  <strong>{f.field}</strong> [{f.importance}]: {f.description}
                </div>
              ))}
            </div>
            {gapModal.currentIndex < gapModal.gaps.length && (
              <>
                <label className="text-sm" style={{ fontWeight: 600 }}>Enter details for critical field [{gapModal.gaps[gapModal.currentIndex].field}]:</label>
                <input
                  type="text"
                  value={gapInput}
                  onChange={e => setGapInput(e.target.value)}
                  placeholder={gapModal.gaps[gapModal.currentIndex].description}
                  style={{ marginTop: 8, marginBottom: 12 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" onClick={() => { submitGapResolution(gapInput); setGapInput(''); }}>Submit</button>
                  <button className="btn btn-danger-outline" onClick={cancelGapGathering}>Skip all gaps</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI Draft Modal */}
      {draftModal.show && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 650, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h3>✉️ AI-Generated Action Draft</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setDraftModal({ show: false, loading: false, text: '', nba: null })} style={{ padding: '4px 8px' }}>✕</button>
            </div>
            {draftModal.loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <span className="text-muted">Generating personalized draft using Gemini...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <p className="text-sm text-muted">Review, edit, or copy this draft based on the playbook guidelines:</p>
                <textarea
                  value={draftModal.text}
                  onChange={e => setDraftModal(prev => ({ ...prev, text: e.target.value }))}
                  rows={10}
                  style={{ width: '100%', fontFamily: 'var(--font)', fontSize: 13, lineHeight: 1.6 }}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={handleCopyDraft}>📋 Copy draft</button>
                  <button className="btn btn-primary" onClick={handleSendAndLog}>✅ Send & log execution</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Explanation Block */}
      <div className="card mb-6">
        <div className="card-header">
          <h3>Explanation — chain of thought</h3>
          <span className={`badge ${confClass}`}>Confidence: {confScore}%</span>
        </div>
        <p className="explanation-cot">{bbState.explanation.chainOfThought}</p>
        <div style={{ marginTop: 12 }}>
          {(bbState.explanation.evidence || []).map((ev, i) => (
            <div key={i} className="evidence-item">📖 <span style={{ flex: 1 }}>{ev}</span></div>
          ))}
        </div>
      </div>

      {/* NBA Cards */}
      {bbState.recommendation.nbas.map((nba, idx) => {
        const state = actionStates[nba.id];
        return (
          <div key={nba.id} className={`nba-card ${state || ''}`}>
            <div className="nba-header">
              <h3 className="nba-title">{idx + 1}. {nba.title}</h3>
              <span className={`badge ${nba.priority === 'High' ? 'badge-red' : 'badge-orange'}`}>{nba.priority} priority</span>
            </div>
            <div className="nba-meta"><span>Type: <strong>{nba.actionType}</strong></span></div>
            <p className="nba-details">{nba.details}</p>
            <div className="nba-impact">Impact: {nba.impact}</div>

            {!state && !feedbackForms[nba.id] && (
              <div className="nba-actions-row">
                <button className="btn btn-sm btn-approve" onClick={() => handleApproveClick(nba)}>✅ Approve & execute</button>
                <button className="btn btn-sm btn-reject" onClick={() => showRejectForm(nba.id)}>✕ Reject action</button>
              </div>
            )}

            {feedbackForms[nba.id] && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <label style={{ fontSize: 12, color: 'var(--color-danger)' }}>Reason for rejection / modification:</label>
                <input
                  type="text"
                  value={feedbackInputs[nba.id] || ''}
                  onChange={e => setFeedbackInputs(prev => ({ ...prev, [nba.id]: e.target.value }))}
                  placeholder="e.g. Budget discount is too high, customer has low churn risk"
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm" onClick={() => cancelReject(nba.id)}>Cancel</button>
                  <button className="btn btn-sm btn-reject" onClick={() => handleReject(nba.id)}>Log rejection</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
