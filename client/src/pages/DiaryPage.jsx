import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Globe,
  Calendar,
  Edit,
  Trash2,
  PlusCircle,
  Search,
  Share2,
  Check,
  Sparkles,
  BookOpen,
  Feather,
  CloudSun,
  Eye,
  ArrowLeft,
  X,
  FileText
} from 'lucide-react';

export default function DiaryPage({ onNavigate, onOpenAuth, initialEntryId = null }) {
  const { user, penNames = [], loading: authLoading } = useAuth();

  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ total: 0, privateCount: 0, sharedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [activeEntryId, setActiveEntryId] = useState(initialEntryId);

  // Filters
  const [search, setSearch] = useState('');
  const [privacyFilter, setPrivacyFilter] = useState('all'); // 'all', 'private', 'shared'

  // Edit / Create State
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form Fields
  const [formId, setFormId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMood, setFormMood] = useState('Contemplative');
  const [formWeather, setFormWeather] = useState('');
  const [formIsPublic, setFormIsPublic] = useState(0); // 0 = Private by default
  const [formPenNameId, setFormPenNameId] = useState('');

  const moodPresets = [
    'Contemplative', 'Peaceful', 'Melancholic', 'Inspired',
    'Nostalgic', 'Restless', 'Grateful', 'Solitary', 'Wanderlust'
  ];

  const weatherPresets = [
    'Autumn Rain', 'Midnight Quiet', 'Morning Sun', 'Overcast & Cold',
    'Candlelight', 'Stormy Winds', 'Golden Hour'
  ];

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (privacyFilter !== 'all') params.append('privacy', privacyFilter);

      const res = await apiRequest(`/diary/mine?${params.toString()}`);
      const list = res.entries || [];
      setEntries(list);
      if (res.stats) setStats(res.stats);

      // Set active entry if none chosen
      if (list.length > 0) {
        if (!activeEntryId || !list.some(e => e.id === activeEntryId)) {
          setActiveEntryId(list[0].id);
        }
      } else {
        setActiveEntryId(null);
      }
    } catch (err) {
      console.error('Failed to load diary entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEntries();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, privacyFilter]);

  const activeEntry = entries.find(e => e.id === activeEntryId) || null;

  // Initialize new entry form
  const handleStartNewEntry = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormId(null);
    setFormTitle('');
    setFormContent('');
    setFormDate(today); // Automatically date stamped to today, but editable
    setFormMood('Contemplative');
    setFormWeather('Midnight Quiet');
    setFormIsPublic(0); // Private by default
    setFormPenNameId(penNames.length > 0 ? penNames[0].id : '');
    setIsCreatingNew(true);
    setIsEditing(true);
  };

  // Start editing existing entry
  const handleStartEdit = (entry) => {
    setFormId(entry.id);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormDate(entry.entry_date || new Date().toISOString().split('T')[0]);
    setFormMood(entry.mood || 'Contemplative');
    setFormWeather(entry.weather || '');
    setFormIsPublic(entry.is_public ? 1 : 0);
    setFormPenNameId(entry.pen_name_id || (penNames.length > 0 ? penNames[0].id : ''));
    setIsCreatingNew(false);
    setIsEditing(true);
  };

  // Save entry (Create or Update)
  const handleSaveEntry = async (e) => {
    e.preventDefault();
    if (!formContent.trim()) {
      alert('Please write some content for your diary entry.');
      return;
    }

    setSaving(true);
    try {
      if (formId) {
        // Update existing
        await apiRequest(`/diary/${formId}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: formTitle,
            content: formContent,
            entry_date: formDate,
            mood: formMood,
            weather: formWeather,
            is_public: formIsPublic,
            pen_name_id: formPenNameId || null
          })
        });
      } else {
        // Create new (Private by default)
        const res = await apiRequest('/diary', {
          method: 'POST',
          body: JSON.stringify({
            title: formTitle,
            content: formContent,
            entry_date: formDate,
            mood: formMood,
            weather: formWeather,
            is_public: formIsPublic,
            pen_name_id: formPenNameId || null
          })
        });
        if (res.entry) {
          setActiveEntryId(res.entry.id);
        }
      }
      setIsEditing(false);
      setIsCreatingNew(false);
      fetchEntries();
    } catch (err) {
      alert('Failed to save entry: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Quick 1-click toggle privacy
  const handleTogglePrivacy = async (entryId) => {
    try {
      const res = await apiRequest(`/diary/${entryId}/toggle-privacy`, { method: 'PATCH' });
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, is_public: res.is_public } : e));
      if (res.is_public === 1) {
        setStats(prev => ({
          ...prev,
          privateCount: Math.max(0, prev.privateCount - 1),
          sharedCount: prev.sharedCount + 1
        }));
      } else {
        setStats(prev => ({
          ...prev,
          privateCount: prev.privateCount + 1,
          sharedCount: Math.max(0, prev.sharedCount - 1)
        }));
      }
    } catch (err) {
      alert('Failed to change privacy: ' + err.message);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId, title) => {
    if (!confirm(`Are you sure you want to delete this diary entry? This cannot be undone.`)) return;
    try {
      await apiRequest(`/diary/${entryId}`, { method: 'DELETE' });
      const remaining = entries.filter(e => e.id !== entryId);
      setEntries(remaining);
      if (activeEntryId === entryId) {
        setActiveEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
      setStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      alert('Failed to delete entry: ' + err.message);
    }
  };

  // Copy shareable reader link
  const handleCopyLink = (entryId) => {
    const url = `${window.location.origin}/diary/read/${entryId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  };

  // Not logged in view
  if (!user && !authLoading) {
    return (
      <div className="max-w-xl mx-auto my-24 p-8 sm:p-10 text-center bg-[#FFFDF9] rounded-3xl border border-[#DDD5C5] shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-[#1E1B4B]/10 text-[#1E1B4B] mx-auto mb-4 flex items-center justify-center">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="font-cinzel text-2xl font-bold text-[#1E1B4B]">Private Diary & Journal</h2>
        <p className="text-sm text-[#55507E] mt-2 font-serif-body leading-relaxed max-w-md mx-auto">
          Keep private, date-stamped reflections on your writing life and thoughts. Every entry is private by default and only visible to you, unless you explicitly choose to share it.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="mt-6 px-6 py-2.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81] shadow-xs transition-colors"
        >
          Sign In to Open Diary
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner & Journal Identity */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#E5DECF]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A759C]">
              PRIVATE JOURNAL
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
              <Lock className="w-3 h-3 text-stone-600" /> Private by default
            </span>
          </div>
          <h1 className="font-cinzel text-3xl font-extrabold text-[#1E1B4B]">
            My Diary Entries
          </h1>
          <p className="text-xs sm:text-sm text-[#5D597E] mt-0.5 font-serif-body">
            Date-stamped personal chronicles, reflections, and midnight notes. Private to your account unless you choose to share.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={handleStartNewEntry}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1E1B4B] hover:bg-[#312E81] text-white text-xs font-semibold rounded-2xl shadow-xs transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Write New Entry</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-2xl">
        <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5DECF] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Entries</span>
          <p className="font-display text-xl font-bold text-[#1E1B4B] mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5DECF] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Private Entries
          </span>
          <p className="font-display text-xl font-bold text-stone-800 mt-0.5">{stats.privateCount}</p>
        </div>
        <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E5DECF] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Shared Publicly
          </span>
          <p className="font-display text-xl font-bold text-indigo-900 mt-0.5">{stats.sharedCount}</p>
        </div>
      </div>

      {/* Main Dual-Pane Journal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Entries List & Search */}
        <div className="lg:col-span-4 bg-[#FFFDF9] border border-[#E5DECF] rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5DECF]">
            <span className="font-serif text-xs font-bold text-[#1E1B4B] uppercase tracking-wider">
              Chronological Index
            </span>
            <span className="text-[11px] font-mono text-gray-400">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries or moods..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B] focus:outline-none focus:bg-white"
            />
          </div>

          {/* Privacy Filter Tabs */}
          <div className="flex bg-[#FAF7F2] p-1 rounded-xl border border-[#E5DECF] text-[11px] font-medium">
            <button
              onClick={() => setPrivacyFilter('all')}
              className={`flex-1 py-1 rounded-lg transition-colors ${
                privacyFilter === 'all' ? 'bg-[#1E1B4B] text-white font-semibold' : 'text-gray-600 hover:text-black'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPrivacyFilter('private')}
              className={`flex-1 py-1 rounded-lg transition-colors ${
                privacyFilter === 'private' ? 'bg-[#1E1B4B] text-white font-semibold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Private 🔒
            </button>
            <button
              onClick={() => setPrivacyFilter('shared')}
              className={`flex-1 py-1 rounded-lg transition-colors ${
                privacyFilter === 'shared' ? 'bg-[#1E1B4B] text-white font-semibold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Shared 🌐
            </button>
          </div>

          {/* Entries Sidebar List */}
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400 font-serif">
              Opening journal archives...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500 font-serif-body">No diary entries recorded yet.</p>
              <button
                onClick={handleStartNewEntry}
                className="text-xs font-semibold text-[#1E1B4B] hover:underline"
              >
                + Write your first entry
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1 divide-y divide-gray-100">
              {entries.map((entry) => {
                const isSelected = entry.id === activeEntryId;
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      setActiveEntryId(entry.id);
                      setIsEditing(false);
                      setIsCreatingNew(false);
                    }}
                    className={`pt-2.5 pb-2.5 px-3 rounded-2xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50/70 border border-amber-200/80 shadow-2xs'
                        : 'hover:bg-[#FAF7F2] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono text-gray-500 font-medium">
                        {entry.entry_date}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        entry.is_public
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}>
                        {entry.is_public ? <><Globe className="w-2.5 h-2.5" /> Shared</> : <><Lock className="w-2.5 h-2.5" /> Private</>}
                      </span>
                    </div>

                    <h4 className="font-display text-xs font-bold text-[#1E1B4B] truncate">
                      {entry.title}
                    </h4>

                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 font-serif-body">
                      {entry.content}
                    </p>

                    {entry.mood && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="text-[10px] bg-white border border-[#DDD5C5] text-stone-600 px-1.5 py-0.5 rounded-md font-medium">
                          {entry.mood}
                        </span>
                        {entry.weather && (
                          <span className="text-[10px] text-gray-400">
                            • {entry.weather}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Clean Reader View OR In-Place Editor */}
        <div className="lg:col-span-8 bg-[#FFFDF9] border border-[#E5DECF] rounded-3xl p-6 sm:p-10 shadow-xs min-h-[580px]">
          {isEditing ? (
            /* ================= EDIT / CREATE FORM ================= */
            <form onSubmit={handleSaveEntry} className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5DECF]">
                <h3 className="font-display text-lg font-bold text-[#1E1B4B]">
                  {isCreatingNew ? 'New Diary Entry' : 'Edit Diary Entry'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreatingNew(false);
                  }}
                  className="p-1 rounded-lg text-gray-400 hover:text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title & Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1">
                    Entry Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Rain on the Skylight / Quiet Observations"
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-sm font-semibold text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-600" /> Entry Date *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs font-mono font-bold text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
                    title="Automatically date-stamped, but you can change this to any past or specific date"
                  />
                </div>
              </div>

              {/* Mood & Weather Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1">
                    Mood / Mental State
                  </label>
                  <input
                    type="text"
                    value={formMood}
                    onChange={(e) => setFormMood(e.target.value)}
                    placeholder="e.g. Contemplative, Solitary"
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] mb-2 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1">
                    {moodPresets.slice(0, 5).map(m => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setFormMood(m)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border ${
                          formMood === m ? 'bg-[#1E1B4B] text-white border-[#1E1B4B]' : 'bg-white text-stone-600 border-gray-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1">
                    Atmosphere / Weather
                  </label>
                  <input
                    type="text"
                    value={formWeather}
                    onChange={(e) => setFormWeather(e.target.value)}
                    placeholder="e.g. Autumn Rain, Midnight Silence"
                    className="w-full p-2 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] mb-2 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1">
                    {weatherPresets.slice(0, 4).map(w => (
                      <button
                        type="button"
                        key={w}
                        onClick={() => setFormWeather(w)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border ${
                          formWeather === w ? 'bg-[#1E1B4B] text-white border-[#1E1B4B]' : 'bg-white text-stone-600 border-gray-200'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider">
                    Diary Entry Content *
                  </label>
                  <span className="text-[11px] font-mono text-gray-400">
                    {formContent.length} chars • {formContent ? formContent.split(/\s+/).filter(Boolean).length : 0} words
                  </span>
                </div>
                <textarea
                  rows={14}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Dear journal... record your honest thoughts, observations, struggles, or quiet victories here..."
                  className="w-full font-serif-body text-base text-[#1E1B4B] leading-relaxed p-4 bg-[#FAF7F2]/60 border border-[#DDD5C5] rounded-2xl focus:outline-none focus:bg-white resize-y"
                />
              </div>

              {/* Privacy Setting: Private by Default */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-900">Privacy Control</span>
                    <span className="text-[11px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full">
                      {formIsPublic ? '🌐 Shared Publicly' : '🔒 Private by Default'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 font-serif-body">
                    {formIsPublic
                      ? 'This entry will be readable by visitors via your shared link or community tab.'
                      : 'This entry is strictly private to your account. No other user can see it.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormIsPublic(0)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      formIsPublic === 0
                        ? 'bg-[#1E1B4B] text-white border-[#1E1B4B]'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" /> Private
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormIsPublic(1)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      formIsPublic === 1
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" /> Share
                  </button>
                </div>
              </div>

              {/* If Public, choose pen name */}
              {formIsPublic === 1 && penNames.length > 0 && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-950">Attributed Pen Name:</span>
                  <select
                    value={formPenNameId}
                    onChange={(e) => setFormPenNameId(e.target.value)}
                    className="p-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900"
                  >
                    {penNames.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DECF]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreatingNew(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81] shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Diary Entry'}</span>
                </button>
              </div>
            </form>
          ) : activeEntry ? (
            /* ================= CLEAN, SERENE READER VIEW ================= */
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Header Action Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E5DECF]">
                <div className="flex items-center gap-2">
                  {/* 1-Click Privacy Toggle */}
                  <button
                    onClick={() => handleTogglePrivacy(activeEntry.id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                      activeEntry.is_public
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-stone-100 text-stone-800 border-stone-300 hover:bg-stone-200'
                    }`}
                    title="Click to toggle Private vs Shared"
                  >
                    {activeEntry.is_public ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Shared Publicly</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-stone-600" />
                        <span>Private Entry</span>
                      </>
                    )}
                  </button>

                  {activeEntry.is_public === 1 && (
                    <button
                      onClick={() => handleCopyLink(activeEntry.id)}
                      className="inline-flex items-center gap-1 text-xs text-indigo-700 hover:underline px-2 py-1"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(activeEntry)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#DDD5C5] text-stone-800 hover:bg-[#FAF7F2] shadow-2xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteEntry(activeEntry.id, activeEntry.title)}
                    className="p-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Journal Sheet Content */}
              <article className="prose prose-stone max-w-none">
                {/* Automatically Date-stamped Header */}
                <div className="space-y-1">
                  <time className="text-xs font-mono font-bold uppercase tracking-widest text-[#7A759C] block">
                    {formatDateDisplay(activeEntry.entry_date)}
                  </time>
                  <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#1E1B4B] tracking-tight">
                    {activeEntry.title}
                  </h2>
                </div>

                {/* Mood & Atmosphere Badges */}
                {(activeEntry.mood || activeEntry.weather) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                    {activeEntry.mood && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80">
                        Mood: {activeEntry.mood}
                      </span>
                    )}
                    {activeEntry.weather && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-50 text-slate-800 border border-slate-200">
                        {activeEntry.weather}
                      </span>
                    )}
                    {activeEntry.pen_name && activeEntry.is_public === 1 && (
                      <span className="text-xs font-medium text-gray-500 ml-auto">
                        Written by <strong className="text-black font-semibold">{activeEntry.pen_name}</strong>
                      </span>
                    )}
                  </div>
                )}

                {/* Entry Body Paragraphs */}
                <div className="font-serif-body text-base sm:text-lg text-[#25224A] leading-relaxed pt-4 border-t border-[#F0EBE0] space-y-4 whitespace-pre-wrap">
                  {activeEntry.content}
                </div>
              </article>
            </div>
          ) : (
            /* Empty State when no entry is selected */
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-gray-400 font-serif-body space-y-3">
              <BookOpen className="w-12 h-12 text-[#1E1B4B]/20" />
              <p className="text-sm">Select an entry from the index, or write a fresh reflection.</p>
              <button
                onClick={handleStartNewEntry}
                className="px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl"
              >
                + Write Entry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
