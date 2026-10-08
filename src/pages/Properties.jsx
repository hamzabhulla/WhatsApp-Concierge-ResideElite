import { useState } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, X } from 'lucide-react';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useProperties } from '../hooks/useDashboardData';
import { supabase } from '../lib/supabase';
import ErrorNotice from '../components/ErrorNotice';

const emptyForm = { slug: '', name: '', city: '', location: '', catalogue_link: '', price_from: '', price_to: '', max_guests: '', min_guests: '1', is_available: true, is_budget: false };

// Declared at module level: when it lived inside the component every keystroke re-created it,
// remounting the input (focus was lost after each character).
const F = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
    {children}
  </div>
);

export default function Properties() {
  const { properties, loading, error, refetch } = useProperties();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  function openCreate() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(p) {
    setEditing(p.id);
    setForm({ slug: p.slug||'', name: p.name||'', city: p.city||'', location: p.location||'', catalogue_link: p.catalogue_link||'', price_from: p.price_from??'', price_to: p.price_to??'', max_guests: p.max_guests??'', min_guests: p.min_guests??'1', is_available: p.is_available??true, is_budget: p.is_budget??false });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-');
    const minG = Number(form.min_guests) || 1;
    const maxG = Number(form.max_guests) || null;
    if (!slug || !form.name.trim()) { alert('Slug and name are required.'); return; }
    if (maxG && maxG < minG) { alert('Max guests cannot be lower than min guests.'); return; }
    const payload = { slug, name: form.name.trim(), city: form.city.trim(), location: form.location.trim(), catalogue_link: form.catalogue_link.trim(), price_from: Number(form.price_from)||null, price_to: Number(form.price_to)||null, max_guests: Number(form.max_guests)||null, min_guests: Number(form.min_guests)||1, is_available: form.is_available, is_budget: form.is_budget, updated_at: new Date().toISOString() };
    // Errors used to be ignored: a duplicate slug or a permission problem closed the form as if it had saved.
    const { error: err } = editing
      ? await supabase.from('properties').update(payload).eq('id', editing)
      : await supabase.from('properties').insert(payload);
    if (err) {
      alert(err.code === '23505' ? 'A property with this slug already exists. Use a different slug.' : 'Could not save property: ' + err.message);
      return;
    }
    setShowForm(false); refetch();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this property?')) return;
    const { error: err } = await supabase.from('properties').delete().eq('id', id);
    if (err) alert('Could not delete property: ' + err.message);
    refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Properties</h2>
          <p className="mt-1 text-sm text-muted">Manage catalogue listings synced with the bot</p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={refetch} className="btn-outline flex items-center gap-2"><RefreshCw className="h-4 w-4" />Refresh</button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" />Add Property</button>
        </div>
      </div>

      <ErrorNotice message={error} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm">
          <div className="my-8 card w-full max-w-2xl p-6 shadow-lift">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="font-display text-xl font-semibold text-ink">{editing ? 'Edit Property' : 'New Property'}</h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink transition"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="Slug *"><input className="input" placeholder="e.g. royal-villa-murree" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} required /></F>
                <F label="Name *"><input className="input" placeholder="Property display name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></F>
                <F label="City"><input className="input" placeholder="e.g. Murree" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></F>
                <F label="Location"><input className="input" placeholder="Specific area / address" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></F>
                <F label="Catalogue Link" ><input className="input sm:col-span-2" placeholder="Google Drive / Canva link" value={form.catalogue_link} onChange={e => setForm({...form, catalogue_link: e.target.value})} /></F>
                <F label="Price From (PKR)"><input className="input" type="number" placeholder="35000" value={form.price_from} onChange={e => setForm({...form, price_from: e.target.value})} /></F>
                <F label="Price To (PKR)"><input className="input" type="number" placeholder="50000" value={form.price_to} onChange={e => setForm({...form, price_to: e.target.value})} /></F>
                <F label="Min Guests"><input className="input" type="number" placeholder="1" value={form.min_guests} onChange={e => setForm({...form, min_guests: e.target.value})} /></F>
                <F label="Max Guests"><input className="input" type="number" placeholder="10" value={form.max_guests} onChange={e => setForm({...form, max_guests: e.target.value})} /></F>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-brand h-4 w-4" checked={form.is_available} onChange={e => setForm({...form, is_available: e.target.checked})} />
                  <span className="text-sm text-ink">Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-brand h-4 w-4" checked={form.is_budget} onChange={e => setForm({...form, is_budget: e.target.checked})} />
                  <span className="text-sm text-ink">Budget Listing</span>
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-line pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Save Changes' : 'Add Property'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><LoadingSpinner /></div>
        ) : properties.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">No properties yet. Add one to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line bg-surface2">
                <tr>
                  <th className="table-th">Property</th>
                  <th className="table-th">Location</th>
                  <th className="table-th">Guests</th>
                  <th className="table-th">Price</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {properties.map((p) => (
                  <tr key={p.id} className="hover:bg-surface2 transition-colors">
                    <td className="table-td">
                      <div className="font-medium text-ink">{p.name}</div>
                      <div className="text-xs text-muted">{p.slug}</div>
                    </td>
                    <td className="table-td">
                      <span className="font-medium text-ink">{p.city}</span>
                      {p.location && <span className="text-muted"> — {p.location}</span>}
                    </td>
                    <td className="table-td">{p.min_guests}–{p.max_guests}</td>
                    <td className="table-td text-sm">
                      PKR {p.price_from?.toLocaleString('en-PK')}
                      {p.price_to ? `–${p.price_to?.toLocaleString('en-PK')}` : ''}
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1.5 flex-wrap">
                        <Badge variant={p.is_available ? 'available' : 'paused'} label={p.is_available ? 'available' : 'unavailable'} />
                        {p.is_budget && <Badge variant="budget" label="budget" />}
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink transition"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(p.id)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
