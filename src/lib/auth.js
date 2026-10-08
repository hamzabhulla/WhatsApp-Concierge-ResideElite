import { supabase } from './supabase';

/**
 * Re-checks the signed-in admin's real Supabase password (verified by the server).
 * Used before sensitive actions such as changing API keys.
 *
 * The old dashboard compared the typed text with a password written in the JavaScript
 * source (and compiled into the public bundle), so anybody could read it from the browser.
 */
export async function verifyCurrentUserPassword(password) {
  if (!password) return false;
  const { data } = await supabase.auth.getUser();
  const email = data && data.user && data.user.email;
  if (!email) return false;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}
