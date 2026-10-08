const styles = {
  new:           'bg-info/10 text-info ring-info/25',
  forwarded:     'bg-accent/10 text-accent ring-accent/25',
  closed:        'bg-muted/10 text-muted ring-muted/25',
  welcome:       'bg-brand/10 text-brand ring-brand/20',
  guest_count:   'bg-info/10 text-info ring-info/25',
  recommend:     'bg-brand/10 text-brand ring-brand/20',
  collect_dates: 'bg-warning/10 text-warning ring-warning/25',
  lead_capture:  'bg-success/10 text-success ring-success/25',
  pending:       'bg-warning/10 text-warning ring-warning/25',
  approved:      'bg-success/10 text-success ring-success/25',
  violation:     'bg-danger/10 text-danger ring-danger/25',
  vip:           'bg-accent/10 text-accent ring-accent/25',
  escalated:     'bg-danger/10 text-danger ring-danger/25',
  active:        'bg-success/10 text-success ring-success/25',
  paused:        'bg-muted/10 text-muted ring-muted/25',
  available:     'bg-success/10 text-success ring-success/25',
  budget:        'bg-warning/10 text-warning ring-warning/25',
};

export default function Badge({ label, variant = 'new' }) {
  const style = styles[variant] || styles.new;
  const text = label || variant;
  return (
    <span className={`chip ${style}`}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}
