import { useState } from 'react';
import { formatDateOnly, formatTimestamp } from '../lib/utils';
import ErrorNotice from '../components/ErrorNotice';
import { Search, RefreshCw, Plus, Pencil, Trash2, X } from 'lucide-react';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLeads } from '../hooks/useDashboardData';
import { supabase } from '../lib/supabase';

const STATUSES = ['all', 'new', 'forwarded', 'closed'];

const LabelField = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
    {children}
  </div>
);

const emptyLeadForm = {
  wa_number: '', name: '', contact: '', destination: '',
  checkin_date: '', checkout_date: '', guests_count: '',
  property_interest: '', status: 'new', language: 'en', visit_count: 1,
};

export default function Leads() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { leads, total, loading, error, refetch } = useLeads({ status, search });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [leadForm, setLeadForm] = useState(emptyLeadForm);

  async function updateStatus(id, newStatus) {
    const { error: err } = await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    if (err) alert('Could not update status: ' + err.message);
    refetch();
  }

  function openCreate() { setEditingId(null); setLeadForm(emptyLeadForm); setShowModal(true); }
  function openEdit(lead) {
    setEditingId(lead.id);
    setLeadForm({
      wa_number: lead.wa_number || '', name: lead.name || '', contact: lead.contact || '',
      destination: lead.destination || '', checkin_date: lead.checkin_date || '',
      checkout_date: lead.checkout_date || '', guests_count: lead.guests_count ?? '',
      property_interest: lead.property_interest || '', status: lead.status || 'new',
      language: lead.language || 'en', visit_count: lead.visit_count ?? 1,
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!leadForm.wa_number.trim()) return;
    const payload = {
      wa_number: leadForm.wa_number.trim(), name: leadForm.name.trim() || null,
      contact: leadForm.contact.trim() || null, destination: leadForm.destination.trim() || null,
      checkin_date: leadForm.checkin_date || null, checkout_date: leadForm.checkout_date || null,
      guests_count: leadForm.guests_count !== '' ? Number(leadForm.guests_count) : null,
      property_interest: leadForm.property_interest.trim() || null,
      status: leadForm.status, language: leadForm.language.trim() || 'en',
      visit_count: Number(leadForm.visit_count) || 1,
    };
    if (payload.checkin_date && payload.checkout_date && payload.checkout_date <= payload.checkin_date) {
      alert('Check-out must be after check-in.');
      return;
    }
    try {
      if (editingId) {
        const { error: err } = await supabase.from('leads').update(payload).eq('id', editingId);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('leads').insert(payload);
        if (err) throw err;
      }
      setShowModal(false); refetch();
    } catch (err) { alert('Error saving lead: ' + err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    try {
      const { error: err } = await supabase.from('leads').delete().eq('id', id);
      if (err) throw err;
      refetch();
    } catch (err) { alert('Error deleting lead: ' + err.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Leads</h2>
          <p className="mt-1 text-sm text-muted">
            {total > leads.length
              ? `Showing the latest ${leads.length} of ${total} enquiries`
              : `${total} enquiries captured`}
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={refetch} className="btn-outline flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
          className="relative flex-1"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search name, number, destination…"
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </form>
        <div className="flex gap-1.5">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
                status === s
                  ? 'bg-brand text-brand-on'
                  : 'border border-line bg-surface text-muted hover:text-ink'
              }`}
            >{s}</button>
          ))}
        </div>
      </div>

      <ErrorNotice message={error} />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><LoadingSpinner /></div>
        ) : leads.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">No leads found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line bg-surface2">
                <tr>
                  <th className="table-th">Guest</th>
                  <th className="table-th">Destination</th>
                  <th className="table-th">Dates</th>
                  <th className="table-th">Guests</th>
                  <th className="table-th">Property</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Created</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-surface2 transition-colors">
                    <td className="table-td">
                      <div className="font-medium text-ink">{lead.name || '—'}</div>
                      <div className="text-xs text-muted">{lead.wa_number}</div>
                      {lead.contact && <div className="text-[10px] text-muted">Contact: {lead.contact}</div>}
                    </td>
                    <td className="table-td">
                      {lead.destination || '—'}
                      {lead.language && lead.language !== 'en' && (
                        <span className="ml-1 text-xs text-muted">({lead.language})</span>
                      )}
                    </td>
                    <td className="table-td text-xs text-muted">
                      {formatDateOnly(lead.checkin_date)}
                      {lead.checkout_date ? ` → ${formatDateOnly(lead.checkout_date)}` : ''}
                    </td>
                    <td className="table-td text-center">{lead.guests_count ?? '—'}</td>
                    <td className="table-td">{lead.property_interest || '—'}</td>
                    <td className="table-td"><Badge variant={lead.status || 'new'} /></td>
                    <td className="table-td text-xs text-muted">
                      {formatTimestamp(lead.created_at, 'dd MMM yyyy')}
                    </td>
                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <select
                          className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink"
                          value={lead.status || 'new'}
                          onChange={(e) => updateStatus(lead.id, e.target.value)}
                        >
                          <option value="new">new</option>
                          <option value="forwarded">forwarded</option>
                          <option value="closed">closed</option>
                        </select>
                        <button onClick={() => openEdit(lead)}
                          className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink transition" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(lead.id)}
                          className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
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
          <div className="my-8 card w-full max-w-2xl p-6 shadow-lift">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="font-display text-xl font-semibold text-ink flex items-center gap-2">
                {editingId ? <Pencil className="h-4 w-4 text-brand" /> : <Plus className="h-4 w-4 text-brand" />}
                {editingId ? 'Edit Lead' : 'New Lead'}
              </h3>
              <button onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <LabelField label="WhatsApp Number *">
                  <input type="text" className="input" placeholder="923215555255"
                    value={leadForm.wa_number} onChange={e => setLeadForm({...leadForm, wa_number: e.target.value})} required />
                </LabelField>
                <LabelField label="Name">
                  <input type="text" className="input" placeholder="Guest full name"
                    value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} />
                </LabelField>
                <LabelField label="Contact">
                  <input type="text" className="input" placeholder="Alternative phone or email"
                    value={leadForm.contact} onChange={e => setLeadForm({...leadForm, contact: e.target.value})} />
                </LabelField>
                <LabelField label="Destination">
                  <input type="text" className="input" placeholder="e.g. Murree, Islamabad"
                    value={leadForm.destination} onChange={e => setLeadForm({...leadForm, destination: e.target.value})} />
                </LabelField>
                <LabelField label="Check-in">
                  <input type="date" className="input" value={leadForm.checkin_date}
                    onChange={e => setLeadForm({...leadForm, checkin_date: e.target.value})} />
                </LabelField>
                <LabelField label="Check-out">
                  <input type="date" className="input" value={leadForm.checkout_date}
                    onChange={e => setLeadForm({...leadForm, checkout_date: e.target.value})} />
                </LabelField>
                <LabelField label="Guests">
                  <input type="number" className="input" placeholder="Number of guests"
                    value={leadForm.guests_count} onChange={e => setLeadForm({...leadForm, guests_count: e.target.value})} />
                </LabelField>
                <LabelField label="Property Interest">
                  <input type="text" className="input" placeholder="e.g. Royal Villa"
                    value={leadForm.property_interest} onChange={e => setLeadForm({...leadForm, property_interest: e.target.value})} />
                </LabelField>
                <LabelField label="Status">
                  <select className="input" value={leadForm.status} onChange={e => setLeadForm({...leadForm, status: e.target.value})}>
                    <option value="new">new</option>
                    <option value="forwarded">forwarded</option>
                    <option value="closed">closed</option>
                  </select>
                </LabelField>
                <LabelField label="Language">
                  <input type="text" className="input" placeholder="en, ur, roman_urdu"
                    value={leadForm.language} onChange={e => setLeadForm({...leadForm, language: e.target.value})} />
                </LabelField>
                <LabelField label="Visit Count">
                  <input type="number" className="input" placeholder="1"
                    value={leadForm.visit_count} onChange={e => setLeadForm({...leadForm, visit_count: e.target.value})} />
                </LabelField>
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">{editingId ? 'Save Changes' : 'Create Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
