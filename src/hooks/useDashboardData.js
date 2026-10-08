import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { computeOverviewStats } from '../lib/overviewStats';
import { fetchAllRows, sanitizeSearchTerm } from '../lib/utils';

/**
 * Small helper shared by the list hooks: runs `load()` and ignores the result if a newer
 * request was started meanwhile (typing in a search box used to let a slow, older response
 * overwrite a newer one).
 */
function useLatest() {
  const counter = useRef(0);
  return () => {
    const id = ++counter.current;
    return () => id === counter.current;
  };
}

export function useLeads(filters = {}) {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useLatest();

  const fetchLeads = useCallback(async () => {
    const isCurrent = latest();
    setLoading(true);
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    const term = sanitizeSearchTerm(filters.search);
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,wa_number.ilike.%${term}%,destination.ilike.%${term}%`
      );
    }

    const { data, error: err, count } = await query.limit(200);
    if (!isCurrent()) return;
    setError(err?.message || null);
    setLeads(data || []);
    setTotal(count ?? (data || []).length);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, total, loading, error, refetch: fetchLeads };
}

export function useChatStates() {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useLatest();

  const fetchStates = useCallback(async () => {
    const isCurrent = latest();
    setLoading(true);
    const { data, error: err } = await supabase
      .from('chat_states')
      .select('*')
      .order('last_activity', { ascending: false })
      .limit(200);
    if (!isCurrent()) return;
    setError(err?.message || null);
    setStates(data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchStates();
  }, [fetchStates]);

  return { states, loading, error, refetch: fetchStates };
}

export const TRAINING_LIMIT = 500;

export function useTrainingData() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useLatest();

  const fetchTraining = useCallback(async () => {
    const isCurrent = latest();
    setLoading(true);
    const { data, error: err } = await supabase
      .from('training_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(TRAINING_LIMIT);
    if (!isCurrent()) return;
    setError(err?.message || null);
    setItems(data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTraining();
  }, [fetchTraining]);

  return { items, loading, error, refetch: fetchTraining };
}

export function useProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latest = useLatest();

  const fetchProperties = useCallback(async () => {
    const isCurrent = latest();
    setLoading(true);
    const { data, error: err } = await supabase
      .from('properties')
      .select('*')
      .order('name', { ascending: true });
    if (!isCurrent()) return;
    setError(err?.message || null);
    setProperties(data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return { properties, loading, error, refetch: fetchProperties };
}

export function useOverviewStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // Only the columns the overview needs, and every page of rows: PostgREST silently caps a
      // request at 1000 rows, so totals used to stop growing at 1000 leads / 1000 chats.
      const [leadsRes, statesRes, trainingRes, propsRes] = await Promise.all([
        fetchAllRows(() =>
          supabase.from('leads').select('id, created_at, status, destination').order('created_at').order('id')
        ),
        fetchAllRows(() =>
          supabase.from('chat_states').select('wa_number, flow_step, admin_override, is_vip').order('wa_number')
        ),
        fetchAllRows(() =>
          supabase
            .from('training_data')
            .select('id, is_violation, approved_admin1, approved_admin2')
            .order('id')
        ),
        fetchAllRows(() => supabase.from('properties').select('id, is_available').order('id')),
      ]);

      if (cancelled) return;

      const firstError = [leadsRes, statesRes, trainingRes, propsRes].find((r) => r.error)?.error;
      setError(firstError ? firstError.message : null);
      setTruncated([leadsRes, statesRes, trainingRes, propsRes].some((r) => r.truncated));

      setStats(
        computeOverviewStats({
          leads: leadsRes.data,
          states: statesRes.data,
          training: trainingRes.data,
          properties: propsRes.data,
        })
      );
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error, truncated };
}
