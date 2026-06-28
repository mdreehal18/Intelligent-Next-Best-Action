function AnalysisModal({ analysis, onClose }) {
  if (!analysis) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h2>AI Decision Analysis</h2>

        <div className="analysis-row">
          <strong>Customer</strong>
          <span>{analysis.customer_name}</span>
        </div>

        <div className="analysis-row">
          <strong>Risk Score</strong>
          <span>{analysis.risk_score}</span>
        </div>

        <div className="analysis-row">
          <strong>Opportunity Score</strong>
          <span>{analysis.opportunity_score}</span>
        </div>

        <div className="analysis-row">
          <strong>Segment</strong>
          <span>{analysis.segment}</span>
        </div>

        <div className="analysis-row">
          <strong>Priority</strong>
          <span>{analysis.priority}</span>
        </div>

        <button className="primary-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default AnalysisModal;
