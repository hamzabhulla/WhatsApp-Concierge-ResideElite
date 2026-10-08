import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Wifi, WifiOff, RefreshCw, QrCode, Phone, CheckCircle2, AlertTriangle, Loader2, Lock } from 'lucide-react';
import QrImage from './QrCode';
import ErrorNotice from './ErrorNotice';
import { normalizePhoneDigits } from '../lib/utils';

const statusColor = {
  CONNECTED:      { ring: 'bg-success', ping: 'bg-success',  icon: 'text-success',  bg: 'bg-success/10' },
  QR_READY:       { ring: 'bg-warning', ping: 'bg-warning',  icon: 'text-warning',  bg: 'bg-warning/10' },
  INITIALIZING:   { ring: 'bg-info',    ping: 'bg-info',     icon: 'text-info',     bg: 'bg-info/10' },
  AUTHENTICATING: { ring: 'bg-info',    ping: 'bg-info',     icon: 'text-info',     bg: 'bg-info/10' },
  DISCONNECTED:   { ring: 'bg-muted',   ping: 'bg-muted',    icon: 'text-muted',    bg: 'bg-surface2' },
};

export default function WhatsAppConnect() {
  const [conn, setConn] = useState({ status: 'DISCONNECTED', qr_code: null, pairing_code: null, pairing_phone: null, command: null });
  const [phoneInput, setPhoneInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authMethod, setAuthMethod] = useState('qr');
  const [loadError, setLoadError] = useState('');

  const fetchStatus = useCallback(async () => {
    if (typeof document !== 'undefined' && document.hidden) return; // don't poll from a background tab
    try {
      const { data, error } = await supabase.from('whatsapp_connection').select('*').eq('id', 1).maybeSingle();
      if (error) { setLoadError(error.message); return; }
      setLoadError('');
      if (data) setConn(data);
    } catch (err) { console.error(err); setLoadError(err.message || 'Could not load the connection status.'); }
  }, []);

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, 3000);
    return () => clearInterval(iv);
  }, [fetchStatus]);

  async function cmd(fields) {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('whatsapp_connection').update(fields).eq('id', 1);
      if (error) throw error;
      await fetchStatus();
    }
    catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  }

  async function handleConnect() { await cmd({ command: 'CONNECT', qr_code: null, pairing_code: null, pairing_phone: null }); }
  async function handleDisconnect() {
    if (!confirm('Disconnect WhatsApp? The bot will stop replying until reconnected.')) return;
    await cmd({ command: 'DISCONNECT' });
  }
  async function handleDeletePairing() {
    if (!confirm('Delete previous pairing? This will wipe all session files and log out the bot.')) return;
    await cmd({ command: 'WIPE_SESSION' });
  }
  async function handleRequestPairingCode(e) {
    e.preventDefault();
    const cleanNumber = normalizePhoneDigits(phoneInput);
    if (!cleanNumber) { alert('Enter the full number with country code, digits only (10-15 digits), e.g. 923215555255'); return; }
    if (conn.status === 'DISCONNECTED') {
      await cmd({ command: 'CONNECT', pairing_phone: cleanNumber, qr_code: null, pairing_code: null });
    } else {
      await cmd({ command: 'PAIR', pairing_phone: cleanNumber, pairing_code: null });
    }
  }

  const wiping = conn.command === 'WIPE_SESSION';
  const sc = statusColor[conn.status] || statusColor.DISCONNECTED;

  return (
    <div className="card p-6">
      {loadError && <div className="mb-4"><ErrorNotice message={loadError} /></div>}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Status panel */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${sc.bg}`}>
              {conn.status === 'CONNECTED'
                ? <Wifi className={`h-5 w-5 ${sc.icon}`} />
                : <WifiOff className={`h-5 w-5 ${sc.icon}`} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-ink">WhatsApp Connection Status</h3>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${wiping ? 'bg-danger' : sc.ping}`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${wiping ? 'bg-danger' : sc.ring}`} />
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Current State: <strong className="text-ink">{wiping ? 'WIPING SESSION' : conn.status}</strong>
              </p>
            </div>
          </div>

          <div className="text-sm text-muted">
            {wiping && <p className="flex items-center gap-2 text-danger"><Loader2 className="h-4 w-4 animate-spin" />Wiping session and deleting credentials…</p>}
            {!wiping && conn.status === 'CONNECTED' && <p className="flex items-center gap-2 text-success"><CheckCircle2 className="h-4 w-4" />Bot is authenticated and actively responding to enquiries.</p>}
            {!wiping && conn.status === 'DISCONNECTED' && <p>Bot is offline. Initialize connection to start responding.</p>}
            {!wiping && conn.status === 'INITIALIZING' && <p className="flex items-center gap-2 text-info"><Loader2 className="h-4 w-4 animate-spin" />Launching browser session on server…</p>}
            {!wiping && conn.status === 'QR_READY' && <p className="text-warning">Awaiting scan. Scan the QR code or request a pairing code.</p>}
            {!wiping && conn.status === 'AUTHENTICATING' && <p className="flex items-center gap-2 text-info"><Loader2 className="h-4 w-4 animate-spin" />Completing authentication handshake…</p>}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {wiping && (
              <button disabled className="rounded-lg border border-danger/20 bg-danger/8 px-4 py-2 text-sm font-semibold text-danger/50 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />Wiping…
              </button>
            )}
            {!wiping && conn.status === 'CONNECTED' && (<>
              <button onClick={handleDisconnect} disabled={submitting} className="rounded-lg border border-danger/30 bg-danger/8 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/15 transition disabled:opacity-50">Disconnect Bot</button>
              <button onClick={handleDeletePairing} disabled={submitting} className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 transition disabled:opacity-50">Delete Previous Pairing</button>
            </>)}
            {!wiping && conn.status === 'DISCONNECTED' && (<>
              <button onClick={handleConnect} disabled={submitting} className="btn-primary flex items-center gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Initialize Connection
              </button>
              <button onClick={handleDeletePairing} disabled={submitting} className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 transition disabled:opacity-50">Delete Previous Pairing</button>
            </>)}
            {!wiping && conn.status === 'QR_READY' && (<>
              <button onClick={handleDisconnect} disabled={submitting} className="btn-outline flex items-center gap-2">Cancel / Reset</button>
              <button onClick={handleDeletePairing} disabled={submitting} className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 transition disabled:opacity-50">Delete Previous Pairing</button>
            </>)}
          </div>
        </div>

        {/* Auth panel (hidden when connected) */}
        {conn.status !== 'CONNECTED' && (
          <div className="card bg-surface2 p-5 w-full lg:max-w-sm shrink-0 flex flex-col items-center gap-4">
            <div className="flex w-full rounded-lg bg-surface p-1 border border-line">
              {['qr', 'pairing'].map((m) => (
                <button key={m} onClick={() => setAuthMethod(m)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition ${authMethod === m ? 'bg-brand text-brand-on shadow-soft' : 'text-muted hover:text-ink'}`}>
                  {m === 'qr' ? <QrCode className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
                  {m === 'qr' ? 'QR Code' : 'Pairing Code'}
                </button>
              ))}
            </div>

            {authMethod === 'qr' && (conn.qr_code ? (
              <div className="space-y-3 text-center">
                <div className="inline-block bg-white p-3 rounded-xl border border-line">
                  <QrImage value={conn.qr_code} alt="WhatsApp QR" className="w-48 h-48 block" />
                </div>
                <div className="text-xs text-muted space-y-0.5">
                  <p className="font-semibold text-ink">To connect:</p>
                  <p>1. Open WhatsApp → Settings → Linked Devices</p>
                  <p>2. Tap <strong>Link a Device</strong> and scan</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <QrCode className="h-10 w-10 text-muted mx-auto animate-pulse" />
                <p className="text-sm font-medium text-muted">QR code not generated yet</p>
                <p className="text-xs text-muted">Initialize connection to generate</p>
              </div>
            ))}

            {authMethod === 'pairing' && (
              <div className="w-full space-y-4">
                <form onSubmit={handleRequestPairingCode} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted">WhatsApp Number</label>
                    <input type="text" className="input text-xs" placeholder="e.g. 923215555255"
                      value={phoneInput} onChange={e => setPhoneInput(e.target.value)} required />
                    <p className="text-[10px] text-muted">Country code without + or spaces</p>
                  </div>
                  <button type="submit" disabled={submitting || ['INITIALIZING','AUTHENTICATING'].includes(conn.status)}
                    className="btn-primary w-full py-2 flex items-center justify-center gap-1.5 text-xs">
                    {submitting || ['INITIALIZING','AUTHENTICATING'].includes(conn.status)
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Lock className="h-3.5 w-3.5" />}
                    {conn.status === 'DISCONNECTED' ? 'Pair & Initialize' : 'Request Pairing Code'}
                  </button>
                </form>

                {conn.pairing_code && (
                  <div className="pt-3 border-t border-line text-center space-y-2">
                    {conn.pairing_code.startsWith('ERROR:') ? (
                      <div className="p-2.5 rounded-lg border border-danger/20 bg-danger/8 text-xs text-danger flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 shrink-0" />Generation failed. Try again.
                      </div>
                    ) : conn.pairing_code === 'GENERATING...' ? (
                      <div className="p-3 rounded-lg border border-line text-xs text-muted flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-brand" />Generating code…
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted font-medium">Your Pairing Code</p>
                        <div className="rounded-lg border border-brand/30 bg-brand-soft py-3 font-mono text-2xl font-bold tracking-widest text-brand">{conn.pairing_code}</div>
                        <p className="text-[10px] text-muted">Enter this in WhatsApp → Linked Devices → Link with Phone Number</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
