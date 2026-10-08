import { describe, it, expect } from 'vitest';
import {
  sanitizeSearchTerm, parseDbTimestamp, formatTimestamp, formatDateOnly,
  fetchAllRows, normalizePhoneDigits, explainSupabaseError,
} from '../src/lib/utils';
import { computeOverviewStats } from '../src/lib/overviewStats';

describe('sanitizeSearchTerm', () => {
  it('removes characters that can change a PostgREST filter', () => {
    expect(sanitizeSearchTerm('a,status.eq.closed')).toBe('a status.eq.closed');
    expect(sanitizeSearchTerm('x),(y')).toBe('x y');
    expect(sanitizeSearchTerm('50%_off*')).toBe('50 off');
    expect(sanitizeSearchTerm(`"quoted" 'single' \\ back`)).toBe('quoted single back');
  });
  it('trims, collapses spaces, caps the length and tolerates null', () => {
    expect(sanitizeSearchTerm('   ali    khan ')).toBe('ali khan');
    expect(sanitizeSearchTerm('x'.repeat(500))).toHaveLength(60);
    expect(sanitizeSearchTerm(null)).toBe('');
    expect(sanitizeSearchTerm(undefined)).toBe('');
  });
});

describe('timestamps (database columns are UTC but have no offset)', () => {
  it('reads offset-less values as UTC, not as local time', () => {
    expect(parseDbTimestamp('2026-10-04T10:30:00.123456').toISOString()).toBe('2026-10-04T10:30:00.123Z');
    expect(parseDbTimestamp('2026-10-04 10:30:00').toISOString()).toBe('2026-10-04T10:30:00.000Z');
  });
  it('leaves values that already have an offset alone', () => {
    expect(parseDbTimestamp('2026-10-04T10:30:00+05:00').toISOString()).toBe('2026-10-04T05:30:00.000Z');
    expect(parseDbTimestamp('2026-10-04T10:30:00Z').toISOString()).toBe('2026-10-04T10:30:00.000Z');
  });
  it('never throws on bad input', () => {
    expect(parseDbTimestamp(null)).toBeNull();
    expect(parseDbTimestamp('not a date')).toBeNull();
    expect(formatTimestamp(null)).toBe('—');
    expect(formatTimestamp('garbage', 'dd MMM', 'n/a')).toBe('n/a');
    expect(formatDateOnly('2026-12-20')).toBe('20 Dec');
    expect(formatDateOnly('')).toBe('—');
  });
  it('formats (TZ is UTC in tests)', () => {
    expect(formatTimestamp('2026-10-04T10:30:00')).toBe('04 Oct 2026 10:30');
  });
});

describe('fetchAllRows', () => {
  const makeQuery = (total) => () => ({
    range: async (from, to) => {
      const data = [];
      for (let i = from; i <= Math.min(to, total - 1); i++) data.push({ id: i });
      return { data, error: null };
    },
  });

  it('pages past the 1000-row PostgREST cap', async () => {
    const { data, truncated, error } = await fetchAllRows(makeQuery(2500));
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(truncated).toBe(false);
  });
  it('stops at maxRows and says so', async () => {
    const { data, truncated } = await fetchAllRows(makeQuery(5000), { pageSize: 1000, maxRows: 3000 });
    expect(data).toHaveLength(3000);
    expect(truncated).toBe(true);
  });
  it('returns rows fetched so far plus the error', async () => {
    let n = 0;
    const q = () => ({ range: async () => (++n === 1 ? { data: new Array(1000).fill({}), error: null } : { data: null, error: { message: 'boom' } }) });
    const res = await fetchAllRows(q);
    expect(res.data).toHaveLength(1000);
    expect(res.error.message).toBe('boom');
  });
});

describe('misc helpers', () => {
  it('normalizePhoneDigits', () => {
    expect(normalizePhoneDigits('+92 321-5555255')).toBe('923215555255');
    expect(normalizePhoneDigits('12345')).toBeNull();
    expect(normalizePhoneDigits('')).toBeNull();
    expect(normalizePhoneDigits('1'.repeat(16))).toBeNull();
  });
  it('explainSupabaseError points RLS failures to make-admin.sql', () => {
    expect(explainSupabaseError('new row violates row-level security policy for table "leads"')).toMatch(/make-admin\.sql/);
    expect(explainSupabaseError('permission denied for table leads')).toMatch(/make-admin\.sql/);
    expect(explainSupabaseError('network down')).toBe('network down');
  });
});

describe('computeOverviewStats', () => {
  const NOW = new Date('2026-10-04T12:00:00Z');
  const leads = [
    { created_at: '2026-10-03T08:00:00', status: 'new', destination: 'Murree' },
    { created_at: '2026-10-02T08:00:00', status: 'forwarded', destination: 'Murree' },
    { created_at: '2026-09-24T08:00:00', status: 'closed', destination: 'Lahore' }, // previous week
    { created_at: null, status: null, destination: null },                          // must not crash
  ];
  const stats = computeOverviewStats({
    leads,
    states: [{ flow_step: 'city', admin_override: 'escalated', is_vip: true }, { flow_step: null }],
    training: [{ is_violation: false, approved_admin1: true, approved_admin2: false }, { is_violation: true }],
    properties: [{ is_available: true }, { is_available: false }],
    now: NOW,
  });

  it('counts', () => {
    expect(stats.totalLeads).toBe(4);
    expect(stats.newLeads).toBe(1);
    expect(stats.activeChats).toBe(2);
    expect(stats.escalated).toBe(1);
    expect(stats.vipGuests).toBe(1);
    expect(stats.pendingTraining).toBe(1);
    expect(stats.availableProperties).toBe(1);
  });
  it('week trend, timeline, destinations, flow', () => {
    expect(stats.leadsThisWeek).toBe(2);
    expect(stats.weekTrend).toBe(100); // 2 this week vs 1 last week
    expect(stats.leadsTimeline).toHaveLength(14);
    expect(stats.leadsTimeline.reduce((s, d) => s + d.leads, 0)).toBe(3);
    expect(stats.destinationBar[0]).toEqual({ destination: 'Murree', count: 2 });
    expect(stats.flowCounts).toEqual({ city: 1, welcome: 1 });
  });
  it('works with no data at all', () => {
    const empty = computeOverviewStats({ now: NOW });
    expect(empty.totalLeads).toBe(0);
    expect(empty.weekTrend).toBe(0);
  });
});
