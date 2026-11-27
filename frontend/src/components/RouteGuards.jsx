import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function FullPageSpinner() {
  return (
    <div className="center-page" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
