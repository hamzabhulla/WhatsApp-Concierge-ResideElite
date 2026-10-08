import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import AccessDenied from './components/AccessDenied';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';

// Pages are loaded on demand: the charts library (Overview) and the 1,000-line Training page
// no longer have to be downloaded before the login screen can appear.
const Overview = lazy(() => import('./pages/Overview'));
const Leads = lazy(() => import('./pages/Leads'));
const Conversations = lazy(() => import('./pages/Conversations'));
const Training = lazy(() => import('./pages/Training'));
const Properties = lazy(() => import('./pages/Properties'));
const Connection = lazy(() => import('./pages/Connection'));
const Settings = lazy(() => import('./pages/Settings'));

const PageFallback = () => (
  <div className="flex h-64 items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="card w-full max-w-lg p-8 shadow-lift">
        <h1 className="font-display text-2xl font-semibold text-ink">Dashboard is not configured</h1>
        <p className="mt-2 text-sm text-muted">
          <code className="text-brand">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-brand">VITE_SUPABASE_ANON_KEY</code> are missing. Add them in your hosting
          provider&apos;s environment variables (or in a local <code className="text-brand">.env</code> file), then
          rebuild / redeploy. See the README.
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { session, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <AccessDenied />;
  return children;
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigError />;

  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="leads" element={<Leads />} />
        <Route path="conversations" element={<Conversations />} />
        <Route path="training" element={<Training />} />
        <Route path="properties" element={<Properties />} />
        <Route path="connection" element={<Connection />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
