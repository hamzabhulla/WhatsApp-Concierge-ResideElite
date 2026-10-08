import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const fake = await vi.hoisted(async () => {
  const m = await import('./helpers/fakeSupabase.js');
  return m.createFakeSupabase();
});
vi.mock('../src/lib/supabase', () => ({ supabase: fake.client, isSupabaseConfigured: true }));

import Leads from '../src/pages/Leads';
import Properties from '../src/pages/Properties';
import Conversations from '../src/pages/Conversations';
import Settings from '../src/pages/Settings';
import WhatsAppConnect from '../src/components/WhatsAppConnect';
import QrCode from '../src/components/QrCode';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import App from '../src/App';

beforeEach(() => {
  for (const k of Object.keys(fake.tables)) fake.tables[k].length = 0;
  fake.calls.length = 0;
  fake.client.auth.signInWithPassword.mockResolvedValue({ error: null });
  fake.client.auth.getUser.mockResolvedValue({ data: { user: { email: 'admin@example.com' } } });
});

const lastSelect = (table) => [...fake.calls].reverse().find((c) => c.table === table && c.op === 'select');

describe('Leads', () => {
  it('modal inputs keep focus while typing (they lost focus after every character before)', async () => {
    const user = userEvent.setup();
    render(<Leads />);
    await screen.findByText(/enquiries captured/i);
    await user.click(screen.getByRole('button', { name: /add lead/i }));
    const name = screen.getByPlaceholderText('Guest full name');
    await user.type(name, 'Ali Khan');
    expect(name).toHaveValue('Ali Khan');
    expect(name).toHaveFocus();
  });

  it('search text cannot inject extra PostgREST filters', async () => {
    const user = userEvent.setup();
    render(<Leads />);
    await screen.findByText(/enquiries captured/i);
    await user.type(screen.getByPlaceholderText(/Search name/), 'x,status.eq.closed{Enter}');
    await waitFor(() => expect(lastSelect('leads').or).toBeTruthy());
    const expr = lastSelect('leads').or;
    expect(expr).not.toMatch(/,status\.eq/);
    expect(expr.split(',')).toHaveLength(3); // exactly the 3 intended clauses
  });

  it('shows the real total when there are more rows than the page', async () => {
    fake.tables.leads.push(...Array.from({ length: 250 }, (_, i) => ({ id: String(i), wa_number: '92300' + i, created_at: '2026-10-01T00:00:00', status: 'new' })));
    render(<Leads />);
    expect(await screen.findByText(/Showing the latest 200 of 250/)).toBeInTheDocument();
  });

  it('a lead with a missing created_at does not crash the page', async () => {
    fake.tables.leads.push({ id: '1', wa_number: '923001234567', name: 'No Date', created_at: null, status: 'new' });
    render(<Leads />);
    expect(await screen.findByText('No Date')).toBeInTheDocument();
  });

  it('status change failure is reported', async () => {
    fake.tables.leads.push({ id: '1', wa_number: '923001234567', name: 'Ali', created_at: '2026-10-01T00:00:00', status: 'new' });
    const user = userEvent.setup();
    render(<Leads />);
    await screen.findByText('Ali');
    fake.failNext({ message: 'permission denied' });
    await user.selectOptions(screen.getAllByRole('combobox').find((s) => s.value === 'new'), 'closed');
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/permission denied/)));
  });
});

