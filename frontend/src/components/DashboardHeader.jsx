function DashboardHeader({ title, subtitle }) {
  return (
    <header className="dashboard-navbar">
      <div>
        <p className="dashboard-eyebrow">Decision Intelligence Workspace</p>
        <h1 className="dashboard-title">{title}</h1>
        <p className="dashboard-subtitle">{subtitle}</p>
      </div>
    </header>
  )
}

export default DashboardHeader
