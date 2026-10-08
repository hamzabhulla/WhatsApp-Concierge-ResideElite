import { useState } from 'react';
import { formatTimestamp } from '../lib/utils';
import ErrorNotice from '../components/ErrorNotice';
import { RefreshCw, Plus, Pencil, Trash2, X, Search, AlertCircle } from 'lucide-react';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useChatStates } from '../hooks/useDashboardData';
import { supabase } from '../lib/supabase';

const FLOW_STEPS = ['welcome','city','select_destination','guest_count','recommend','collect_dates','lead_capture'];

const LabelField = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
    {children}
  </div>
);

const emptyStateForm = { wa_number: '', flow_step: 'welcome', flow_data: '{}', ai_active: true, admin_override: '', is_vip: false };

export default function Conversations() {
  const { states, loading, error, refetch } = useChatStates();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stateForm, setStateForm] = useState(emptyStateForm);
  const [jsonError, setJsonError] = useState('');

  // Every quick action reports a failure instead of silently doing nothing (e.g. when RLS denies the write)
  async function runUpdate(waNumber, fields) {
    const { error: err } = await supabase.from('chat_states').update(fields).eq('wa_number', waNumber);
    if (err) alert('Could not update this conversation: ' + err.message);
    refetch();
  }
  const toggleAi = (waNumber, current) =>
    runUpdate(waNumber, { ai_active: !current, admin_override: current ? 'paused' : null });
  const toggleVip = (waNumber, current) => runUpdate(waNumber, { is_vip: !current });
  const resolveEscalation = (waNumber) => runUpdate(waNumber, { ai_active: true, admin_override: null });
  function openCreate() { setEditingId(null); setStateForm(emptyStateForm); setJsonError(''); setShowModal(true); }
  function openEdit(s) {
    setEditingId(s.wa_number);
    setStateForm({ wa_number: s.wa_number, flow_step: s.flow_step || 'welcome', flow_data: s.flow_data ? JSON.stringify(s.flow_data, null, 2) : '{}', ai_active: s.ai_active ?? true, admin_override: s.admin_override || '', is_vip: s.is_vip ?? false });
    setJsonError(''); setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    let parsedData;
    try { parsedData = JSON.parse(stateForm.flow_data); } catch { setJsonError('Invalid JSON'); return; }
    const payload = { wa_number: stateForm.wa_number.trim(), flow_step: stateForm.flow_step, flow_data: parsedData, ai_active: stateForm.ai_active, admin_override: stateForm.admin_override || null, is_vip: stateForm.is_vip };
    try {
      if (editingId) { const { error: err } = await supabase.from('chat_states').update(payload).eq('wa_number', editingId); if (err) throw err; }
      else { const { error: err } = await supabase.from('chat_states').insert(payload); if (err) throw err; }
      setShowModal(false); refetch();
    } catch (err) { alert('Error: ' + err.message); }
  }

  async function handleDelete(waNumber) {
    if (!confirm('Delete this chat state?')) return;
    try { const { error: err } = await supabase.from('chat_states').delete().eq('wa_number', waNumber); if (err) throw err; refetch(); }
    catch (err) { alert('Error: ' + err.message); }
  }

  const filtered = (states || []).filter(s => !searchQuery || s.wa_number?.includes(searchQuery) || s.flow_step?.includes(searchQuery) || s.admin_override?.includes(searchQuery));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Conversations</h2>
          <p className="mt-1 text-sm text-muted">Live guest chat states & flow progress</p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={refetch} className="btn-outline flex items-center gap-2"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" />Add Chat State</button>
        </div>
      </div>

      <ErrorNotice message={error} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input className="input pl-9" placeholder="Search number, step, override…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">No conversations found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line bg-surface2">
                <tr>
                  <th className="table-th">Number</th>
                  <th className="table-th">Flow Step</th>
                  <th className="table-th">AI Status</th>
                  <th className="table-th">Flags</th>
                  <th className="table-th">Override</th>
                  <th className="table-th">Last Active</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((s) => (
                  <tr key={s.wa_number} className="hover:bg-surface2 transition-colors">
                    <td className="table-td font-medium text-ink">{s.wa_number}</td>
                    <td className="table-td"><Badge variant={s.flow_step || 'welcome'} label={s.flow_step} /></td>
                    <td className="table-td">
                      <button onClick={() => toggleAi(s.wa_number, s.ai_active)}
                        className={`chip cursor-pointer ${s.ai_active ? 'bg-success/10 text-success ring-success/25 hover:bg-success/20' : 'bg-muted/10 text-muted ring-muted/25 hover:bg-muted/20'}`}>
                        {s.ai_active ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1.5">
                        {s.is_vip && <Badge variant="vip" label="VIP" />}
                        {s.admin_override === 'escalated' && (
                          <button onClick={() => resolveEscalation(s.wa_number)} title="Click to resolve" className="chip bg-danger/10 text-danger ring-danger/25 cursor-pointer hover:bg-danger/20">
                            <AlertCircle className="h-3 w-3 mr-1" />Escalated
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="table-td text-xs text-muted">{s.admin_override || '—'}</td>
                    <td className="table-td text-xs text-muted">{formatTimestamp(s.last_activity, 'dd MMM HH:mm')}</td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleVip(s.wa_number, s.is_vip)}
                          className={`rounded-lg px-2 py-1 text-xs font-medium transition ${s.is_vip ? 'bg-accent/10 text-accent hover:bg-accent/20' : 'border border-line text-muted hover:text-ink'}`}>
                          {s.is_vip ? '★ VIP' : '☆ VIP'}
                        </button>
                        <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink transition"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(s.wa_number)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm">
          <div className="my-8 card w-full max-w-lg p-6 shadow-lift">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="font-display text-xl font-semibold text-ink">{editingId ? 'Edit Chat State' : 'New Chat State'}</h3>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink transition"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <LabelField label="WhatsApp Number *">
                <input type="text" className="input" placeholder="923215555255" value={stateForm.wa_number}
                  onChange={e => setStateForm({...stateForm, wa_number: e.target.value})} required disabled={!!editingId} />
              </LabelField>
              <LabelField label="Flow Step">
                <select className="input" value={stateForm.flow_step} onChange={e => setStateForm({...stateForm, flow_step: e.target.value})}>
                  {[...new Set([...FLOW_STEPS, stateForm.flow_step])].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </LabelField>
              <LabelField label="Flow Data (JSON)">
                <textarea className={`input font-mono text-xs h-28 resize-none ${jsonError ? 'border-danger' : ''}`}
                  value={stateForm.flow_data} onChange={e => { setStateForm({...stateForm, flow_data: e.target.value}); setJsonError(''); }} />
                {jsonError && <p className="text-xs text-danger mt-1">{jsonError}</p>}
              </LabelField>
              <LabelField label="Admin Override">
                <input type="text" className="input" placeholder="e.g. paused, escalated" value={stateForm.admin_override}
                  onChange={e => setStateForm({...stateForm, admin_override: e.target.value})} />
              </LabelField>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-brand h-4 w-4" checked={stateForm.ai_active} onChange={e => setStateForm({...stateForm, ai_active: e.target.checked})} />
                  <span className="text-sm text-ink">AI Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-brand h-4 w-4" checked={stateForm.is_vip} onChange={e => setStateForm({...stateForm, is_vip: e.target.checked})} />
                  <span className="text-sm text-ink">VIP Guest</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