describe('Properties', () => {
  it('modal inputs keep focus while typing', async () => {
    const user = userEvent.setup();
    render(<Properties />);
    await user.click(await screen.findByRole('button', { name: /add property/i }));
    const name = screen.getByPlaceholderText('Property display name');
    await user.type(name, 'Royal Villa');
    expect(name).toHaveValue('Royal Villa');
    expect(name).toHaveFocus();
  });

  it('a duplicate slug is reported and the form stays open (it used to close as if saved)', async () => {
    const user = userEvent.setup();
    render(<Properties />);
    await user.click(await screen.findByRole('button', { name: /add property/i }));
    await user.type(screen.getByPlaceholderText(/royal-villa-murree/), 'royal-villa');
    await user.type(screen.getByPlaceholderText('Property display name'), 'Royal Villa');
    fake.failNext({ code: '23505', message: 'duplicate key value violates unique constraint' });
    const form = screen.getByPlaceholderText('Property display name').closest('form');
    await user.click(within(form).getByRole('button', { name: /add property/i }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/already exists/)));
    expect(screen.getByPlaceholderText('Property display name')).toBeInTheDocument();
  });

  it('normalises the slug and validates guest limits', async () => {
    const user = userEvent.setup();
    render(<Properties />);
    await user.click(await screen.findByRole('button', { name: /add property/i }));
    await user.type(screen.getByPlaceholderText(/royal-villa-murree/), '  Royal Villa  ');
    await user.type(screen.getByPlaceholderText('Property display name'), 'Royal Villa');
    const form = screen.getByPlaceholderText('Property display name').closest('form');
    await user.clear(within(form).getByPlaceholderText('1')); await user.type(within(form).getByPlaceholderText('1'), '8');
    await user.type(within(form).getByPlaceholderText('10'), '4');
    await user.click(within(form).getByRole('button', { name: /add property/i }));
    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/Max guests/));
    expect(fake.writes()).toHaveLength(0);

    await user.clear(within(form).getByPlaceholderText('10')); await user.type(within(form).getByPlaceholderText('10'), '12');
    await user.click(within(form).getByRole('button', { name: /add property/i }));
    await waitFor(() => expect(fake.writes()).toHaveLength(1));
    expect(fake.writes()[0].payload.slug).toBe('royal-villa');
  });
});

describe('Conversations', () => {
  it('"Last Active" shows chat_states.last_activity (the page read a column that does not exist)', async () => {
    fake.tables.chat_states.push({ wa_number: '923001234567', flow_step: 'city', ai_active: true, is_vip: false, last_activity: '2026-10-04T10:30:00', flow_data: {} });
    render(<Conversations />);
    expect(await screen.findByText('04 Oct 10:30')).toBeInTheDocument();
  });

  it('a failed pause is reported', async () => {
    fake.tables.chat_states.push({ wa_number: '923001234567', flow_step: 'city', ai_active: true, is_vip: false, last_activity: '2026-10-04T10:30:00', flow_data: {} });
    const user = userEvent.setup();
    render(<Conversations />);
    await screen.findByText('923001234567');
    fake.failNext({ message: 'permission denied for table chat_states' });
    const row = screen.getByText('923001234567').closest('tr');
    const buttons = within(row).getAllByRole('button');
    await user.click(buttons[0]);
    await waitFor(() => expect(window.alert).toHaveBeenCalled());
  });
});

describe('Settings', () => {
  const seed = () => fake.tables.bot_settings.push({ id: 1, gemini_api_key: 'old-key', active_provider: 'gemini', brand_forward_number: '', api_errors: {}, hybrid_config: 'all' });

  it('a wrong login password blocks saving', async () => {
    seed();
    fake.client.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByText('System Settings');
    await user.type(screen.getByPlaceholderText('Your login password'), 'wrong');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/Incorrect password/)).toBeInTheDocument();
    expect(fake.writes()).toHaveLength(0);
    expect(fake.client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'wrong' });
  });

  it('a password that is not the real login password is never accepted (no hard-coded password any more)', async () => {
    seed();
    fake.client.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByText('System Settings');
    await user.type(screen.getByPlaceholderText('Your login password'), 'some-old-hardcoded-password');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await screen.findByText(/Incorrect password/);
    expect(fake.writes()).toHaveLength(0);
  });

  it('correct password saves trimmed keys and a digits-only forward number', async () => {
    seed();
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByText('System Settings');
    const key1 = screen.getByPlaceholderText('Gemini API Key 1');
    await user.clear(key1); await user.type(key1, '  new-key  ');
    const fwd = screen.getByPlaceholderText('923215555255');
    await user.type(fwd, '+92 321 5555255');
    await user.type(screen.getByPlaceholderText('Your login password'), 'right-password');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(fake.writes()).toHaveLength(1));
    const w = fake.writes()[0];
    expect(w.table).toBe('bot_settings');
    expect(w.payload.gemini_api_key).toBe('new-key');
    expect(w.payload.brand_forward_number).toBe('923215555255');
  });

  it('rejects a malformed forward number', async () => {
    seed();
    const user = userEvent.setup();
    render(<Settings />);
    await screen.findByText('System Settings');
    await user.type(screen.getByPlaceholderText('923215555255'), '12345');
    await user.type(screen.getByPlaceholderText('Your login password'), 'right-password');
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/10-15 digits/)).toBeInTheDocument();
    expect(fake.writes()).toHaveLength(0);
  });
});

