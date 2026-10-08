import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, MessageSquare, GraduationCap,
  Building2, LogOut, Wifi, Settings as SettingsIcon, X, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/training', label: 'Training', icon: GraduationCap },
  { to: '/properties', label: 'Properties', icon: Building2 },
  { to: '/connection', label: 'Connection', icon: Wifi },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Sidebar({ open, onClose }) {
  const { signOut, session } = useAuth();
  const { dark, toggle } = useTheme();

  const inner = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-start justify-between border-b border-line px-6 py-5">
        <div>
          <h1 className="font-display text-lg font-semibold tracking-wide text-brand">
            RESI D&apos;ELITE
          </h1>
          <p className="mt-0.5 text-[11px] uppercase tracking-widest text-muted">Bot Dashboard</p>
        </div>
        {/* Close button mobile only */}
        <button onClick={onClose} className="lg:hidden -mr-1 mt-0.5 rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-soft text-brand'
                  : 'text-muted hover:bg-surface2 hover:text-ink'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-line p-4">
        <p className="truncate text-xs text-muted">{session?.user?.email}</p>
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface2 hover:text-ink"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          onClick={signOut}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-danger/80 transition hover:bg-danger/8 hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-line bg-surface">
        {inner}
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-64 flex flex-col bg-surface shadow-lift">
            {inner}
          </aside>
        </div>
      )}
    </>
  );
}
