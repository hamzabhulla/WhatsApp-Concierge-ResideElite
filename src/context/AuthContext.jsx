import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  // Same rule as the database policies (supabase/setup.sql): app_metadata can only be written
  // by the project owner, so users cannot promote themselves. The database enforces this too;
  // this flag only lets the UI explain "access denied" instead of showing empty tables.
  const isAdmin = session?.user?.app_metadata?.role === 'admin';

  // After make-admin.sql the new role only appears in a NEW token; this fetches one without a re-login.
  const refreshSession = async () => {
    const { data } = await supabase.auth.refreshSession();
    if (data?.session) setSession(data.session);
    return data?.session ?? null;
  };

  return (
    <AuthContext.Provider value={{ session, loading, isAdmin, signIn, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