describe('WhatsApp connection', () => {
  it('draws the login QR locally and never contacts a third-party QR service', async () => {
    fake.tables.whatsapp_connection.push({ id: 1, status: 'QR_READY', qr_code: '2@SECRET-LOGIN-QR,abc,def', pairing_code: null });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    render(<WhatsAppConnect />);
    const img = await screen.findByAltText('WhatsApp QR');
    await waitFor(() => expect(img.getAttribute('src') || '').toMatch(/^data:image\/png;base64,/));
    expect(document.body.innerHTML).not.toMatch(/qrserver/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('a rejected command is reported (supabase-js returns the error instead of throwing)', async () => {
    fake.tables.whatsapp_connection.push({ id: 1, status: 'DISCONNECTED', qr_code: null });
    const user = userEvent.setup();
    render(<WhatsAppConnect />);
    fake.failNext({ message: 'permission denied for table whatsapp_connection' });
    await user.click(await screen.findByRole('button', { name: /initialize connection/i }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/permission denied/)));
  });

  it('QrCode renders an image data URL', async () => {
    render(<QrCode value="hello" alt="qr" />);
    const img = await screen.findByAltText('qr');
    await waitFor(() => expect(img.getAttribute('src') || '').toMatch(/^data:image\/png/));
  });
});

describe('ErrorBoundary', () => {
  it('shows a recovery screen instead of a blank page', () => {
    const Boom = () => { throw new Error('render failure'); };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});

describe('Access control (UI side; the database enforces the same rule)', () => {
  const session = (role) => ({ user: { email: 'someone@example.com', app_metadata: role ? { role } : {} }, access_token: 't' });
  const renderApp = (s, path = '/leads') => {
    fake.client.auth.getSession.mockResolvedValue({ data: { session: s } });
    return render(
      <MemoryRouter initialEntries={[path]}>
        <ThemeProvider><AuthProvider><App /></AuthProvider></ThemeProvider>
      </MemoryRouter>
    );
  };

  it('signed out -> login page', async () => {
    renderApp(null);
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('signed in but not an admin -> "Access denied", no data page rendered', async () => {
    renderApp(session(null));
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText(/enquiries captured/i)).not.toBeInTheDocument();
    expect(fake.calls.filter((c) => c.table === 'leads')).toHaveLength(0);
  });

  it('a user who sets role in user_metadata is still denied', async () => {
    const s = { user: { email: 'x@example.com', app_metadata: {}, user_metadata: { role: 'admin' } } };
    renderApp(s);
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
  });

  it('"Check again" picks up a newly granted admin role', async () => {
    const user = userEvent.setup();
    renderApp(session(null));
    await screen.findByText('Access denied');
    fake.client.auth.refreshSession.mockResolvedValue({ data: { session: session('admin') } });
    await user.click(screen.getByRole('button', { name: /check again/i }));
    expect(await screen.findByText(/enquiries captured/i)).toBeInTheDocument();
  });

  it('admin -> sees the page', async () => {
    renderApp(session('admin'));
    expect(await screen.findByText(/enquiries captured/i)).toBeInTheDocument();
  });
});
