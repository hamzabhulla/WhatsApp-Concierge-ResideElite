import { vi } from 'vitest';

/**
 * In-memory stand-in for the supabase-js client (only what the dashboard uses).
 * Every write is recorded in `calls`, and `failNext()` makes the next write return an error.
 */
export function createFakeSupabase() {
  const tables = {
    leads: [], chat_states: [], properties: [], training_data: [],
    bot_settings: [], whatsapp_connection: [], qa_cache: [],
  };
  const calls = []; // { table, op, payload, filters, or }
  const failures = [];
  const selectFailures = {};

  function from(table) {
    const q = { table, op: 'select', payload: null, filters: [], or: null, order: null, limit: null, range: null, single: false };
    const b = {
      select() { return b; },
      insert(p) { q.op = 'insert'; q.payload = p; return b; },
      update(p) { q.op = 'update'; q.payload = p; return b; },
      delete() { q.op = 'delete'; return b; },
      eq(c, v) { q.filters.push([c, v]); return b; },
      neq(c, v) { q.filters.push([c, v, 'neq']); return b; },
      or(expr) { q.or = expr; return b; },
      order() { return b; },
      limit(n) { q.limit = n; return b; },
      range(a, z) { q.range = [a, z]; return b; },
      maybeSingle() { q.single = true; return b; },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
    };
    function run() {
      const rows = tables[table] || [];
      if (q.op !== 'select') {
        calls.push({ table, op: q.op, payload: q.payload, filters: q.filters });
        const f = failures.shift();
        if (f) return { data: null, error: f };
        return { data: null, error: null };
      }
      calls.push({ table, op: 'select', filters: q.filters, or: q.or });
      if (selectFailures[table]) return { data: null, error: selectFailures[table], count: null };
      let out = rows;
      for (const [c, v, kind] of q.filters) out = out.filter((r) => (kind === 'neq' ? r[c] !== v : r[c] === v));
      const count = out.length;
      if (q.range) out = out.slice(q.range[0], q.range[1] + 1);
      else if (q.limit) out = out.slice(0, q.limit);
      if (q.single) return { data: out[0] || null, error: null };
      return { data: out, error: null, count };
    }
    return b;
  }

  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
    getUser: vi.fn(async () => ({ data: { user: { email: 'admin@example.com' } } })),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    refreshSession: vi.fn(async () => ({ data: { session: null } })),
    signOut: vi.fn(async () => ({})),
  };

  return {
    client: { from, auth },
    tables,
    calls,
    writes: () => calls.filter((c) => c.op !== 'select'),
    failNext: (error) => failures.push(error),
    failSelect: (table, error) => { selectFailures[table] = error; },
    clearSelectFailures: () => { for (const k of Object.keys(selectFailures)) delete selectFailures[k]; },
  };
}
