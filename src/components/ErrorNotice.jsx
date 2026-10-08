import { explainSupabaseError } from '../lib/utils';

/** Inline error banner (same look as the one on the Leads page). Renders nothing when empty. */
export default function ErrorNotice({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger"
    >
      {explainSupabaseError(message)}
    </div>
  );
}
