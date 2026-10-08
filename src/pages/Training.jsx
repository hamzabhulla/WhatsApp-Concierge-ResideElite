import { useState, useEffect, useCallback } from 'react';
import { formatTimestamp } from '../lib/utils';
import { verifyCurrentUserPassword } from '../lib/auth';
import ErrorNotice from '../components/ErrorNotice';
import {
  RefreshCw,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  Search,
  BookOpen,
  Database,
  Sparkles,
  Import,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sliders,
  Eye,
  EyeOff,
  Activity,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTrainingData, TRAINING_LIMIT } from '../hooks/useDashboardData';
import { supabase } from '../lib/supabase';

function getTrainingStatus(item) {
  if (item.is_violation) return 'violation';
  if (item.approved_admin1 && item.approved_admin2) return 'approved';
  return 'pending';
}

export default function Training() {
  const { items, loading: trainingLoading, error: trainingError, refetch } = useTrainingData();
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'bulk', 'cache', 'settings'
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'approved', 'violation'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest'

  // Modals / Editing States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  // Forms
  const [addForm, setAddForm] = useState({
    question: '',
    answer: '',
    makeLive: true,
  });
  
  const [editForm, setEditForm] = useState({
    id: '',
    question: '',
    answer: '',
    approved_admin1: false,
    approved_admin2: false,
    is_violation: false,
  });

  // Bulk Train State
  const [bulkText, setBulkText] = useState('');
  const [parsedPairs, setParsedPairs] = useState([]);
  const [bulkError, setBulkError] = useState('');
  const [bulkMakeLive, setBulkMakeLive] = useState(true);

  // FAQ Cache State
  const [cacheItems, setCacheItems] = useState([]);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheError, setCacheError] = useState('');

  // Bot API Settings State
  const [settingsForm, setSettingsForm] = useState({
    gemini_api_key: '',
    gemini_api_key_2: '',
    gemini_api_key_3: '',
    groq_api_key: '',
    active_provider: 'gemini',
    api_errors: {},
    hybrid_config: 'all',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGeminiKey2, setShowGeminiKey2] = useState(false);
  const [showGeminiKey3, setShowGeminiKey3] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [dbTableMissing, setDbTableMissing] = useState(false);
  const [securityPassword, setSecurityPassword] = useState('');

  // Fetch FAQ Cache
  const fetchCache = useCallback(async () => {
    setCacheLoading(true);
    setCacheError('');
    try {
      const { data, error } = await supabase
        .from('qa_cache')
        .select('*')
        .order('ask_count', { ascending: false });
      if (error) throw error;
      setCacheItems(data || []);
    } catch (err) {
      console.error('Error fetching cache:', err.message);
      setCacheError(err.message);
    } finally {
      setCacheLoading(false);
    }
  }, []);

  // Fetch Bot API Settings
  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError('');
    setDbTableMissing(false);
    try {
      const { data, error } = await supabase
        .from('bot_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') {
          // Table bot_settings doesn't exist
          setDbTableMissing(true);
        } else {
          throw error;
        }
      } else if (data) {
        setSettingsForm({
          gemini_api_key: data.gemini_api_key || '',
          gemini_api_key_2: data.gemini_api_key_2 || '',
          gemini_api_key_3: data.gemini_api_key_3 || '',
          groq_api_key: data.groq_api_key || '',
          active_provider: data.active_provider || 'gemini',
          api_errors: data.api_errors || {},
          hybrid_config: data.hybrid_config || 'all',
        });
      } else {
        // Table exists but no config row has been initialized yet
        const { error: insertErr } = await supabase
          .from('bot_settings')
          .insert({ id: 1, active_provider: 'gemini' });
        if (insertErr) throw insertErr;
      }
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'cache') {
      fetchCache();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab, fetchCache, fetchSettings]);

  // Handle Refetch all
  const handleRefreshAll = () => {
    refetch();
    if (activeTab === 'cache') {
      fetchCache();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  };

  // Add Q&A Handlers
  async function handleAddSubmit(e) {
    e.preventDefault();
    if (!addForm.question.trim() || !addForm.answer.trim()) return;
    
    try {
      const payload = {
        question: addForm.question.trim(),
        answer: addForm.answer.trim(),
        approved_admin1: addForm.makeLive,
        approved_admin2: addForm.makeLive,
        is_violation: false,
        wa_number: 'Dashboard Admin',
      };
      
      const { error } = await supabase.from('training_data').insert(payload);
      if (error) throw error;
      
      setShowAddModal(false);
      setAddForm({ question: '', answer: '', makeLive: true });
      refetch();
    } catch (err) {
      alert('Failed to add training entry: ' + err.message);
    }
  }

  // Edit Handlers
  function openEdit(item) {
    setEditingItem(item);
    setEditForm({
      id: item.id,
      question: item.question || '',
      answer: item.answer || '',
      approved_admin1: item.approved_admin1 ?? false,
      approved_admin2: item.approved_admin2 ?? false,
      is_violation: item.is_violation ?? false,
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editForm.question.trim() || !editForm.answer.trim()) return;

    try {
      const payload = {
        question: editForm.question.trim(),
        answer: editForm.answer.trim(),
        approved_admin1: editForm.approved_admin1,
        approved_admin2: editForm.approved_admin2,
        is_violation: editForm.is_violation,
      };

      const { error } = await supabase
        .from('training_data')
        .update(payload)
        .eq('id', editForm.id);
        
      if (error) throw error;
      
      setEditingItem(null);
      refetch();
    } catch (err) {
      alert('Failed to update training entry: ' + err.message);
    }
  }

  // Quick Approvals & Violation Toggles
  async function approve(id, slot) {
    const field = slot === 2 ? 'approved_admin2' : 'approved_admin1';
    const { error } = await supabase.from('training_data').update({ [field]: true }).eq('id', id);
    if (error) alert('Could not approve this entry: ' + error.message);
    refetch();
  }

  async function markViolation(id) {
    const { error } = await supabase.from('training_data').update({ is_violation: true }).eq('id', id);
    if (error) alert('Could not mark this entry: ' + error.message);
    refetch();
  }

  // Delete Handler
  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this training entry? This will permanently remove it from the database.')) return;
    try {
      const { error } = await supabase.from('training_data').delete().eq('id', id);
      if (error) throw error;
      refetch();
    } catch (err) {
      alert('Failed to delete training entry: ' + err.message);
    }
  }

  // Bulk Train Handlers
  function handleParseBulk() {
    setBulkError('');
    if (!bulkText.trim()) {
      setBulkError('Please paste some text first.');
      return;
    }

    const lines = bulkText.split('\n');
    const pairs = [];
    let currentQ = '';
    let currentA = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (line.match(/^q(uestion)?:/i)) {
        if (currentQ && currentA) {
          pairs.push({ question: currentQ, answer: currentA });
          currentQ = '';
          currentA = '';
        }
        currentQ = line.replace(/^q(uestion)?:/i, '').trim();
      } else if (line.match(/^a(nswer)?:/i)) {
        currentA = line.replace(/^a(nswer)?:/i, '').trim();
      } else {
        if (currentA) {
          currentA += '\n' + line;
        } else if (currentQ) {
          currentQ += '\n' + line;
        }
      }
    }
    
    if (currentQ && currentA) {
      pairs.push({ question: currentQ, answer: currentA });
    }

    if (pairs.length === 0) {
      setBulkError('No valid Q&A pairs found. Make sure questions start with Q: and answers start with A:.');
    } else {
      setParsedPairs(pairs);
    }
  }

  async function handleImportBulk() {
    if (parsedPairs.length === 0) return;
    try {
      const payload = parsedPairs.map(p => ({
        question: p.question,
        answer: p.answer,
        approved_admin1: bulkMakeLive,
        approved_admin2: bulkMakeLive,
        is_violation: false,
        wa_number: 'Bulk Import',
      }));

      const { error } = await supabase.from('training_data').insert(payload);
      if (error) throw error;

      setParsedPairs([]);
      setBulkText('');
      setActiveTab('queue');
      refetch();
    } catch (err) {
      alert('Failed to import bulk training data: ' + err.message);
    }
  }

  function handleRemoveParsed(index) {
    setParsedPairs(parsedPairs.filter((_, i) => i !== index));
  }

  // Cache Handlers
  async function handleConvertCache(cacheItem) {
    setAddForm({
      question: cacheItem.original_question,
      answer: cacheItem.answer,
      makeLive: true,
    });
    setShowAddModal(true);
  }

  async function handleDeleteCache(id) {
    if (!confirm('Remove this item from the FAQ cache?')) return;
    try {
      const { error } = await supabase.from('qa_cache').delete().eq('id', id);
      if (error) throw error;
      fetchCache();
    } catch (err) {
      alert('Failed to delete cache item: ' + err.message);
    }
  }

  async function handleClearAllCache() {
    if (!confirm('Are you sure you want to clear the entire FAQ cache? The bot will have to ask the AI engine to generate fresh responses for every message.')) return;
    try {
      const { error } = await supabase.from('qa_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      fetchCache();
    } catch (err) {
      alert('Failed to clear cache: ' + err.message);
    }
  }

  // AI API Settings Handlers
  async function handleSaveSettings(e) {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError('');
    // Verified by Supabase with your real login password. (The old check compared against a
    // password written in this source file, which ships to every visitor's browser.)
    if (!(await verifyCurrentUserPassword(securityPassword))) {
      setSettingsError('Incorrect password. Access denied.');
      setSettingsLoading(false);
      return;
    }
    try {
      const payload = {
        gemini_api_key: settingsForm.gemini_api_key.trim() || null,
        gemini_api_key_2: settingsForm.gemini_api_key_2 ? settingsForm.gemini_api_key_2.trim() : null,
        gemini_api_key_3: settingsForm.gemini_api_key_3 ? settingsForm.gemini_api_key_3.trim() : null,
        groq_api_key: settingsForm.groq_api_key.trim() || null,
        active_provider: settingsForm.active_provider,
        hybrid_config: settingsForm.hybrid_config,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('bot_settings')
        .update(payload)
        .eq('id', 1);

      if (error) throw error;
      alert('AI API configurations saved! The chatbot will start using these settings dynamically.');
      setSecurityPassword(''); // Clear password field on success
      fetchSettings();
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsLoading(false);
    }
  }

  // Filtering & Sorting of Queue items
  const filteredItems = items
    .filter((item) => {
      // Status filter
      const status = getTrainingStatus(item);
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const questionMatch = item.question?.toLowerCase().includes(q);
        const answerMatch = item.answer?.toLowerCase().includes(q);
        const sourceMatch = item.wa_number?.toLowerCase().includes(q);
        return questionMatch || answerMatch || sourceMatch;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  // Calculate statistics
  const stats = {
    pending: items.filter((i) => getTrainingStatus(i) === 'pending').length,
    approved: items.filter((i) => getTrainingStatus(i) === 'approved').length,
    violation: items.filter((i) => getTrainingStatus(i) === 'violation').length,
    total: items.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">AI Training & settings</h2>
          <p className="mt-1 text-sm text-muted">
            Supercharge your concierge bot's knowledge base, approve dynamic questions, and change LLM API keys.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefreshAll} className="btn-ghost flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Q&A Pair
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-line">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition ${
              activeTab === 'queue'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Knowledge Base & Queue
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition ${
              activeTab === 'bulk'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Bulk Train AI
          </button>
          <button
            onClick={() => setActiveTab('cache')}
            className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition ${
              activeTab === 'cache'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <Database className="h-4 w-4" />
            Repeated FAQ Cache
            {cacheItems.length > 0 && (
              <span className="ml-1.5 rounded-full bg-surface2 px-2 py-0.5 text-xs text-brand font-semibold">
                {cacheItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition ${
              activeTab === 'settings'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
          >
            <Sliders className="h-4 w-4" />
            AI API Settings
          </button>
        </nav>
      </div>

      {/* Tab Contents */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <ErrorNotice message={trainingError} />
          {items.length >= TRAINING_LIMIT && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
              Showing the newest {TRAINING_LIMIT} entries only.
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div className="card p-4 flex flex-col justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Pending Approval</span>
              <span className="mt-2 text-2xl font-bold text-warning">{stats.pending}</span>
            </div>
            <div className="card p-4 flex flex-col justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Live & Approved</span>
              <span className="mt-2 text-2xl font-bold text-success">{stats.approved}</span>
            </div>
            <div className="card p-4 flex flex-col justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Violations</span>
              <span className="mt-2 text-2xl font-bold text-danger">{stats.violation}</span>
            </div>
            <div className="card p-4 flex flex-col justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">Total Entries</span>
              <span className="mt-2 text-2xl font-bold text-ink">{stats.total}</span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
              <input
                type="text"
                placeholder="Search questions, answers, or numbers..."
                className="input pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-lg bg-base p-1 border border-line">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === 'all'
                      ? 'bg-brand text-brand-on'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === 'pending'
                      ? 'bg-brand text-brand-on'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('approved')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === 'approved'
                      ? 'bg-brand text-brand-on'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Live
                </button>
                <button
                  onClick={() => setStatusFilter('violation')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    statusFilter === 'violation'
                      ? 'bg-brand text-brand-on'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  Violations
                </button>
              </div>

              <select
                className="input w-auto bg-base border-line text-xs py-1.5"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* List of Entries */}
          {trainingLoading ? (
            <div className="flex h-48 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="card p-12 text-center text-muted">
              <HelpCircle className="mx-auto h-12 w-12 text-muted mb-3" />
              <p className="text-lg font-medium text-muted">No training data found</p>
              <p className="text-sm mt-1">Try relaxing your search/filter or add a new training pair.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => {
                const status = getTrainingStatus(item);
                return (
                  <div key={item.id} className="card p-5 hover:border-line transition group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={status} />
                          <span className="text-xs text-muted">
                            {formatTimestamp(item.created_at)}
                          </span>
                          {item.wa_number && (
                            <span className="text-xs text-muted bg-base px-2 py-0.5 rounded-full border border-line">
                              Source: {item.wa_number}
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-base font-semibold text-ink">
                            <span className="text-brand font-normal mr-1.5">Q:</span>
                            {item.question}
                          </div>
                          {item.answer ? (
                            <div className="text-sm text-ink/80 bg-base/40 border border-line rounded-lg p-3">
                              <span className="text-success font-semibold mr-1.5">A:</span>
                              {item.answer}
                            </div>
                          ) : (
                            <div className="text-sm italic text-warning bg-warning/10 border border-warning/20 rounded-lg p-3 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-warning" />
                              No answer has been approved yet. Provide an answer to train the AI.
                            </div>
                          )}
                        </div>

                        {/* Approvals */}
                        <div className="flex gap-4 pt-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted">Admin 1:</span>
                            {item.approved_admin1 ? (
                              <span className="text-success flex items-center gap-0.5"><Check className="h-3 w-3" /> Approved</span>
                            ) : (
                              <span className="text-muted">— Awaiting</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted">Admin 2:</span>
                            {item.approved_admin2 ? (
                              <span className="text-success flex items-center gap-0.5"><Check className="h-3 w-3" /> Approved</span>
                            ) : (
                              <span className="text-muted">— Awaiting</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row md:flex-col justify-end gap-2 shrink-0 self-stretch md:self-auto border-t border-line md:border-0 pt-3 md:pt-0">
                        {status === 'pending' && (
                          <div className="flex flex-wrap gap-2 w-full justify-start md:justify-end">
                            {!item.approved_admin1 && (
                              <button
                                onClick={() => approve(item.id, 1)}
                                className="flex-1 md:flex-initial rounded bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-emerald-500/20 border border-success/20"
                              >
                                Approve Admin 1
                              </button>
                            )}
                            {!item.approved_admin2 && (
                              <button
                                onClick={() => approve(item.id, 2)}
                                className="flex-1 md:flex-initial rounded bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-emerald-500/20 border border-success/20"
                              >
                                Approve Admin 2
                              </button>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 w-full justify-end">
                          {status === 'pending' && !item.is_violation && (
                            <button
                              onClick={() => markViolation(item.id)}
                              className="rounded p-1.5 text-muted hover:bg-danger/15 hover:text-danger border border-transparent hover:border-danger/20"
                              title="Mark as policy violation"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(item)}
                            className="rounded p-1.5 text-muted hover:bg-surface2 hover:text-ink border border-transparent hover:border-line"
                            title="Edit entry"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded p-1.5 text-muted hover:bg-danger/15 hover:text-danger border border-transparent hover:border-danger/20"
                            title="Delete entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-start gap-3 bg-brand/5 border border-brand/20 rounded-lg p-4">
              <AlertCircle className="h-5 w-5 text-brand shrink-0 mt-0.5" />
              <div className="text-sm text-ink/80">
                <span className="font-semibold text-ink">How Bulk Training Works:</span>
                <p className="mt-1">
                  Paste lists of custom Questions and Answers. You can add multiple pairs at once. 
                  Use <code className="text-brand">Q:</code> (or <code className="text-brand">Question:</code>) at the start of a question line, and <code className="text-brand">A:</code> (or <code className="text-brand">Answer:</code>) at the start of an answer line.
                </p>
                <p className="mt-2 text-xs text-muted">
                  Example Format:<br/>
                  Q: What are the check-out guidelines?<br/>
                  A: Please checkout by 11:00 AM, switch off the AC, and drop keys at reception.<br/><br/>
                  Q: Do you charge for extra drivers?<br/>
                  A: Driver quarters are available at PKR 5,000/night.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-ink/80">Raw Q&A Content</label>
              <textarea
                className="input min-h-[200px] font-mono text-xs"
                placeholder="Q: Question 1...&#10;A: Answer 1...&#10;&#10;Q: Question 2...&#10;A: Answer 2..."
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
            </div>

            {bulkError && <p className="text-sm text-danger font-medium">{bulkError}</p>}

            <div className="flex gap-3">
              <button onClick={handleParseBulk} className="btn-primary flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Parse Q&A Pairs
              </button>
              <button
                onClick={() => {
                  setBulkText('');
                  setParsedPairs([]);
                  setBulkError('');
                }}
                className="btn-ghost"
              >
                Clear
              </button>
            </div>
          </div>

          {parsedPairs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold text-ink">
                  Parsed Pairs ({parsedPairs.length})
                </h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-ink/80 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-line bg-surface2 text-brand focus:ring-brand"
                      checked={bulkMakeLive}
                      onChange={(e) => setBulkMakeLive(e.target.checked)}
                    />
                    Approve instantly (Make live)
                  </label>
                  <button
                    onClick={handleImportBulk}
                    className="btn-primary flex items-center gap-2 py-1.5"
                  >
                    <Import className="h-4 w-4" />
                    Import All Pairs
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {parsedPairs.map((pair, index) => (
                  <div key={index} className="card p-4 relative space-y-2 group">
                    <button
                      onClick={() => handleRemoveParsed(index)}
                      className="absolute right-3 top-3 rounded p-1 text-muted hover:bg-danger/15 hover:text-danger opacity-0 group-hover:opacity-100 transition"
                      title="Exclude from import"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="text-xs text-brand font-semibold uppercase tracking-wider">Pair #{index + 1}</div>
                    <div className="font-medium text-ink text-sm"><span className="text-brand">Q:</span> {pair.question}</div>
                    <div className="text-ink/80 text-xs bg-base/40 p-2.5 rounded border border-line/40"><span className="text-success font-medium">A:</span> {pair.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cache' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-ink">Repeated FAQ Cache</h3>
                <p className="text-sm text-muted">
                  Optional feature: answers to frequently repeated guest questions can be cached to save AI cost. The current bot version does not fill this list on its own, so it stays empty unless the FAQ cache is enabled in the bot.
                </p>
              </div>
              <button
                onClick={handleClearAllCache}
                disabled={cacheItems.length === 0}
                className="rounded-lg border border-red-500/30 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/15 transition disabled:opacity-50 self-start sm:self-center shrink-0"
              >
                Clear Entire Cache
              </button>
            </div>
          </div>

          <ErrorNotice message={cacheError} />

          <div className="card overflow-hidden">
            {cacheLoading ? (
              <div className="flex h-48 items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : cacheItems.length === 0 ? (
              <div className="p-12 text-center text-muted">
                <Database className="mx-auto h-12 w-12 text-muted mb-3" />
                <p className="text-lg font-medium text-muted">FAQ Cache is empty</p>
                <p className="text-sm mt-1">No repetitive questions have been cached by the bot yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-line bg-surface2">
                    <tr>
                      <th className="table-th w-2/5">Cached Question</th>
                      <th className="table-th w-2/5">Cached Answer</th>
                      <th className="table-th w-24 text-center">Hits</th>
                      <th className="table-th w-36">Last Activity</th>
                      <th className="table-th w-28 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {cacheItems.map((c) => (
                      <tr key={c.id} className="hover:bg-surface2/50 text-xs">
                        <td className="table-td py-3.5">
                          <div className="font-medium text-ink max-w-md truncate" title={c.original_question}>
                            {c.original_question}
                          </div>
                          <div className="text-[10px] text-muted max-w-md truncate">
                            Norm: {c.normalized_question}
                          </div>
                        </td>
                        <td className="table-td py-3.5">
                          <div className="text-ink/80 max-w-md truncate" title={c.answer}>
                            {c.answer}
                          </div>
                        </td>
                        <td className="table-td text-center font-semibold text-brand py-3.5">
                          {c.ask_count}
                        </td>
                        <td className="table-td text-muted py-3.5">
                          {formatTimestamp(c.updated_at, 'dd MMM HH:mm')}
                        </td>
                        <td className="table-td text-right py-3.5">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleConvertCache(c)}
                              className="rounded bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand hover:bg-brand-soft border border-brand/20"
                              title="Add this FAQ permanently to trained knowledge base"
                            >
                              Train AI
                            </button>
                            <button
                              onClick={() => handleDeleteCache(c.id)}
                              className="rounded p-1 text-muted hover:bg-danger/15 hover:text-danger border border-transparent"
                              title="Delete cache item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {dbTableMissing ? (
            <div className="card p-6 border-amber-500/30 bg-amber-500/5 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-md font-semibold text-ink">Database Table Missing</h4>
                  <p className="text-sm text-ink/80">
                    The <code className="text-brand bg-base px-1 py-0.5 rounded border border-line">bot_settings</code> table is missing from your Supabase instance. Please execute the following SQL query in your **Supabase SQL Editor** to initialize the table:
                  </p>
                </div>
              </div>
              <pre className="input font-mono text-xs bg-base overflow-x-auto p-4 border-line leading-relaxed text-ink/80 select-all">
{`CREATE TABLE IF NOT EXISTS bot_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  gemini_api_key TEXT,
  gemini_api_key_2 TEXT,
  gemini_api_key_3 TEXT,
  groq_api_key TEXT,
  active_provider TEXT DEFAULT 'gemini',
  brand_forward_number TEXT,
  api_errors JSONB DEFAULT '{}',
  hybrid_config TEXT DEFAULT 'all',
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Seed the settings row. Add your API keys afterwards in Dashboard > Settings
-- (never paste real keys into SQL or source code).
INSERT INTO bot_settings (id, active_provider)
VALUES (1, 'gemini')
ON CONFLICT (id) DO NOTHING;`}
              </pre>
              <div className="flex justify-end pt-2">
                <button onClick={fetchSettings} className="btn-primary flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Check Again
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-6 max-w-2xl space-y-6">
              <div className="border-b border-line pb-4">
                <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-brand" />
                  Configure AI Providers
                </h3>
                <p className="text-xs text-muted mt-1">
                  Define credentials and provider preferences. Keys are stored securely in Supabase and retrieved dynamically by the bot backend.
                </p>
              </div>

              {settingsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : (
                <form onSubmit={handleSaveSettings} className="space-y-5">
                  {settingsError && (
                    <div className="text-xs text-danger bg-red-500/5 border border-red-500/10 p-3 rounded-lg flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {settingsError}
                    </div>
                  )}

                  {/* API Health & Error Monitor */}
                  <div className="p-4 rounded-xl border border-line bg-surface2/30 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-ink/80">
                      <Activity className="h-4 w-4 text-success" />
                      API Endpoint Health Status
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { id: 'gemini_1', name: 'Gemini Key 1 (Primary 33%)', key: settingsForm.gemini_api_key },
                        { id: 'gemini_2', name: 'Gemini Key 2 (Primary 33%)', key: settingsForm.gemini_api_key_2 },
                        { id: 'groq', name: 'Groq API Key (Primary 33%)', key: settingsForm.groq_api_key },
                        { id: 'gemini_3', name: 'Gemini Key 3 (Fallback)', key: settingsForm.gemini_api_key_3 },
                      ].map((api) => {
                        const errInfo = settingsForm.api_errors?.[api.id];
                        const isConfigured = !!api.key;
                        const status = !isConfigured 
                          ? 'Unconfigured' 
                          : errInfo 
                            ? 'Failed' 
                            : 'Healthy';

                        return (
                          <div 
                            key={api.id} 
                            className={`p-2.5 rounded-lg border text-[11px] ${
                              status === 'Healthy' 
                                ? 'bg-emerald-500/5 border-emerald-500/10 text-success' 
                                : status === 'Failed'
                                  ? 'bg-red-500/5 border-red-500/10 text-danger font-medium'
                                  : 'bg-slate-500/5 border-line text-muted'
                            }`}
                          >
                            <div className="flex justify-between items-center gap-1.5">
                              <span className="font-semibold">{api.name}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                status === 'Healthy' 
                                  ? 'bg-success/10' 
                                  : status === 'Failed'
                                    ? 'bg-danger/10 text-danger'
                                    : 'bg-slate-500/10'
                              }`}>
                                {status}
                              </span>
                            </div>
                            {status === 'Failed' && errInfo && (
                              <div className="mt-1.5 text-[10px] text-danger/80 font-mono bg-danger/8 p-1.5 rounded border border-red-900/20 whitespace-pre-wrap break-all">
                                {errInfo.error}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-ink/80">Active LLM Provider</label>
                    <select
                      className="input"
                      value={settingsForm.active_provider}
                      onChange={(e) => setSettingsForm({ ...settingsForm, active_provider: e.target.value })}
                    >
                      <option value="gemini">Google Gemini (Model: gemini-1.5-flash)</option>
                      <option value="groq">Groq Llama (Model: Llama-3.3-70b-versatile)</option>
                      <option value="hybrid">Hybrid 3-Way Split (33% Groq / 33% Gemini 1 / 33% Gemini 2)</option>
                    </select>
                  </div>

                  {settingsForm.active_provider === 'hybrid' && (
                    <div className="space-y-1 p-3 rounded-lg border border-brand/15 bg-brand/5">
                      <label className="block text-xs font-semibold text-brand">Hybrid Load Balancing Mode</label>
                      <select
                        className="input"
                        value={settingsForm.hybrid_config}
                        onChange={(e) => setSettingsForm({ ...settingsForm, hybrid_config: e.target.value })}
                      >
                        <option value="all">3-Way Split: 33% Groq / 33% Gemini Key 1 / 33% Gemini Key 2</option>
                        <option value="gemini_1_2">2-Way Split: 50% Gemini Key 1 / 50% Gemini Key 2</option>
                        <option value="gemini_1_groq">2-Way Split: 50% Gemini Key 1 / 50% Groq API</option>
                        <option value="gemini_2_groq">2-Way Split: 50% Gemini Key 2 / 50% Groq API</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-1 relative">
                    <label className="block text-xs font-semibold text-ink/80">Google Gemini API Key 1</label>
                    <div className="relative">
                      <input
                        type={showGeminiKey ? 'text' : 'password'}
                        className="input pr-10 font-mono text-xs"
                        placeholder="Enter Google Gemini API Key 1"
                        value={settingsForm.gemini_api_key}
                        onChange={(e) => setSettingsForm({ ...settingsForm, gemini_api_key: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-3 top-2.5 text-muted hover:text-ink"
                      >
                        {showGeminiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="block text-xs font-semibold text-ink/80">Google Gemini API Key 2 (A/B Routing)</label>
                    <div className="relative">
                      <input
                        type={showGeminiKey2 ? 'text' : 'password'}
                        className="input pr-10 font-mono text-xs"
                        placeholder="Enter Google Gemini API Key 2 (Optional)"
                        value={settingsForm.gemini_api_key_2 || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, gemini_api_key_2: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey2(!showGeminiKey2)}
                        className="absolute right-3 top-2.5 text-muted hover:text-ink"
                      >
                        {showGeminiKey2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="block text-xs font-semibold text-ink/80">Google Gemini API Key 3 (A/B Routing)</label>
                    <div className="relative">
                      <input
                        type={showGeminiKey3 ? 'text' : 'password'}
                        className="input pr-10 font-mono text-xs"
                        placeholder="Enter Google Gemini API Key 3 (Optional)"
                        value={settingsForm.gemini_api_key_3 || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, gemini_api_key_3: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiKey3(!showGeminiKey3)}
                        className="absolute right-3 top-2.5 text-muted hover:text-ink"
                      >
                        {showGeminiKey3 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 relative">
                    <label className="block text-xs font-semibold text-ink/80">Groq API Key</label>
                    <div className="relative">
                      <input
                        type={showGroqKey ? 'text' : 'password'}
                        className="input pr-10 font-mono text-xs"
                        placeholder="Enter Groq API Key"
                        value={settingsForm.groq_api_key}
                        onChange={(e) => setSettingsForm({ ...settingsForm, groq_api_key: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowGroqKey(!showGroqKey)}
                        className="absolute right-3 top-2.5 text-muted hover:text-ink"
                      >
                        {showGroqKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 relative pt-2 border-t border-line/40">
                    <label className="block text-xs font-semibold text-ink/80">Confirm with your login password</label>
                    <input
                      type="password"
                      className="input font-mono text-xs border-danger/20 focus:border-danger"
                      placeholder="Re-enter your login password to update keys"
                      value={securityPassword}
                      onChange={(e) => setSecurityPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={fetchSettings}
                      className="btn-ghost"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      Save API Credentials
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Q&A Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-6 space-y-4 shadow-2xl border-brand/20">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-xl font-semibold text-ink flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand" />
                Add Training Q&A Pair
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded p-1 text-muted hover:bg-surface2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-ink/80">Question</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="e.g. What are the check-in and check-out times?"
                  value={addForm.question}
                  onChange={(e) => setAddForm({ ...addForm, question: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-ink/80">Approved Answer</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder="e.g. Check-in is at 3:00 PM and check-out is at 11:00 AM."
                  value={addForm.answer}
                  onChange={(e) => setAddForm({ ...addForm, answer: e.target.value })}
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-ink/80 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  className="rounded border-line bg-surface2 text-brand focus:ring-brand"
                  checked={addForm.makeLive}
                  onChange={(e) => setAddForm({ ...addForm, makeLive: e.target.checked })}
                />
                Approve instantly for both admins (make live in knowledge base)
              </label>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Training Pair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Q&A Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/70 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-6 space-y-4 shadow-2xl border-brand/20">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display text-xl font-semibold text-ink flex items-center gap-2">
                <Pencil className="h-4 w-4 text-brand" />
                Edit Training Entry
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="rounded p-1 text-muted hover:bg-surface2 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-ink/80">Question</label>
                <textarea
                  className="input min-h-[80px]"
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-ink/80">Answer</label>
                <textarea
                  className="input min-h-[100px]"
                  value={editForm.answer}
                  onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-sm font-semibold text-ink/80">Status & Approvals</label>
                <div className="grid grid-cols-2 gap-3 bg-base/60 p-3 rounded-lg border border-line">
                  <label className="flex items-center gap-2 text-xs text-ink/80 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-line bg-surface2 text-brand focus:ring-brand"
                      checked={editForm.approved_admin1}
                      onChange={(e) => setEditForm({ ...editForm, approved_admin1: e.target.checked, is_violation: e.target.checked ? false : editForm.is_violation })}
                    />
                    Admin 1 Approved
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink/80 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-line bg-surface2 text-brand focus:ring-brand"
                      checked={editForm.approved_admin2}
                      onChange={(e) => setEditForm({ ...editForm, approved_admin2: e.target.checked, is_violation: e.target.checked ? false : editForm.is_violation })}
                    />
                    Admin 2 Approved
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink/80 cursor-pointer col-span-2 pt-1.5 border-t border-line">
                    <input
                      type="checkbox"
                      className="rounded border-line bg-surface2 text-brand focus:ring-brand"
                      checked={editForm.is_violation}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        is_violation: e.target.checked,
                        approved_admin1: e.target.checked ? false : editForm.approved_admin1,
                        approved_admin2: e.target.checked ? false : editForm.approved_admin2,
                      })}
                    />
                    <span className="text-danger font-medium">Policy Violation</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
