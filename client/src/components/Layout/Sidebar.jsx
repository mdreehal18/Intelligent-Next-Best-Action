import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', icon: '🏠', label: 'Dashboard' },
  { path: '/analyze', icon: '📥', label: 'Analyze interaction' },
  { path: '/pipeline', icon: '🤖', label: 'Agent pipeline' },
  { path: '/recommendations', icon: '💡', label: 'Recommendations' },
  { path: '/memory', icon: '🧠', label: 'Memory & history' },
  { path: '/analytics', icon: '📊', label: 'Analytics' },
  { path: '/config', icon: '⚙️', label: 'Platform config' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🛡️</div>
        <span className="sidebar-logo-text">AgentFusion</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>↩ Synced (Local Storage)</span>
      </div>
    </aside>
  );
}
