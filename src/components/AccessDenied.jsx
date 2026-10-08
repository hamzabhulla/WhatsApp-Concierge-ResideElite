import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/** Shown to signed-in users whose account is not marked as admin. */
export default function AccessDenied() {
  const { session, signOut, refreshSession } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stillDenied, setStillDenied] = useState(false);

  async function recheck() {
    setChecking(true);
    setStillDenied(false);
    const s = await refreshSession();
    setChecking(false);
    if (!s || s.user?.app_metadata?.role !== 'admin') setStillDenied(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="card w-full max-w-md p-8 shadow-lift">
        <h1 className="font-display text-2xl font-semibold text-ink">Access denied</h1>
        <p className="mt-2 text-sm text-muted">
          You are signed in as <strong className="text-ink">{session?.user?.email}</strong>, but this
          account is not an administrator of the dashboard.
        </p>
        <p className="mt-3 text-xs text-muted">
          Project owner: run <code className="text-brand">supabase/make-admin.sql</code> for this e-mail in
          the Supabase SQL editor, then press &ldquo;Check again&rdquo;.
        </p>
        {stillDenied && (
          <p className="mt-3 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-xs text-danger">
            Still not an admin. Make sure the SQL ran for exactly this e-mail address.
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <button className="btn-primary flex-1" onClick={recheck} disabled={checking}>
            {checking ? 'Checking…' : 'Check again'}
          </button>
          <button className="btn-outline flex-1" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
