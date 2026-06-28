import CustomerCard from "./CustomerCard";

function CustomerGrid({ customers, onAnalyze, analysisLoading }) {
  return (
    <section className="section-block">
      <div className="section-header">
        <div>
          <p className="section-eyebrow">Portfolio Overview</p>
          <h2 className="section-title">Customers</h2>
        </div>
      </div>

      <div className="customer-grid">
        {customers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onAnalyze={onAnalyze}
            analysisLoading={analysisLoading}
          />
        ))}
      </div>
    </section>
  );
}

export default CustomerGrid;
