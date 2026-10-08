import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
        {Icon && (
          <div className="rounded-lg bg-brand/10 p-2">
            <Icon className="h-4 w-4 text-brand" />
          </div>
        )}
      </div>
      <div>
        <p className="font-display text-3xl font-semibold text-ink leading-none">{value}</p>
        {subtitle && (
          <p className="mt-1.5 text-xs text-muted">{subtitle}</p>
        )}
        {trend != null && (
          <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
            {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {trend >= 0 ? '+' : ''}{trend}% vs last week
          </div>
        )}
      </div>
    </div>
  );
}
