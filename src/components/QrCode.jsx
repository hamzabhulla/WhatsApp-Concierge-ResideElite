import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Draws the WhatsApp login QR in the browser.
 * The old code sent the QR text to https://api.qrserver.com to get an image. That QR is what links
 * a device to the WhatsApp account, so a third-party site could have used it to take over the bot.
 */
export default function QrCode({ value, alt = 'QR code', className = '' }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    QRCode.toDataURL(String(value), { width: 384, margin: 1, errorCorrectionLevel: 'L' })
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [value]);

  if (failed) return <p className="text-xs text-danger">Could not draw the QR code. Press Cancel / Reset and try again.</p>;
  if (!src) return <div className={`${className} animate-pulse rounded bg-surface2`} />;
  return <img src={src} alt={alt} className={className} />;
}
