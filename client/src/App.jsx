import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PipelineProvider } from './context/PipelineContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './components/Pages/Dashboard';
import AnalyzeInteraction from './components/Pages/AnalyzeInteraction';
import AgentPipeline from './components/Pages/AgentPipeline';
import Recommendations from './components/Pages/Recommendations';
import MemoryHistory from './components/Pages/MemoryHistory';
import Analytics from './components/Pages/Analytics';
import PlatformConfig from './components/Pages/PlatformConfig';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="auth-page"><div className="auth-card" style={{ textAlign: 'center' }}>Loading...</div></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={
        <ProtectedRoute>
          <PipelineProvider>
            <AppLayout />
          </PipelineProvider>
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="analyze" element={<AnalyzeInteraction />} />
        <Route path="pipeline" element={<AgentPipeline />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="memory" element={<MemoryHistory />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="config" element={<PlatformConfig />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
