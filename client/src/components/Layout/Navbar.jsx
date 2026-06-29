import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/analyze': 'Analyze interaction',
  '/pipeline': 'Agent pipeline',
  '/recommendations': 'Recommendations',
  '/memory': 'Memory & history',
  '/analytics': 'Analytics',
  '/config': 'Platform config',
};

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const title = PAGE_TITLES[pathname] || 'Dashboard';
  const initials = user ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'CS';

  return (
    <header className="navbar">
      <h2 className="navbar-title">{title}</h2>
      <div className="navbar-actions">
        <button className="navbar-icon-btn" title="Notifications">🔔</button>
        <div className="navbar-avatar" onClick={logout} title="Click to logout" style={{ cursor: 'pointer' }}>{initials}</div>
      </div>
    </header>
  );
}
