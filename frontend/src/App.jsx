import { Navigate, Route, Routes } from 'react-router-dom';
import { isSupabaseConfigured } from './lib/supabase';
import { ProtectedRoute, PublicOnlyRoute } from './components/RouteGuards';
import AppLayout from './components/AppLayout';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ComingSoonPage from './pages/ComingSoonPage';
import SetupNotice from './pages/SetupNotice';

export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/practice" element={<ComingSoonPage title="AI Practice" module="Module 2" />} />
          <Route path="/exercises" element={<ComingSoonPage title="Exercises" module="Module 3" />} />
          <Route path="/upload" element={<ComingSoonPage title="Upload Recording" module="Module 4" />} />
          <Route path="/analysis" element={<ComingSoonPage title="Analysis & Feedback" module="Modules 5 to 9" />} />
          <Route path="/history" element={<ComingSoonPage title="History" module="Module 10" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
