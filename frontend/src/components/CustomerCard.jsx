function CustomerCard({ customer, onAnalyze, analysisLoading }) {
  return (
    <article className="customer-card">
      <div className="customer-card-header">
        <div>
          <h3 className="customer-name">{customer.name}</h3>
          <p className="customer-industry">{customer.industry}</p>
        </div>

        <span className="risk-badge">Risk {customer.riskScore}</span>
      </div>

      <div className="customer-details customer-details-expanded">
        <div className="detail-item">
          <span className="detail-label">Revenue</span>

          <strong className="detail-value">{customer.revenue}</strong>
        </div>

        <div className="detail-item">
          <span className="detail-label">Risk Score</span>

          <strong className="detail-value">{customer.riskScore}</strong>
        </div>

        <div className="detail-item detail-item-full">
          <span className="detail-label">Products</span>

          <strong className="detail-value">
            {customer.products || "No products listed"}
          </strong>
        </div>
      </div>

      <button
        className="primary-button"
        disabled={analysisLoading}
        onClick={() => {
          if (typeof onAnalyze === "function") {
            onAnalyze(customer.id);
          }
        }}
      >
        {analysisLoading ? "Running..." : "Run AI Analysis"}
      </button>
    </article>
  );
}

export default CustomerCard;
