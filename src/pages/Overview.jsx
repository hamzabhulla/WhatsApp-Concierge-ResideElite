import {
  Users, MessageSquare, AlertTriangle,
  GraduationCap, Building2, Star,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useOverviewStats } from '../hooks/useDashboardData';
import WhatsAppConnect from '../components/WhatsAppConnect';
import ErrorNotice from '../components/ErrorNotice';

const CHART_COLORS = ['#2F4538','#6FA382','#A8693F','#5C8A6B','#C98556','#4A7A5E'];

export default function Overview() {
  const { stats, loading, error, truncated } = useOverviewStats();

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Overview</h2>
        <p className="mt-1 text-sm text-muted">Real-time insights from your WhatsApp concierge bot</p>
      </div>

      <ErrorNotice message={error} />
      {truncated && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          Very large dataset: totals are based on the first 20,000 rows of each table.
        </div>
      )}

      <WhatsAppConnect />

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Leads"    value={stats.totalLeads}      icon={Users}         trend={stats.weekTrend} />
        <StatCard title="New Leads"      value={stats.newLeads}        icon={Users}         subtitle="Awaiting follow-up" />
        <StatCard title="Active Chats"   value={stats.activeChats}     icon={MessageSquare} />
        <StatCard title="Escalated"      value={stats.escalated}       icon={AlertTriangle} />
        <StatCard title="Training Queue" value={stats.pendingTraining} icon={GraduationCap} />
        <StatCard title="VIP Guests"     value={stats.vipGuests}       icon={Star} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Area chart */}
        <div className="card p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Leads — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.leadsTimeline}>
              <defs>
                <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2F4538" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2F4538" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" />
              <XAxis dataKey="date" tick={{ fill: 'rgb(var(--c-muted))', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgb(var(--c-muted))', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--c-surface))',
                  border: '1px solid rgb(var(--c-border))',
                  borderRadius: '10px',
                  color: 'rgb(var(--c-text))',
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="leads" stroke="#2F4538" fill="url(#leadGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Lead Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats.statusPie}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={90}
                paddingAngle={3}
                dataKey="value" nameKey="name"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: 'rgb(var(--c-muted))' }}
              >
                {stats.statusPie.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--c-surface))',
                  border: '1px solid rgb(var(--c-border))',
                  borderRadius: '10px',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--c-muted))' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="card p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Top Destinations</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.destinationBar} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" />
              <XAxis type="number" tick={{ fill: 'rgb(var(--c-muted))', fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="destination" tick={{ fill: 'rgb(var(--c-muted))', fontSize: 11 }} width={110} />
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--c-surface))',
                  border: '1px solid rgb(var(--c-border))',
                  borderRadius: '10px',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="#6FA382" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Flow steps */}
        <div className="card p-5">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">Conversation Flow Steps</h3>
          <div className="space-y-3.5">
            {Object.entries(stats.flowCounts).map(([step, count]) => {
              const pct = Math.min(100, (count / Math.max(stats.activeChats, 1)) * 100);
              return (
                <div key={step}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="capitalize text-ink">{step.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-brand">{count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
                    <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(stats.flowCounts).length === 0 && (
              <p className="text-sm text-muted">No active conversations yet.</p>
            )}
          </div>
          <div className="mt-6 flex items-center gap-2.5 rounded-lg border border-line bg-surface2 px-4 py-3">
            <Building2 className="h-4 w-4 text-brand shrink-0" />
            <span className="text-sm text-muted">
              <strong className="text-ink">{stats.availableProperties}</strong> properties available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
