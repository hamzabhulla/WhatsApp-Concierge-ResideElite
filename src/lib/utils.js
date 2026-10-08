import { format, parseISO } from 'date-fns';

/**
 * Make a free-text search term safe to embed in a PostgREST `.or()` filter string.
 * Commas, parentheses, quotes, colons and wildcard characters have special meaning there:
 * the old code interpolated the raw text, so typing "a,b" broke the query and a crafted
 * term could add extra filter clauses.
 */
export function sanitizeSearchTerm(raw, max = 60) {
  return String(raw ?? '')
    .replace(/[%*_,()"'\\:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * Supabase returns `timestamp without time zone` columns as "2026-10-04T10:00:00.123"
 * (no offset). The bot writes UTC, but parseISO() would read that as LOCAL time, so every
 * time on screen was off by the viewer's UTC offset (5 hours in Pakistan).
 * Strings that already carry an offset are left alone.
 */
export function parseDbTimestamp(value) {
  if (!value) return null;
  const s = String(value).trim();
  const hasOffset = /([zZ]|[+-]\d{2}(:?\d{2})?)$/.test(s);
  const d = parseISO(hasOffset ? s : `${s.replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** format() that never throws on null / invalid values. */
export function formatTimestamp(value, pattern = 'dd MMM yyyy HH:mm', fallback = '—') {
  const d = parseDbTimestamp(value);
  return d ? format(d, pattern) : fallback;
}

/** Same for DATE columns ("2026-12-20"): local date, no timezone shifting. */
export function formatDateOnly(value, pattern = 'dd MMM', fallback = '—') {
  if (!value) return fallback;
  const d = parseISO(String(value));
  return Number.isNaN(d.getTime()) ? fallback : format(d, pattern);
}

/**
 * PostgREST returns at most 1000 rows per request, silently. This pages through a query
 * (`buildQuery` must return a fresh query each call and must have a stable ORDER BY).
 */
export async function fetchAllRows(buildQuery, { pageSize = 1000, maxRows = 20000 } = {}) {
  const rows = [];
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) return { data: rows, error, truncated: false };
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null, truncated: false };
  }
  return { data: rows, error: null, truncated: true };
}

/** Digits only, 10-15 long (E.164 without "+"), or null. */
export function normalizePhoneDigits(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** Friendly explanation for the most common Supabase failure: not marked as admin (RLS). */
export function explainSupabaseError(message) {
  const m = String(message || '');
  if (/row-level security|permission denied|42501/i.test(m)) {
    return `${m} — your account is probably not marked as an admin yet (run supabase/make-admin.sql, then sign out and in).`;
  }
  return m;
}
