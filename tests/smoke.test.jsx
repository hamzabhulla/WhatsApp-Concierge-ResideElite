import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const fake = await vi.hoisted(async () => {
  const m = await import('./helpers/fakeSupabase.js');
  return m.createFakeSupabase();
});
vi.mock('../src/lib/supabase', () => ({ supabase: fake.client, isSupabaseConfigured: true }));

import Overview from '../src/pages/Overview';
import Training from '../src/pages/Training';
import Connection from '../src/pages/Connection';

beforeEach(() => {
  for (const k of Object.keys(fake.tables)) fake.tables[k].length = 0;
  fake.calls.length = 0;
  fake.clearSelectFailures();
  fake.client.auth.signInWithPassword.mockResolvedValue({ error: null });
  fake.client.auth.getUser.mockResolvedValue({ data: { user: { email: 'admin@example.com' } } });
});

describe('Overview', () => {
  it('renders the numbers and charts from the data', async () => {
    const today = new Date().toISOString().slice(0, 19);
    fake.tables.leads.push(
      { id: '1', created_at: today, status: 'new', destination: 'Murree' },
      { id: '2', created_at: today, status: 'closed', destination: 'Lahore' },
    );
    fake.tables.chat_states.push({ wa_number: '1', flow_step: 'city', admin_override: null, is_vip: false });
    fake.tables.properties.push({ id: '1', is_available: true });
    render(<Overview />);
    expect(await screen.findByText('Overview')).toBeInTheDocument();
    expect(await screen.findByText('Top Destinations')).toBeInTheDocument();
    expect(screen.getByText('Total Leads')).toBeInTheDocument();
  });

  it('shows a clear error (with the fix) instead of silent zeros when the database refuses access', async () => {
    fake.failSelect('leads', { message: 'permission denied for table leads' });
    render(<Overview />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/make-admin\.sql/);
  });
});

describe('Connection page', () => {
  it('renders the connection card', async () => {
    fake.tables.whatsapp_connection.push({ id: 1, status: 'CONNECTED' });
    render(<Connection />);
    expect(await screen.findByText('WhatsApp Connection')).toBeInTheDocument();
    expect(await screen.findByText(/actively responding/)).toBeInTheDocument();
  });

  it('surfaces a load failure', async () => {
    fake.failSelect('whatsapp_connection', { message: 'permission denied for table whatsapp_connection' });
    render(<Connection />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission denied/);
  });
});

describe('Training page', () => {
  const pending = () => fake.tables.training_data.push({
    id: 'a1', question: 'Is breakfast included?', answer: 'Yes, complimentary.', approved_admin1: false,
    approved_admin2: false, is_violation: false, wa_number: '923001234567', created_at: '2026-10-04T09:15:00',
  });

  it('lists the queue with a correctly timed entry', async () => {
    pending();
    render(<Training />);
    expect(await screen.findByText('Is breakfast included?')).toBeInTheDocument();
    expect(screen.getByText(/04 Oct 2026 09:15/)).toBeInTheDocument();
  });

  it('every tab opens without crashing', async () => {
    const user = userEvent.setup();
    render(<Training />);
    await screen.findByText('AI Training & settings');
    for (const tab of ['Bulk Train AI', 'Repeated FAQ Cache', 'AI API Settings', 'Knowledge Base & Queue']) {
      await user.click(screen.getByRole('button', { name: tab }));
    }
    expect(screen.getByText('AI Training & settings')).toBeInTheDocument();
  });

  it('a failed approval is reported to the admin', async () => {
    pending();
    const user = userEvent.setup();
    render(<Training />);
    await screen.findByText('Is breakfast included?');
    fake.failNext({ message: 'permission denied for table training_data' });
    await user.click(screen.getByRole('button', { name: /approve admin 1/i }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/permission denied/)));
  });

  it('FAQ cache tab explains a failure instead of looking empty', async () => {
    fake.failSelect('qa_cache', { message: 'relation "public.qa_cache" does not exist' });
    const user = userEvent.setup();
    render(<Training />);
    await screen.findByText('AI Training & settings');
    await user.click(screen.getByRole('button', { name: 'Repeated FAQ Cache' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/qa_cache/);
  });

  it('AI API Settings: wrong login password blocks the save; correct one saves trimmed keys', async () => {
    fake.tables.bot_settings.push({ id: 1, gemini_api_key: 'old', active_provider: 'gemini', api_errors: {}, hybrid_config: 'all' });
    const user = userEvent.setup();
    render(<Training />);
    await screen.findByText('AI Training & settings');
    await user.click(screen.getByRole('button', { name: 'AI API Settings' }));
    // the tab shows a spinner while settings load; wait until the stored key has been filled in
    await waitFor(() => expect(screen.getByPlaceholderText('Enter Google Gemini API Key 1')).toHaveValue('old'));
    const key1 = screen.getByPlaceholderText('Enter Google Gemini API Key 1');
    await user.clear(key1);
    await user.type(key1, '  fresh-key ');
    const pw = screen.getByPlaceholderText('Re-enter your login password to update keys');

    fake.client.auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid login credentials' } });
    await user.type(pw, 'wrong');
    await user.click(screen.getByRole('button', { name: /save api credentials/i }));
    expect(await screen.findByText(/Incorrect password/)).toBeInTheDocument();
    expect(fake.writes()).toHaveLength(0);

    // the form is swapped for a spinner while saving, so look the field up again
    const pw2 = screen.getByPlaceholderText('Re-enter your login password to update keys');
    await user.clear(pw2);
    await user.type(pw2, 'right');
    await user.click(screen.getByRole('button', { name: /save api credentials/i }));
    await waitFor(() => expect(fake.writes()).toHaveLength(1));
    expect(fake.writes()[0].payload.gemini_api_key).toBe('fresh-key');
  });
});
