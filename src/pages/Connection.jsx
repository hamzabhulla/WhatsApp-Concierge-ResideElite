import WhatsAppConnect from '../components/WhatsAppConnect';

export default function Connection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">WhatsApp Connection</h2>
        <p className="mt-1 text-sm text-muted">Link your WhatsApp account via QR code or pairing code, and manage active session states.</p>
      </div>
      <WhatsAppConnect />
    </div>
  );
}
