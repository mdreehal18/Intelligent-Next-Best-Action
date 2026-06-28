import KpiCard from './KpiCard'

function KpiGrid({ items }) {
  return (
    <section className="section-block">
      <div className="kpi-grid">
        {items.map((item) => (
          <KpiCard
            key={item.title}
            title={item.title}
            value={item.value}
            note={item.note}
          />
        ))}
      </div>
    </section>
  )
}

export default KpiGrid
