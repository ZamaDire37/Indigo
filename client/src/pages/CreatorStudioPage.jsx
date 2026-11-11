import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Feather,
  BookOpen,
  PlusCircle,
  Edit,
  Trash2,
  Copy,
  Eye,
  Star,
  MessageSquare,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Check,
  ExternalLink,
  Sparkles,
  Filter,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function CreatorStudioPage({ onNavigate, onOpenAuth }) {
  const { user, penNames = [], activePenName, loading: authLoading } = useAuth();

  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPenName, setFilterPenName] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedWorkId, setExpandedWorkId] = useState(null);

  // Quick Edit Modal state
  const [quickEditWork, setQuickEditWork] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('short_story');
  const [editPenNameId, setEditPenNameId] = useState('');
  const [editStatus, setEditStatus] = useState('ongoing');
  const [editSynopsis, setEditSynopsis] = useState('');
  const [editGenres, setEditGenres] = useState([]);
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Quick Add Chapter Modal state
  const [quickAddChapterWorkId, setQuickAddChapterWorkId] = useState(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [newChapterPublished, setNewChapterPublished] = useState(true);
  const [submittingNewChapter, setSubmittingNewChapter] = useState(false);

  const availableGenres = [
    'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Horror',
    'Science Fiction', 'Drama', 'Adventure', 'Historical Fiction',
    'Poetry', 'Non-fiction'
  ];

  const fetchMyWorks = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/works/mine');
      const list = Array.isArray(data) ? data : (data?.works || []);
      setWorks(list);
    } catch (err) {
      console.error('Failed to load my works:', err);
      setWorks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyWorks();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // Quick toggle publication status (Live vs Draft)
  const handleTogglePublish = async (workId, currentPublished) => {
    const nextPublished = currentPublished ? 0 : 1;
    try {
      await apiRequest(`/works/${workId}/quick-status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_published: nextPublished })
      });
      setWorks(prev => {
        const arr = Array.isArray(prev) ? prev : (prev?.works || []);
        return arr.map(w => w.id === workId ? { ...w, is_published: nextPublished } : w);
      });
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Quick update story status (ongoing, completed, on_hiatus)
  const handleUpdateStatus = async (workId, newStatus) => {
    try {
      await apiRequest(`/works/${workId}/quick-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      setWorks(prev => {
        const arr = Array.isArray(prev) ? prev : (prev?.works || []);
        return arr.map(w => w.id === workId ? { ...w, status: newStatus } : w);
      });
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Duplicate work as draft
  const handleDuplicateWork = async (workId) => {
    if (!confirm('Create a new draft duplicate of this work and all its chapters?')) return;
    try {
      const res = await apiRequest(`/works/${workId}/duplicate`, { method: 'POST' });
      alert(res.message);
      fetchMyWorks();
    } catch (err) {
      alert('Failed to duplicate: ' + err.message);
    }
  };

  // Delete work
  const handleDeleteWork = async (workId, title) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}" and all its chapters? This cannot be undone.`)) return;
    try {
      await apiRequest(`/works/${workId}`, { method: 'DELETE' });
      setWorks(prev => {
        const arr = Array.isArray(prev) ? prev : (prev?.works || []);
        return arr.filter(w => w.id !== workId);
      });
    } catch (err) {
      alert('Failed to delete work: ' + err.message);
    }
  };

  // Open Quick Edit Modal
  const openQuickEdit = (w) => {
    setQuickEditWork(w);
    setEditTitle(w.title);
    setEditCategory(w.category);
    setEditPenNameId(w.pen_name_id);
    setEditStatus(w.status || 'ongoing');
    setEditSynopsis(w.synopsis || '');
    setEditGenres(Array.isArray(w.genres) ? w.genres : []);
    setEditCoverUrl(w.cover_url || '');
  };

  // Submit Quick Edit Modal
  const handleSaveQuickEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !quickEditWork) return;

    setSubmittingEdit(true);
    try {
      await apiRequest(`/works/${quickEditWork.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          pen_name_id: editPenNameId,
          title: editTitle,
          category: editCategory,
          status: editStatus,
          synopsis: editSynopsis,
          genres: editGenres,
          cover_url: editCoverUrl
        })
      });
      setQuickEditWork(null);
      fetchMyWorks();
    } catch (err) {
      alert('Failed to save changes: ' + err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Quick Add Chapter
  const handleQuickAddChapterSubmit = async (e) => {
    e.preventDefault();
    if (!newChapterTitle.trim() || !newChapterContent.trim() || !quickAddChapterWorkId) return;

    setSubmittingNewChapter(true);
    try {
      await apiRequest('/chapters', {
        method: 'POST',
        body: JSON.stringify({
          work_id: quickAddChapterWorkId,
          title: newChapterTitle,
          content: newChapterContent,
          is_published: newChapterPublished ? 1 : 0
        })
      });
      setQuickAddChapterWorkId(null);
      setNewChapterTitle('');
      setNewChapterContent('');
      fetchMyWorks();
    } catch (err) {
      alert('Failed to add chapter: ' + err.message);
    } finally {
      setSubmittingNewChapter(false);
    }
  };

  // Quick toggle chapter publish
  const handleToggleChapterPublish = async (workId, chapterId, currentPublished) => {
    try {
      const nextVal = currentPublished ? 0 : 1;
      await apiRequest(`/chapters/${chapterId}/quick-publish`, {
        method: 'PATCH',
        body: JSON.stringify({ is_published: nextVal })
      });
      setWorks(prev => {
        const arr = Array.isArray(prev) ? prev : (prev?.works || []);
        return arr.map(w => {
          if (w.id === workId) {
            return {
              ...w,
              chapters: (w.chapters || []).map(c => c.id === chapterId ? { ...c, is_published: nextVal } : c)
            };
          }
          return w;
        });
      });
    } catch (err) {
      alert('Failed to toggle chapter status: ' + err.message);
    }
  };

  // Quick delete chapter
  const handleDeleteChapter = async (workId, chapterId, title) => {
    if (!confirm(`Delete chapter "${title}"?`)) return;
    try {
      await apiRequest(`/chapters/${chapterId}`, { method: 'DELETE' });
      fetchMyWorks();
    } catch (err) {
      alert('Failed to delete chapter: ' + err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#6B6694]">
        <Feather className="w-10 h-10 animate-bounce mb-3 text-[#1E1B4B]" />
        <p className="font-serif text-sm">Opening your creator workspace...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-24 p-8 text-center bg-white rounded-3xl border border-[#DDD5C5]">
        <Feather className="w-12 h-12 text-[#1E1B4B] mx-auto mb-3" />
        <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">Creator Studio</h2>
        <p className="text-sm text-gray-600 mt-2">
          Sign in or create an account to manage your publications, edit manuscripts, and publish new chapters.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="mt-5 px-6 py-2.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81]"
        >
          Sign In
        </button>
      </div>
    );
  }

  const worksList = Array.isArray(works) ? works : (works?.works || []);

  // Filter works
  const filteredWorks = worksList.filter(w => {
    if (filterPenName !== 'all' && w.pen_name_id !== filterPenName) return false;
    if (filterCategory !== 'all' && w.category !== filterCategory) return false;
    if (filterStatus === 'published' && w.is_published !== 1) return false;
    if (filterStatus === 'drafts' && w.is_published !== 0) return false;
    if (filterStatus === 'ongoing' && w.status !== 'ongoing') return false;
    if (filterStatus === 'completed' && w.status !== 'completed') return false;
    if (filterStatus === 'on_hiatus' && w.status !== 'on_hiatus') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (w.title || '').toLowerCase().includes(q) || (w.synopsis && w.synopsis.toLowerCase().includes(q));
    }
    return true;
  });

  const totalReads = worksList.reduce((sum, w) => sum + (w.reads_count || 0), 0);
  const totalPublished = worksList.filter(w => w.is_published === 1).length;
  const totalDrafts = worksList.filter(w => w.is_published === 0).length;

  return (
    <div className="min-h-screen py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner & Creator Stats */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A759C]">
            CREATOR DASHBOARD
          </span>
          <h1 className="font-cinzel text-3xl font-extrabold text-[#1E1B4B]">
            My Publications & Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#5D597E] mt-0.5 font-serif-body">
            Manage stories, serialized chapters, pen names, and reader engagement across your author catalog.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/write')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1E1B4B] hover:bg-[#312E81] text-white text-xs font-semibold rounded-2xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Publication</span>
          </button>

          <button
            onClick={() => onNavigate('/pen-names')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#DDD5C5] hover:bg-[#FAF7F2] text-xs font-semibold text-[#1E1B4B] rounded-2xl transition-colors shadow-2xs"
          >
            <Feather className="w-3.5 h-3.5 text-[#5A5488]" />
            <span>Manage Pen Names</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5DECF] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Works</span>
          <p className="font-display text-2xl font-bold text-[#1E1B4B] mt-1">{worksList.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5DECF] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Live Published</span>
          <p className="font-display text-2xl font-bold text-emerald-800 mt-1">{totalPublished}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5DECF] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Drafts in Progress</span>
          <p className="font-display text-2xl font-bold text-amber-800 mt-1">{totalDrafts}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5DECF] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Total Reader Reads</span>
          <p className="font-display text-2xl font-bold text-[#1E1B4B] mt-1">{Number(totalReads).toLocaleString()}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E5DECF] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Pen Name Filter */}
          <select
            value={filterPenName}
            onChange={(e) => setFilterPenName(e.target.value)}
            className="py-1.5 px-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs font-semibold text-[#1E1B4B] focus:outline-none"
          >
            <option value="all">All Pen Names ({worksList.length})</option>
            {penNames.map(p => (
              <option key={p.id} value={p.id}>
                Pen Name: {p.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="py-1.5 px-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs font-semibold text-[#1E1B4B] focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="short_story">Short Stories</option>
            <option value="poem">Poetry</option>
            <option value="thought">Thoughts & Quotes</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-1.5 px-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs font-semibold text-[#1E1B4B] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="published">Public Only</option>
            <option value="drafts">Drafts Only</option>
            <option value="ongoing">Ongoing Series</option>
            <option value="completed">Completed Works</option>
            <option value="on_hiatus">On Hiatus</option>
          </select>
        </div>

        {/* Search input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your works..."
            className="w-full py-1.5 px-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:bg-white"
          />
        </div>
      </div>

      {/* Publications List */}
      {loading ? (
        <div className="py-24 text-center text-gray-500 font-serif">
          Opening your creator studio...
        </div>
      ) : filteredWorks.length === 0 ? (
        <div className="bg-white/70 border border-dashed border-[#DDD5C5] rounded-3xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-[#1E1B4B]">No publications found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {worksList.length === 0
              ? 'You have not published or drafted any stories yet. Start writing your first literary work!'
              : 'No works match the selected filters.'}
          </p>
          <button
            onClick={() => onNavigate('/write')}
            className="mt-4 px-5 py-2.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81]"
          >
            Create New Publication
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWorks.map((work) => {
            const isExpanded = expandedWorkId === work.id;

            return (
              <div
                key={work.id}
                className="bg-white border border-[#E5DECF] rounded-3xl shadow-xs overflow-hidden transition-all hover:border-[#1E1B4B]/30"
              >
                {/* Main Card Header / Summary */}
                <div className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Cover Thumbnail */}
                    <div
                      onClick={() => onNavigate(`/book/${work.id}`)}
                      className="w-16 sm:w-20 aspect-[3/4] rounded-xl overflow-hidden bg-[#ECE6DA] shrink-0 cursor-pointer shadow-2xs border border-gray-200"
                    >
                      {work.cover_url ? (
                        <img src={work.cover_url} alt={work.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#1E1B4B] text-white flex items-center justify-center text-[9px] p-1 text-center font-bold">
                          {work.title}
                        </div>
                      )}
                    </div>

                    {/* Metadata & Quick Toggles */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Live vs Draft Toggle Button */}
                        <button
                          onClick={() => handleTogglePublish(work.id, work.is_published)}
                          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase transition-colors ${
                            work.is_published
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title="Click to toggle Public / Draft"
                        >
                          {work.is_published ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{work.is_published ? 'Public (Live)' : 'Private Draft'}</span>
                        </button>

                        {/* Status Switcher Dropdown */}
                        <select
                          value={work.status || 'ongoing'}
                          onChange={(e) => handleUpdateStatus(work.id, e.target.value)}
                          className="py-0.5 px-2 rounded-md text-[10px] font-bold bg-[#FAF7F2] border border-[#DDD5C5] text-[#1E1B4B] cursor-pointer"
                        >
                          <option value="ongoing">Ongoing Series</option>
                          <option value="completed">Completed</option>
                          <option value="on_hiatus">On Hiatus</option>
                        </select>

                        <span className="text-[10px] uppercase font-bold text-[#7A759C] bg-gray-100 px-2 py-0.5 rounded">
                          {work.category === 'thought' ? 'Thought' : work.category === 'poem' ? 'Poem' : 'Short Story'}
                        </span>
                      </div>

                      <h3
                        onClick={() => onNavigate(`/book/${work.id}`)}
                        className="font-display text-lg font-bold text-[#1E1B4B] hover:text-[#312E81] cursor-pointer truncate"
                      >
                        {work.title}
                      </h3>

                      <p className="text-xs text-[#55507E] font-medium mt-0.5">
                        Author Pen Name: <span className="font-semibold text-[#1E1B4B]">{work.pen_name}</span>
                        {work.updated_at && (
                          <span className="text-gray-400 ml-2">
                            • Last updated {new Date(work.updated_at).toLocaleDateString()}
                          </span>
                        )}
                      </p>

                      {/* Stats badges */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1 font-medium">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                          <strong>{work.total_chapters_count || 0}</strong> Chapters ({work.draft_chapters_count || 0} drafts)
                        </span>

                        <span className="flex items-center gap-1 font-medium">
                          <Eye className="w-3.5 h-3.5 text-indigo-700" />
                          <strong>{Number(work.reads_count || 0).toLocaleString()}</strong> Reads
                        </span>

                        <span className="flex items-center gap-1 text-amber-700 font-medium">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <strong>{work.avg_rating || 'New'}</strong>/5 ({work.ratings_count || 0})
                        </span>

                        <span className="flex items-center gap-1 font-medium">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-700" />
                          <strong>{work.comments_count || 0}</strong> Discussions
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick CRUD Action Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                    {/* Write in Studio */}
                    <button
                      onClick={() => onNavigate(`/write?edit=${work.id}`)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81] transition-colors shadow-2xs"
                      title="Open full chapter writing canvas"
                    >
                      <Feather className="w-3.5 h-3.5" />
                      <span>Writing Studio</span>
                    </button>

                    {/* Quick Edit Metadata */}
                    <button
                      onClick={() => openQuickEdit(work)}
                      className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl transition-colors"
                      title="Edit book metadata, cover, or synopsis"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Info</span>
                    </button>

                    {/* Quick Add Chapter */}
                    <button
                      onClick={() => {
                        setQuickAddChapterWorkId(work.id);
                        setNewChapterTitle(`Chapter ${(work.total_chapters_count || 0) + 1}`);
                        setNewChapterContent('');
                        setNewChapterPublished(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold rounded-xl transition-colors"
                      title="Quickly add next chapter"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Chapter</span>
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => handleDuplicateWork(work.id)}
                      className="p-2 text-gray-500 hover:text-black rounded-xl hover:bg-gray-100 transition-colors"
                      title="Duplicate as new draft"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteWork(work.id, work.title)}
                      className="p-2 text-rose-500 hover:text-rose-700 rounded-xl hover:bg-rose-50 transition-colors"
                      title="Delete publication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand Chapters Accordion */}
                    <button
                      onClick={() => setExpandedWorkId(isExpanded ? null : work.id)}
                      className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                        isExpanded ? 'bg-[#F4EFE6] border-[#1E1B4B] text-[#1E1B4B]' : 'bg-white border-gray-200 text-gray-700'
                      }`}
                      title="View & manage individual chapters"
                    >
                      <span>Chapters ({work.chapters?.length || 0})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Chapters Drawer / Fast Management */}
                {isExpanded && (
                  <div className="bg-[#FAF7F2] border-t border-[#E5DECF] p-5 sm:p-6 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-[#E5DECF]">
                      <span className="font-serif text-xs font-bold text-[#1E1B4B] uppercase tracking-wider">
                        Chapters List & Quick Management
                      </span>

                      <button
                        onClick={() => {
                          setQuickAddChapterWorkId(work.id);
                          setNewChapterTitle(`Chapter ${(work.chapters?.length || 0) + 1}`);
                          setNewChapterContent('');
                          setNewChapterPublished(true);
                        }}
                        className="text-xs font-semibold text-[#312E81] hover:underline flex items-center gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add Chapter to {work.title}</span>
                      </button>
                    </div>

                    {(!work.chapters || work.chapters.length === 0) ? (
                      <p className="text-xs text-gray-500 py-3 italic">
                        No chapters recorded yet. Click "+ Chapter" to add Chapter 1.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {work.chapters.map((ch, cIdx) => (
                          <div
                            key={ch.id}
                            className="bg-white p-3 rounded-xl border border-[#E5DECF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-gray-400 font-bold w-6">
                                {ch.chapter_number < 10 ? `0${ch.chapter_number}` : ch.chapter_number}
                              </span>
                              <div>
                                <span className="font-serif-body font-bold text-[#1E1B4B] block">
                                  {ch.title}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {ch.char_count || 0} characters • Updated {new Date(ch.updated_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {/* Chapter Draft / Publish toggle */}
                              <button
                                onClick={() => handleToggleChapterPublish(work.id, ch.id, ch.is_published)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ch.is_published
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ch.is_published ? 'Published' : 'Draft'}
                              </button>

                              {/* Read chapter */}
                              <button
                                onClick={() => onNavigate(`/read/${work.id}/${ch.id}`)}
                                className="p-1.5 text-gray-500 hover:text-black rounded"
                                title="Read chapter"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit in studio */}
                              <button
                                onClick={() => onNavigate(`/write?edit=${work.id}`)}
                                className="p-1.5 text-indigo-700 hover:text-indigo-900 rounded"
                                title="Edit in Studio"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete chapter */}
                              {work.chapters.length > 1 && (
                                <button
                                  onClick={() => handleDeleteChapter(work.id, ch.id, ch.title)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 rounded"
                                  title="Delete chapter"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK EDIT MODAL */}
      {quickEditWork && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-xl text-[#1E1B4B] mb-1">
              Quick Edit: {quickEditWork.title}
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Update publication information without entering the full chapter editor.
            </p>

            <form onSubmit={handleSaveQuickEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Work Title *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Pen Name *</label>
                  <select
                    value={editPenNameId}
                    onChange={(e) => setEditPenNameId(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl font-semibold"
                  >
                    {penNames.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl font-semibold"
                  >
                    <option value="short_story">Short Story</option>
                    <option value="poem">Poetry</option>
                    <option value="thought">Thought / Quote Breakdown</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl font-semibold"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="on_hiatus">On Hiatus</option>
                  </select>
                </div>
              </div>

              {/* Genres Selector */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1.5">Genres</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableGenres.map(g => {
                    const sel = editGenres.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => {
                          if (sel) setEditGenres(editGenres.filter(x => x !== g));
                          else setEditGenres([...editGenres, g]);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                          sel ? 'bg-[#1E1B4B] text-white border-[#1E1B4B]' : 'bg-[#FAF7F2] border-gray-200'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Synopsis */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Synopsis</label>
                <textarea
                  rows={3}
                  value={editSynopsis}
                  onChange={(e) => setEditSynopsis(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl"
                />
              </div>

              {/* Cover URL */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={editCoverUrl}
                  onChange={(e) => setEditCoverUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setQuickEditWork(null)}
                  className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81]"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD CHAPTER MODAL */}
      {quickAddChapterWorkId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-xl text-[#1E1B4B] mb-1">
              Add New Chapter
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Write and immediately add a new serialized chapter or draft piece.
            </p>

            <form onSubmit={handleQuickAddChapterSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Chapter Title *</label>
                <input
                  type="text"
                  required
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="e.g. Chapter 4: The Whispering Gallery"
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Content Prose *</label>
                <textarea
                  rows={8}
                  required
                  value={newChapterContent}
                  onChange={(e) => setNewChapterContent(e.target.value)}
                  placeholder="Write or paste your chapter manuscript here..."
                  className="w-full p-3 font-serif-body text-sm bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pubNow"
                  checked={newChapterPublished}
                  onChange={(e) => setNewChapterPublished(e.target.checked)}
                  className="rounded text-[#1E1B4B]"
                />
                <label htmlFor="pubNow" className="font-semibold text-gray-700">
                  Publish immediately (Uncheck to save as draft)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setQuickAddChapterWorkId(null)}
                  className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNewChapter}
                  className="px-5 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81]"
                >
                  {submittingNewChapter ? 'Adding...' : 'Add Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
