import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Feather,
  BookOpen,
  Upload,
  PlusCircle,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  CheckCircle,
  FileText,
  Sparkles,
  HelpCircle,
  Image as ImageIcon,
  Copy,
  LayoutDashboard
} from 'lucide-react';

export default function WriterStudioPage({ editWorkId, onNavigate, onOpenAuth }) {
  const { user, penNames, activePenName, selectActivePenName } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'settings', 'preview'
  const [myWorks, setMyWorks] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Work Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('short_story'); // short_story, poem, thought
  const [selectedPenNameId, setSelectedPenNameId] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genres, setGenres] = useState(['Drama']);
  const [status, setStatus] = useState('ongoing'); // ongoing, completed, on_hiatus
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // Chapters State
  const [chapters, setChapters] = useState([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [chapterTitle, setChapterTitle] = useState('Chapter 1');
  const [chapterContent, setChapterContent] = useState('');
  const [chapterIsPublished, setChapterIsPublished] = useState(true);

  // Document Upload State
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const editorTextareaRef = useRef(null);

  // Fetch author's other works for fast manuscript switching
  useEffect(() => {
    if (user) {
      apiRequest('/works/mine').then(res => setMyWorks(res || [])).catch(() => {});
    }
  }, [user]);

  // Ctrl+S / Cmd+S shortcut for instant saving
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveWork(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, selectedPenNameId, chapterTitle, chapterContent, isPublished, editWorkId]);

  const availableGenres = [
    'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Horror',
    'Science Fiction', 'Drama', 'Adventure', 'Historical Fiction',
    'Poetry', 'Non-fiction'
  ];

  const coverPresets = [
    { label: 'Gothic Sea', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80' },
    { label: 'Ancient Alchemical', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80' },
    { label: 'Nocturnal Sky', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80' },
    { label: 'Deep Space', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80' },
    { label: 'Tokyo Rain', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80' },
    { label: 'Victorian Manor', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80' }
  ];

  // Set default pen name
  useEffect(() => {
    if (activePenName) {
      setSelectedPenNameId(activePenName.id);
    } else if (penNames.length > 0) {
      setSelectedPenNameId(penNames[0].id);
    }
  }, [activePenName, penNames]);

  // Load existing work if edit mode
  useEffect(() => {
    if (editWorkId) {
      setLoading(true);
      apiRequest(`/works/${editWorkId}`)
        .then(async (res) => {
          const w = res.work;
          setTitle(w.title);
          setCategory(w.category);
          setSelectedPenNameId(w.pen_name_id);
          setSynopsis(w.synopsis || '');
          setGenres(w.genres || []);
          setStatus(w.status || 'ongoing');
          setCoverUrl(w.cover_url || '');
          setIsPublished(w.is_published === 1);

          if (res.chapters && res.chapters.length > 0) {
            // Fetch content for first chapter
            const firstChapRes = await apiRequest(`/chapters/${res.chapters[0].id}`);
            setChapters(res.chapters);
            setActiveChapterIndex(0);
            setChapterTitle(firstChapRes.chapter.title);
            setChapterContent(firstChapRes.chapter.content);
            setChapterIsPublished(firstChapRes.chapter.is_published === 1);
          }
        })
        .catch(err => {
          console.error(err);
          alert('Failed to load work: ' + err.message);
        })
        .finally(() => setLoading(false));
    } else {
      // New work initial setup
      setChapters([
        { id: 'draft-1', chapter_number: 1, title: 'Chapter 1', is_published: 1 }
      ]);
      setChapterTitle('Chapter 1');
      setChapterContent('');
    }
  }, [editWorkId]);

  // Handle switching active chapter
  const handleSelectChapter = async (index) => {
    if (index === activeChapterIndex) return;

    // Save current active chapter in local state
    const updated = [...chapters];
    updated[activeChapterIndex] = {
      ...updated[activeChapterIndex],
      title: chapterTitle,
      content: chapterContent,
      is_published: chapterIsPublished ? 1 : 0
    };
    setChapters(updated);

    const target = updated[index];
    setActiveChapterIndex(index);
    setChapterTitle(target.title || `Chapter ${index + 1}`);

    if (target.content !== undefined) {
      setChapterContent(target.content);
      setChapterIsPublished(target.is_published === 1);
    } else if (target.id && !target.id.startsWith('draft-')) {
      // Fetch chapter content from server
      try {
        const cRes = await apiRequest(`/chapters/${target.id}`);
        setChapterContent(cRes.chapter.content);
        setChapterIsPublished(cRes.chapter.is_published === 1);
      } catch (err) {
        console.error(err);
      }
    } else {
      setChapterContent('');
    }
  };

  // Add new chapter
  const handleAddChapter = () => {
    const nextNum = chapters.length + 1;
    const newCh = {
      id: `draft-${Date.now()}`,
      chapter_number: nextNum,
      title: category === 'poem' ? `Poem ${nextNum}` : `Chapter ${nextNum}`,
      content: '',
      is_published: 1
    };
    const updated = [...chapters, newCh];
    setChapters(updated);
    setActiveChapterIndex(updated.length - 1);
    setChapterTitle(newCh.title);
    setChapterContent('');
    setChapterIsPublished(true);
  };

  // Delete chapter
  const handleDeleteChapter = async (index) => {
    if (chapters.length <= 1) {
      alert('A work must have at least one chapter or piece.');
      return;
    }
    const target = chapters[index];
    if (confirm(`Are you sure you want to delete "${target.title}"?`)) {
      if (target.id && !target.id.startsWith('draft-')) {
        await apiRequest(`/chapters/${target.id}`, { method: 'DELETE' });
      }
      const updated = chapters.filter((_, i) => i !== index).map((c, i) => ({
        ...c,
        chapter_number: i + 1
      }));
      setChapters(updated);
      const nextIdx = Math.max(0, index - 1);
      setActiveChapterIndex(nextIdx);
      setChapterTitle(updated[nextIdx].title);
      setChapterContent(updated[nextIdx].content || '');
    }
  };

  // Move chapter up / down
  const handleMoveChapter = (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const copy = [...chapters];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    const reordered = copy.map((c, i) => ({ ...c, chapter_number: i + 1 }));
    setChapters(reordered);
    setActiveChapterIndex(targetIndex);

    // If already saved on server, persist reorder
    if (editWorkId) {
      const ids = reordered.filter(c => !c.id.startsWith('draft-')).map(c => c.id);
      if (ids.length === reordered.length) {
        apiRequest('/chapters/reorder', {
          method: 'POST',
          body: JSON.stringify({ work_id: editWorkId, ordered_chapter_ids: ids })
        }).catch(console.error);
      }
    }
  };

  // Duplicate Chapter with 1 click
  const handleDuplicateChapter = (index) => {
    const target = chapters[index];
    const newNum = chapters.length + 1;
    const newTitle = `${target.title || 'Chapter'} (Copy)`;
    const newContent = index === activeChapterIndex ? chapterContent : (target.content || '');
    const newCh = {
      id: `draft-${Date.now()}`,
      chapter_number: newNum,
      title: newTitle,
      content: newContent,
      is_published: 0
    };
    const updated = [...chapters, newCh];
    setChapters(updated);
    setActiveChapterIndex(updated.length - 1);
    setChapterTitle(newTitle);
    setChapterContent(newContent);
    setChapterIsPublished(false);
  };

  // Document Upload Handler (.docx, .doc, .pdf, .txt)
  const handleDocumentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('document', file);

    try {
      const res = await apiRequest('/upload/document', {
        method: 'POST',
        body: formData
      });

      if (!title) {
        setTitle(res.title);
      }
      if (!chapterTitle || chapterTitle === 'Chapter 1') {
        setChapterTitle(res.title || 'Chapter 1');
      }
      setChapterContent(res.content);
      alert(`Manuscript successfully extracted! (${res.wordCount} words imported into editor)`);
    } catch (err) {
      alert('Document parsing failed: ' + err.message);
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  // Cover Image Upload Handler
  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await apiRequest('/upload/image?type=cover', {
        method: 'POST',
        body: formData
      });
      setCoverUrl(res.url);
    } catch (err) {
      alert('Cover upload failed: ' + err.message);
    }
  };

  // Formatting buttons helper
  const insertFormatting = (prefix, suffix = '') => {
    const textarea = editorTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.substring(start, end);

    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const nextVal = current.substring(0, start) + replacement + current.substring(end);
    setChapterContent(nextVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 50);
  };

  // Save / Publish Work
  const handleSaveWork = async (publishImmediately) => {
    if (!user) {
      onOpenAuth('login');
      return;
    }

    if (!title.trim()) {
      alert('Please enter a work title.');
      setActiveTab('settings');
      return;
    }

    if (!selectedPenNameId) {
      alert('Please select an author pen name.');
      setActiveTab('settings');
      return;
    }

    if (!chapterContent.trim()) {
      alert('Chapter content cannot be empty.');
      setActiveTab('editor');
      return;
    }

    setSaving(true);
    try {
      const publishVal = publishImmediately ? 1 : (isPublished ? 1 : 0);

      if (editWorkId) {
        // 1. Update work metadata
        await apiRequest(`/works/${editWorkId}`, {
          method: 'PUT',
          body: JSON.stringify({
            pen_name_id: selectedPenNameId,
            title,
            category,
            synopsis,
            cover_url: coverUrl,
            genres,
            status,
            is_published: publishVal
          })
        });

        // 2. Save active chapter
        const curChap = chapters[activeChapterIndex];
        if (curChap.id && !curChap.id.startsWith('draft-')) {
          await apiRequest(`/chapters/${curChap.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              title: chapterTitle,
              content: chapterContent,
              is_published: publishImmediately ? 1 : (chapterIsPublished ? 1 : 0)
            })
          });
        } else {
          await apiRequest('/chapters', {
            method: 'POST',
            body: JSON.stringify({
              work_id: editWorkId,
              title: chapterTitle,
              content: chapterContent,
              is_published: publishImmediately ? 1 : (chapterIsPublished ? 1 : 0),
              chapter_number: activeChapterIndex + 1
            })
          });
        }

        alert(publishImmediately ? 'Work published successfully!' : 'Changes saved.');
        onNavigate(`/book/${editWorkId}`);
      } else {
        // Create new work with Chapter 1
        const res = await apiRequest('/works', {
          method: 'POST',
          body: JSON.stringify({
            pen_name_id: selectedPenNameId,
            title,
            category,
            synopsis,
            cover_url: coverUrl,
            genres,
            status,
            is_published: publishVal,
            initial_chapter: {
              title: chapterTitle,
              content: chapterContent,
              is_published: publishVal
            }
          })
        });

        alert(publishImmediately ? 'Work published immediately to Indigo!' : 'Draft saved to database.');
        onNavigate(`/book/${res.work.id}`);
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save work: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-24 p-8 text-center bg-white rounded-3xl border border-[#DDD5C5]">
        <Feather className="w-12 h-12 text-[#1E1B4B] mx-auto mb-3" />
        <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">Writer Studio</h2>
        <p className="text-sm text-gray-600 mt-2">
          Sign in or create a free author account to publish short stories, poetry, and thoughtful reflections with zero fees.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="mt-5 px-6 py-2.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81]"
        >
          Sign In to Write
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Studio Control Header */}
      <div className="bg-white border border-[#E5DECF] rounded-3xl p-4 sm:p-6 mb-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#7A759C]">
              INDIGO WRITER STUDIO
            </span>

            {/* Quick Manuscript Switcher */}
            {myWorks.length > 0 && (
              <select
                value={editWorkId || 'new'}
                onChange={(e) => {
                  if (e.target.value === 'new') onNavigate('/write');
                  else onNavigate(`/write?edit=${e.target.value}`);
                }}
                className="py-0.5 px-2 bg-[#FAF7F2] border border-[#DDD5C5] rounded-lg text-[11px] font-semibold text-[#1E1B4B] cursor-pointer"
              >
                <option value="new">+ Start Fresh Story</option>
                {myWorks.map(w => (
                  <option key={w.id} value={w.id}>
                    Edit: {w.title} ({w.pen_name})
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => onNavigate('/studio')}
              className="flex items-center gap-1 text-[11px] font-bold text-[#312E81] hover:underline ml-2"
            >
              <LayoutDashboard className="w-3 h-3" />
              <span>Creator Dashboard</span>
            </button>
          </div>

          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#1E1B4B]">
            {title ? title : 'Untitled Manuscript'}
          </h1>
          <p className="text-xs text-[#5D597E] mt-0.5">
            Publishing as:{' '}
            <span className="font-semibold text-[#1E1B4B]">
              {penNames.find(p => p.id === selectedPenNameId)?.name || 'Default Author'}
            </span>
            <span className="ml-2 text-gray-400 font-mono text-[11px]">(Press Ctrl+S to save)</span>
          </p>
        </div>

        {/* Tab & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex bg-[#FAF7F2] p-1 rounded-xl border border-[#E5DECF] text-xs font-medium">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'editor' ? 'bg-[#1E1B4B] text-white font-semibold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Writing Editor
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'settings' ? 'bg-[#1E1B4B] text-white font-semibold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Book Details & Cover
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'preview' ? 'bg-[#1E1B4B] text-white font-semibold' : 'text-gray-600 hover:text-black'
              }`}
            >
              Reader Preview
            </button>
          </div>

          <button
            onClick={() => handleSaveWork(false)}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-xl border border-gray-300 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            onClick={() => handleSaveWork(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#1E1B4B] hover:bg-[#312E81] text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Publish Immediately</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      {activeTab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chapter Management Sidebar */}
          <div className="lg:col-span-3 bg-white border border-[#E5DECF] rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h3 className="font-serif text-sm font-bold text-[#1E1B4B]">
                Chapters & Sections
              </h3>
              <button
                onClick={handleAddChapter}
                className="p-1 rounded-lg text-[#1E1B4B] hover:bg-gray-100"
                title="Add Chapter"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Chapters list */}
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {chapters.map((ch, idx) => (
                <div
                  key={ch.id || idx}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                    activeChapterIndex === idx
                      ? 'bg-[#F4EFE6] border-[#1E1B4B] font-bold text-[#1E1B4B]'
                      : 'bg-[#FAF7F2] border-transparent hover:border-gray-200 text-gray-700'
                  }`}
                >
                  <button
                    onClick={() => handleSelectChapter(idx)}
                    className="flex-1 text-left truncate mr-2"
                  >
                    <span className="opacity-60 mr-1.5">{idx + 1}.</span>
                    <span>{ch.title || `Chapter ${idx + 1}`}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveChapter(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMoveChapter(idx, 'down')}
                      disabled={idx === chapters.length - 1}
                      className="p-1 text-gray-400 hover:text-black disabled:opacity-20"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDuplicateChapter(idx)}
                      className="p-1 text-gray-400 hover:text-[#1E1B4B]"
                      title="Duplicate Chapter"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {chapters.length > 1 && (
                      <button
                        onClick={() => handleDeleteChapter(idx)}
                        className="p-1 text-red-400 hover:text-red-700"
                        title="Delete Chapter"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Import Document Button */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <input
                type="file"
                ref={docInputRef}
                onChange={handleDocumentUpload}
                accept=".docx,.doc,.pdf,.txt,.md"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                disabled={uploadingDoc}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#FAF7F2] border border-dashed border-[#DDD5C5] text-xs font-semibold text-[#1E1B4B] hover:bg-[#F0EBE1] transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingDoc ? 'Extracting Text...' : 'Upload Document (.docx, .pdf, .txt)'}</span>
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-1.5">
                Automatically parses existing files into editable chapters
              </p>
            </div>
          </div>

          {/* Main Writing Canvas */}
          <div className="lg:col-span-9 bg-white border border-[#E5DECF] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col min-h-[650px]">
            {/* Chapter Title Bar */}
            <div className="mb-4">
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder={category === 'thought' ? "Title (e.g. Reflections on Rilke's Solitude / Thoughts on Midnight Rain)" : "Chapter Title (e.g. Chapter 1: The Gathering Storm)"}
                className="w-full font-display text-xl sm:text-2xl font-bold text-[#1E1B4B] border-b border-[#E5DECF] pb-2 focus:outline-none focus:border-[#1E1B4B]"
              />
            </div>

            {/* Thought Guidance Banner */}
            {category === 'thought' && (
              <div className="mb-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs">
                <span className="text-xl select-none">💡</span>
                <div>
                  <strong className="font-semibold block text-amber-900 mb-0.5">Thought & Quote Breakdown Mode</strong>
                  <span>Share what's on your mind, or highlight your favorite quote using the <strong>Quote</strong> button below to break down what it means to you and why you love it.</span>
                </div>
              </div>
            )}

            {/* Formatting Toolbar */}
            <div className="py-2 px-3 bg-[#FAF7F2] border border-[#E5DECF] rounded-xl mb-4 flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => insertFormatting('### ', '\n')}
                className="px-2 py-1 font-bold rounded hover:bg-white border border-transparent hover:border-gray-200"
                title="Heading"
              >
                H3
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="px-2 py-1 font-bold rounded hover:bg-white border border-transparent hover:border-gray-200"
                title="Bold"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*')}
                className="px-2 py-1 italic font-serif rounded hover:bg-white border border-transparent hover:border-gray-200"
                title="Italic"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> ', '\n')}
                className="px-2 py-1 font-mono rounded hover:bg-white border border-transparent hover:border-gray-200"
                title="Quote"
              >
                Quote
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n---\n')}
                className="px-2 py-1 rounded hover:bg-white border border-transparent hover:border-gray-200"
                title="Divider"
              >
                Divider
              </button>

              <div className="h-4 w-px bg-gray-300 mx-1" />

              <span className="text-[11px] text-gray-500 font-mono ml-auto">
                {chapterContent.length} characters • {chapterContent ? chapterContent.split(/\s+/).filter(Boolean).length : 0} words
              </span>
            </div>

            {/* Textarea Content Editor */}
            <textarea
              ref={editorTextareaRef}
              value={chapterContent}
              onChange={(e) => setChapterContent(e.target.value)}
              placeholder={
                category === 'thought'
                  ? "Share your thoughts on anything, or share your favorite quote and break down what you think about it or why you love it..."
                  : "Begin writing your narrative, stanza, or dialogue here..."
              }
              className="flex-1 w-full font-serif-body text-base text-[#1E1B4B] leading-relaxed p-4 bg-[#FAF7F2]/50 border border-[#E5DECF] rounded-2xl focus:outline-none focus:border-[#1E1B4B] focus:bg-white resize-y min-h-[450px]"
            />
          </div>
        </div>
      )}

      {/* Book Metadata & Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 sm:p-10 shadow-xs max-w-4xl mx-auto space-y-6">
          <h2 className="font-display text-xl font-bold text-[#1E1B4B] pb-3 border-b border-gray-100">
            Book Information & Publication Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
                Work Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Silent Promise"
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-sm font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
              >
                <option value="short_story">Short Story</option>
                <option value="poem">Poetry</option>
                <option value="thought">Thought (Musings, Quotes & Breakdowns)</option>
              </select>
            </div>

            {/* Pen Name Selector */}
            <div>
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
                Author Pen Name *
              </label>
              <select
                value={selectedPenNameId}
                onChange={(e) => setSelectedPenNameId(e.target.value)}
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-sm font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
              >
                {penNames.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-sm font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
              >
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="on_hiatus">On Hiatus</option>
              </select>
            </div>
          </div>

          {/* Genres (Multi-Select) */}
          <div>
            <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-2">
              Genres (Select All That Apply)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map((g) => {
                const selected = genres.includes(g);
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => {
                      if (selected) {
                        setGenres(genres.filter(item => item !== g));
                      } else {
                        setGenres([...genres, g]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                      selected
                        ? 'bg-[#1E1B4B] text-white border-[#1E1B4B]'
                        : 'bg-[#FAF7F2] text-gray-700 border-gray-200 hover:border-gray-400'
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
            <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-1.5">
              Synopsis / Description
            </label>
            <textarea
              rows={4}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Introduce your story to readers in the Indigo bookstore discovery sections..."
              className="w-full p-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs sm:text-sm text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
            />
          </div>

          {/* Book Cover Presentation */}
          <div>
            <label className="block text-xs font-bold text-[#1E1B4B] uppercase tracking-wider mb-2">
              Book Cover Image
            </label>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              {coverUrl ? (
                <div className="w-28 aspect-[3/4] rounded-xl overflow-hidden border shadow-sm">
                  <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-28 aspect-[3/4] rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                  No Cover
                </div>
              )}

              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="Paste cover image URL..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={coverInputRef}
                    onChange={handleCoverUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg"
                  >
                    Upload Custom Image
                  </button>
                </div>

                {/* Cover presets */}
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Or choose a literary preset:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {coverPresets.map((p) => (
                      <button
                        type="button"
                        key={p.label}
                        onClick={() => setCoverUrl(p.url)}
                        className="px-2.5 py-1 text-[11px] bg-gray-50 border border-gray-200 rounded-lg hover:border-[#1E1B4B]"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reader Preview Tab */}
      {activeTab === 'preview' && (
        <div className="bg-[#FAF7F2] border border-[#E5DECF] rounded-3xl p-8 max-w-3xl mx-auto shadow-sm">
          <div className="text-center pb-8 border-b border-black/10 mb-8">
            <span className="text-xs uppercase tracking-widest text-[#6B6694] block">
              {title || 'Untitled Manuscript'}
            </span>
            <h2 className="font-display text-3xl font-bold text-[#1E1B4B] mt-1">
              {chapterTitle || 'Chapter 1'}
            </h2>
            <span className="text-xs italic text-[#55507E] mt-1 block">
              By {penNames.find(p => p.id === selectedPenNameId)?.name || 'Author'}
            </span>
          </div>

          <div className="font-serif-body text-base leading-loose space-y-6 text-[#1E1B4B]">
            {chapterContent ? (
              chapterContent.split(/\n\s*\n/).map((p, idx) => (
                <p key={idx}>{p}</p>
              ))
            ) : (
              <p className="text-gray-400 italic text-center py-10">
                No content written yet. Switch to the Writing Editor to begin your narrative.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
