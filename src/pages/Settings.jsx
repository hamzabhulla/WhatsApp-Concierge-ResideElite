import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, RefreshCw, Key, ShieldCheck, ShieldAlert, Eye, EyeOff, Phone, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { verifyCurrentUserPassword } from '../lib/auth';
import { explainSupabaseError, normalizePhoneDigits } from '../lib/utils';

function SectionHeader({ icon: Icon, iconClass, title, description }) {
  return (
    <div className="flex items-center gap-3 border-b border-line pb-4 mb-5">
      <div className={`rounded-xl p-2.5 ${iconClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function SecretInput({ value, onChange, placeholder, show, onToggle }) {
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} className="input pr-10" placeholder={placeholder} value={value} onChange={onChange} />
      <button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-ink transition">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const LabelField = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
    {children}
  </div>
);

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState({ gemini_api_key: '', gemini_api_key_2: '', gemini_api_key_3: '', groq_api_key: '', active_provider: 'gemini', brand_forward_number: '', api_errors: {}, hybrid_config: 'all' });
  const [show, setShow] = useState({ g1: false, g2: false, g3: false, groq: false });
  const [securityPassword, setSecurityPassword] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    setLoading(true); setError(null);
    try {
      const { data, error: err } = await supabase.from('bot_settings').select('*').eq('id', 1).maybeSingle();
      if (err) throw err;
      if (data) {
        setSettings({ gemini_api_key: data.gemini_api_key||'', gemini_api_key_2: data.gemini_api_key_2||'', gemini_api_key_3: data.gemini_api_key_3||'', groq_api_key: data.groq_api_key||'', active_provider: data.active_provider||'gemini', brand_forward_number: data.brand_forward_number||'', api_errors: data.api_errors||{}, hybrid_config: data.hybrid_config||'all' });
      } else {
        const init = { id: 1, gemini_api_key: '', gemini_api_key_2: '', gemini_api_key_3: '', groq_api_key: '', active_provider: 'gemini', brand_forward_number: '' };
        await supabase.from('bot_settings').insert(init);
        setSettings(init);
      }
    } catch (err) { setError('Failed to load settings: ' + explainSupabaseError(err.message || 'unknown error')); }
    finally { setLoading(false); }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(false);
    try {
      // Verified by Supabase with your real login password (the old check compared against a
      // password written in this source file, which ships to every visitor's browser).
      if (!(await verifyCurrentUserPassword(securityPassword))) { setError('Incorrect password. Access denied.'); return; }

      const forward = settings.brand_forward_number.trim();
      const forwardDigits = forward ? normalizePhoneDigits(forward) : null;
      if (forward && !forwardDigits) {
        setError('Brand forward number must be 10-15 digits including the country code, e.g. 923215555255.');
        return;
      }
      const clean = (v) => (v || '').trim() || null; // pasted keys often carry spaces / newlines
      const payload = { gemini_api_key: clean(settings.gemini_api_key), gemini_api_key_2: clean(settings.gemini_api_key_2), gemini_api_key_3: clean(settings.gemini_api_key_3), groq_api_key: clean(settings.groq_api_key), active_provider: settings.active_provider, brand_forward_number: forwardDigits, hybrid_config: settings.hybrid_config, updated_at: new Date().toISOString() };
      const { error: err } = await supabase.from('bot_settings').update(payload).eq('id', 1);
      if (err) throw err;
      setSuccess(true); setSecurityPassword('');
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) { setError(err.message || 'Failed to save.'); }
    finally { setSaving(false); }
  }

  const apiCards = [
    { id: 'gemini_1', name: 'Gemini Key 1', label: 'Primary 33%', key: settings.gemini_api_key },
    { id: 'gemini_2', name: 'Gemini Key 2', label: 'Primary 33%', key: settings.gemini_api_key_2 },
    { id: 'groq',     name: 'Groq API Key', label: 'Primary 33%', key: settings.groq_api_key },
    { id: 'gemini_3', name: 'Gemini Key 3', label: 'Fallback',    key: settings.gemini_api_key_3 },
  ];

  if (loading) return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">System Settings</h2>
          <p className="mt-1 text-sm text-muted">Configure chatbot integrations, model providers, and lead forwarding.</p>
        </div>
        <button onClick={fetchSettings} className="btn-outline flex items-center gap-2 self-start sm:self-center">
          <RefreshCw className="h-4 w-4" />Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-danger/20 bg-danger/8 px-4 py-3 text-sm text-danger">{error}</div>}
      {success && (
        <div className="rounded-lg border border-success/20 bg-success/8 px-4 py-3 text-sm text-success flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />Settings saved and synced to the chatbot.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Lead Forwarding */}
        <div className="card p-6">
          <SectionHeader icon={Phone} iconClass="bg-brand/10 text-brand" title="Lead Forwarding" description="Where lead notifications are sent on WhatsApp" />
          <LabelField label="Brand Forward Number">
            <input type="text" className="input max-w-sm" placeholder="923215555255" value={settings.brand_forward_number} onChange={e => setSettings({...settings, brand_forward_number: e.target.value})} />
            <p className="mt-1.5 text-xs text-muted">E.164 format without '+'. New lead summaries will be forwarded here automatically.</p>
          </LabelField>
        </div>

        {/* API Health Monitor */}
        <div className="card p-6">
          <SectionHeader icon={Activity} iconClass="bg-success/10 text-success" title="API Health & Error Monitor" description="Real-time status for active and fallback LLM endpoints" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {apiCards.map(api => {
              const errInfo = settings.api_errors?.[api.id];
              const status = !api.key ? 'unconfigured' : errInfo ? 'failed' : 'healthy';
              return (
                <div key={api.id} className={`rounded-xl border p-4 ${status === 'healthy' ? 'border-success/20 bg-success/5' : status === 'failed' ? 'border-danger/20 bg-danger/5' : 'border-line bg-surface2'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-ink">{api.name}</span>
                    <span className={`chip text-[10px] ${status === 'healthy' ? 'bg-success/10 text-success ring-success/20' : status === 'failed' ? 'bg-danger/10 text-danger ring-danger/20' : 'bg-muted/10 text-muted ring-muted/20'}`}>
                      {status === 'healthy' ? 'Healthy' : status === 'failed' ? 'Failed' : 'N/A'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted mb-2">{api.label}</p>
                  {status === 'healthy' && <p className="flex items-center gap-1 text-[11px] text-success"><CheckCircle className="h-3.5 w-3.5" />All systems operational</p>}
                  {status === 'failed' && errInfo && (
                    <div className="rounded-lg border border-danger/20 bg-danger/8 p-2 text-[10px] text-danger">
                      <p className="flex items-center gap-1 font-semibold mb-1"><AlertTriangle className="h-3 w-3" />Error logged:</p>
                      <p className="font-mono break-all">{errInfo.error}</p>
                      {errInfo.timestamp && <p className="text-muted mt-1">{new Date(errInfo.timestamp).toLocaleString()}</p>}
                    </div>
                  )}
                  {status === 'unconfigured' && <p className="text-[11px] text-muted italic">Key not provided</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Provider Keys */}
        <div className="card p-6">
          <SectionHeader icon={Key} iconClass="bg-accent/10 text-accent" title="AI Provider Keys" description="Configure LLM integrations and active model" />
          <div className="space-y-5">
            <LabelField label="Active AI Provider">
              <select className="input max-w-sm" value={settings.active_provider} onChange={e => setSettings({...settings, active_provider: e.target.value})}>
                <option value="gemini">Google Gemini</option>
                <option value="groq">Groq Cloud</option>
                <option value="hybrid">Hybrid 3-Way Split (33% each)</option>
              </select>
            </LabelField>

            {settings.active_provider === 'hybrid' && (
              <div className="rounded-xl border border-brand/15 bg-brand-soft p-4">
                <LabelField label="Load Balancing Split Mode">
                  <select className="input max-w-sm" value={settings.hybrid_config} onChange={e => setSettings({...settings, hybrid_config: e.target.value})}>
                    <option value="all">3-Way: 33% Groq / 33% Gemini 1 / 33% Gemini 2</option>
                    <option value="gemini_1_2">2-Way: 50% Gemini 1 / 50% Gemini 2</option>
                    <option value="gemini_1_groq">2-Way: 50% Gemini 1 / 50% Groq</option>
                    <option value="gemini_2_groq">2-Way: 50% Gemini 2 / 50% Groq</option>
                  </select>
                </LabelField>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <LabelField label="Google Gemini API Key 1">
                <SecretInput value={settings.gemini_api_key} onChange={e => setSettings({...settings, gemini_api_key: e.target.value})} placeholder="Gemini API Key 1" show={show.g1} onToggle={() => setShow(s => ({...s, g1: !s.g1}))} />
              </LabelField>
              <LabelField label="Google Gemini API Key 2 (A/B Routing)">
                <SecretInput value={settings.gemini_api_key_2||''} onChange={e => setSettings({...settings, gemini_api_key_2: e.target.value})} placeholder="Gemini API Key 2 (optional)" show={show.g2} onToggle={() => setShow(s => ({...s, g2: !s.g2}))} />
              </LabelField>
              <LabelField label="Google Gemini API Key 3 (A/B Routing)">
                <SecretInput value={settings.gemini_api_key_3||''} onChange={e => setSettings({...settings, gemini_api_key_3: e.target.value})} placeholder="Gemini API Key 3 (optional)" show={show.g3} onToggle={() => setShow(s => ({...s, g3: !s.g3}))} />
              </LabelField>
              <LabelField label="Groq API Key">
                <SecretInput value={settings.groq_api_key} onChange={e => setSettings({...settings, groq_api_key: e.target.value})} placeholder="Groq API Key" show={show.groq} onToggle={() => setShow(s => ({...s, groq: !s.groq}))} />
              </LabelField>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card p-6">
          <SectionHeader icon={ShieldAlert} iconClass="bg-danger/10 text-danger" title="Security Verification" description="Re-enter your login password to apply system configuration updates" />
          <LabelField label="Confirm with your login password">
            <input type="password" className="input border-danger/20 focus:border-danger max-w-sm" placeholder="Your login password" value={securityPassword} onChange={e => setSecurityPassword(e.target.value)} required />
          </LabelField>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-6 py-2.5">
            <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
