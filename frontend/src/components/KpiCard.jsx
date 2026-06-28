function KpiCard({ title, value, note }) {
  return (
    <article className="kpi-card">
      <span className="kpi-label">{title}</span>
      <strong className="kpi-value">{value}</strong>
      <p className="kpi-note">{note}</p>
    </article>
  )
}

export default KpiCard
