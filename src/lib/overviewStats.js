import { format, startOfDay, subDays } from 'date-fns';
import { parseDbTimestamp } from './utils';

/**
 * Pure function: everything the Overview page shows, computed from plain rows.
 * (Moved out of the hook so it can be unit-tested; logic is the same as before except that
 *  timestamps are read as UTC - see parseDbTimestamp.)
 */
export function computeOverviewStats({ leads = [], states = [], training = [], properties = [], now = new Date() }) {
  const today = startOfDay(now);
  const weekAgo = subDays(today, 7);
  const twoWeeksAgo = subDays(today, 14);

  const created = leads.map((l) => parseDbTimestamp(l.created_at));

  const leadsThisWeek = created.filter((d) => d && d >= weekAgo).length;
  const leadsLastWeek = created.filter((d) => d && d >= twoWeeksAgo && d < weekAgo).length;

  const weekTrend =
    leadsLastWeek > 0
      ? Math.round(((leadsThisWeek - leadsLastWeek) / leadsLastWeek) * 100)
      : leadsThisWeek > 0
        ? 100
        : 0;

  const leadsByDay = {};
  for (let i = 13; i >= 0; i--) leadsByDay[format(subDays(today, i), 'MMM d')] = 0;
  created.forEach((d) => {
    if (!d) return;
    const day = format(d, 'MMM d');
    if (leadsByDay[day] !== undefined) leadsByDay[day]++;
  });
  const leadsTimeline = Object.entries(leadsByDay).map(([date, count]) => ({ date, leads: count }));

  const statusCounts = leads.reduce((acc, l) => {
    const s = l.status || 'new';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const statusPie = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  const destCounts = leads.reduce((acc, l) => {
    if (!l.destination) return acc;
    acc[l.destination] = (acc[l.destination] || 0) + 1;
    return acc;
  }, {});
  const destinationBar = Object.entries(destCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([destination, count]) => ({ destination, count }));

  const flowCounts = states.reduce((acc, s) => {
    const step = s.flow_step || 'welcome';
    acc[step] = (acc[step] || 0) + 1;
    return acc;
  }, {});

  return {
    totalLeads: leads.length,
    newLeads: leads.filter((l) => l.status === 'new').length,
    activeChats: states.length,
    escalated: states.filter((s) => s.admin_override === 'escalated').length,
    pendingTraining: training.filter((t) => !t.is_violation && (!t.approved_admin1 || !t.approved_admin2)).length,
    availableProperties: properties.filter((p) => p.is_available).length,
    vipGuests: states.filter((s) => s.is_vip).length,
    weekTrend,
    leadsThisWeek,
    leadsTimeline,
    statusPie,
    destinationBar,
    flowCounts,
  };
}
