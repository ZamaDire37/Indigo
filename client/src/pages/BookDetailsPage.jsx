import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Eye,
  Star,
  MessageSquare,
  Clock,
  Bookmark,
  Share2,
  Headphones,
  Edit,
  PlusCircle,
  ShieldAlert,
  ChevronRight,
  Send,
  CornerDownRight,
  AlertTriangle,
  Check,
  Calendar,
  Globe,
  Lock,
  Trash2,
  Copy,
  LayoutDashboard
} from 'lucide-react';

export default function BookDetailsPage({ workId, onNavigate, onOpenAuth }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [comments, setComments] = useState([]);
  const [libraryStatus, setLibraryStatus] = useState(null);
  const [savingLibrary, setSavingLibrary] = useState(false);

  // New review form state
  const [userRating, setUserRating] = useState(5);
  const [userReviewText, setUserReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Comments state
  const [commentContent, setCommentContent] = useState('');
  const [commentIsSpoiler, setCommentIsSpoiler] = useState(false);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [revealedSpoilers, setRevealedSpoilers] = useState({});

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [reportDetails, setReportDetails] = useState('');
  const [reporting, setReporting] = useState(false);

  const fetchBookDetails = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/works/${workId}`);
      setData(res);
      setLibraryStatus(res.libraryStatus);
      if (res.userRating) {
        setUserRating(res.userRating.rating_val);
        setUserReviewText(res.userRating.review_text || '');
      }

      // Fetch reviews
      const revRes = await apiRequest(`/works/${workId}/ratings`);
      setReviews(revRes.reviews || []);
      setReviewStats(revRes.stats || null);

      // Fetch comments
      const commRes = await apiRequest(`/works/${workId}/comments`);
      setComments(commRes || []);
    } catch (err) {
      console.error('Failed to load book details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookDetails();
  }, [workId]);

  const handleUpdateLibrary = async (status) => {
    if (!user) {
      onOpenAuth('login');
      return;
    }
    setSavingLibrary(true);
    try {
      if (status === 'remove') {
        await apiRequest(`/reading/library/${workId}`, { method: 'DELETE' });
        setLibraryStatus(null);
      } else {
        await apiRequest('/reading/library', {
          method: 'POST',
          body: JSON.stringify({ work_id: workId, status })
        });
        setLibraryStatus(status);
      }
    } catch (err) {
      console.error('Library update failed:', err);
    } finally {
      setSavingLibrary(false);
    }
  };

  const handleStartReading = () => {
    if (!data?.chapters || data.chapters.length === 0) return;
    // If user has reading progress, open that chapter, else chapter 1
    const targetChapterId = data.readingProgress?.chapter_id || data.chapters[0].id;
    onNavigate(`/read/${data.work.id}/${targetChapterId}`);
  };

  const handleListenNow = () => {
    if (!data?.chapters || data.chapters.length === 0) return;
    const targetChapterId = data.readingProgress?.chapter_id || data.chapters[0].id;
    onNavigate(`/read/${data.work.id}/${targetChapterId}?autoplay=true`);
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth('login');
      return;
    }
    setSubmittingRating(true);
    try {
      await apiRequest(`/works/${workId}/rating`, {
        method: 'POST',
        body: JSON.stringify({
          rating: userRating,
          review_text: userReviewText
        })
      });
      // Refresh
      fetchBookDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth('login');
      return;
    }
    if (!commentContent.trim()) return;

    try {
      await apiRequest(`/works/${workId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: commentContent,
          is_spoiler: commentIsSpoiler
        })
      });
      setCommentContent('');
      setCommentIsSpoiler(false);
      // Refresh comments
      const commRes = await apiRequest(`/works/${workId}/comments`);
      setComments(commRes || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePostReply = async (parentId) => {
    if (!user) {
      onOpenAuth('login');
      return;
    }
    if (!replyContent.trim()) return;

    try {
      await apiRequest(`/works/${workId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          content: replyContent,
          parent_id: parentId
        })
      });
      setReplyContent('');
      setReplyingToId(null);
      // Refresh comments
      const commRes = await apiRequest(`/works/${workId}/comments`);
      setComments(commRes || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth('login');
      return;
    }
    setReporting(true);
    try {
      await apiRequest('/reports', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'work',
          target_id: workId,
          reason: reportReason,
          details: reportDetails
        })
      });
      alert('Report submitted for administrator review.');
      setReportModalOpen(false);
      setReportDetails('');
    } catch (err) {
      alert(err.message);
    } finally {
      setReporting(false);
    }
  };

  const toggleSpoilerReveal = (commentId) => {
    setRevealedSpoilers(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleAuthorTogglePublish = async () => {
    try {
      const nextPub = !data?.work?.is_published;
      await apiRequest(`/works/${workId}/quick-status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_published: nextPub })
      });
      fetchBookDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAuthorUpdateStatus = async (status) => {
    try {
      await apiRequest(`/works/${workId}/quick-status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      fetchBookDetails();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAuthorDuplicate = async () => {
    if (!confirm(`Duplicate "${data?.work?.title}" as a new draft manuscript?`)) return;
    try {
      const res = await apiRequest(`/works/${workId}/duplicate`, { method: 'POST' });
      alert('Manuscript duplicated successfully.');
      onNavigate(`/write?edit=${res.work.id}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAuthorDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${data?.work?.title}" and all its chapters? This cannot be undone.`)) return;
    try {
      await apiRequest(`/works/${workId}`, { method: 'DELETE' });
      alert('Publication deleted.');
      onNavigate('/studio');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#6B6694]">
        <BookOpen className="w-10 h-10 animate-bounce mb-3" />
        <p className="font-serif text-sm">Retrieving edition from the library shelves...</p>
      </div>
    );
  }

  if (!data?.work) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 text-center bg-white rounded-3xl border border-[#DDD5C5]">
        <h2 className="font-display text-xl font-bold text-[#1E1B4B]">Work not found</h2>
        <p className="text-xs text-gray-500 mt-2">This publication may have been removed or is currently a private draft.</p>
        <button
          onClick={() => onNavigate('/')}
          className="mt-4 px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl"
        >
          Return to Bookstore
        </button>
      </div>
    );
  }

  const { work, chapters = [], isOwner } = data;

  return (
    <div className="min-h-screen py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Creator Command Ribbon */}
      {isOwner && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border border-amber-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
              ✍️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Author Mode</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${work.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {work.is_published ? <><Globe className="w-3 h-3" /> Public</> : <><Lock className="w-3 h-3" /> Private Draft</>}
                </span>
              </div>
              <p className="text-xs text-amber-900/80">You own this work under pen name <strong className="font-semibold">{work.pen_name}</strong>.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status switcher */}
            <select
              value={work.status || 'ongoing'}
              onChange={(e) => handleAuthorUpdateStatus(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white text-stone-800 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="ongoing">Status: Ongoing</option>
              <option value="completed">Status: Completed</option>
              <option value="on_hiatus">Status: On Hiatus</option>
            </select>

            {/* Public/Draft toggle */}
            <button
              onClick={handleAuthorTogglePublish}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-xs transition-colors ${
                work.is_published
                  ? 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/60'
                  : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {work.is_published ? <><Lock className="w-3.5 h-3.5" /> Unpublish</> : <><Globe className="w-3.5 h-3.5" /> Publish Now</>}
            </button>

            {/* Open Writer Studio */}
            <button
              onClick={() => onNavigate(`/write?edit=${work.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1E1B4B] text-white hover:bg-[#2d2966] shadow-xs transition-colors"
            >
              <Edit className="w-3.5 h-3.5" /> Edit in Studio
            </button>

            {/* Duplicate */}
            <button
              onClick={handleAuthorDuplicate}
              title="Duplicate manuscript"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 shadow-xs transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>

            {/* Creator Studio Hub */}
            <button
              onClick={() => onNavigate('/studio')}
              title="Go to Creator Studio"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 shadow-xs transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </button>

            {/* Delete */}
            <button
              onClick={handleAuthorDelete}
              title="Delete this work"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {/* Book Information Hero Card */}
      <div className="bg-[#FFFDF9] border border-[#E5DECF] rounded-3xl p-6 sm:p-10 shadow-xs mb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Cover Column */}
          <div className="md:col-span-4 lg:col-span-3">
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-lg border border-[#E0D7C6] bg-[#ECE6DA]">
              {work.cover_url ? (
                <img
                  src={work.cover_url}
                  alt={work.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#232050] to-[#161436] text-[#FAF7F2]">
                  <BookOpen className="w-12 h-12 mb-3 opacity-60" />
                  <span className="font-display text-xl font-bold leading-tight">
                    {work.title}
                  </span>
                  <span className="text-xs text-indigo-200 mt-2">
                    By {work.pen_name}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action under cover for Owner */}
            {isOwner && (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => onNavigate(`/write?edit=${work.id}`)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Book & Chapters</span>
                </button>
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-between">
            <div>
              {/* Category & Status badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-[#1E1B4B] text-white">
                  {work.category === 'thought' ? 'Thought & Reflection' : work.category === 'poem' ? 'Poetry' : 'Short Story'}
                </span>

                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${
                  work.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : work.status === 'on_hiatus'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {work.status === 'ongoing' ? 'Ongoing Series' : work.status === 'completed' ? 'Completed Work' : 'On Hiatus'}
                </span>

                <span className="text-xs text-[#7A759C] ml-auto">
                  Published {new Date(work.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#1E1B4B] tracking-tight leading-tight uppercase">
                {work.title}
              </h1>

              {/* Author Pen Name (Clickable) */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-[#5D597E]">Written by</span>
                <button
                  onClick={() => onNavigate(`/author/${work.pen_name_id}`)}
                  className="font-serif-body text-base font-bold text-[#1E1B4B] hover:text-[#312E81] hover:underline"
                >
                  {work.pen_name}
                </button>
              </div>

              {/* Genre Tags */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {work.genres?.map((g) => (
                  <button
                    key={g}
                    onClick={() => onNavigate(`/discover?genre=${encodeURIComponent(g)}`)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-[#F2EDE2] text-[#3E3A67] hover:bg-[#E5DECF] transition-colors"
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Live Statistics Banner */}
              <div className="mt-5 py-3 px-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5] flex flex-wrap items-center gap-6 text-xs text-[#48446B]">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#67628E]" />
                  <span>
                    <strong className="text-sm font-bold text-[#1E1B4B]">{Number(work.reads_count || 0).toLocaleString()}</strong> Reads
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>
                    <strong className="text-sm font-bold text-[#1E1B4B]">{work.avg_rating || 'New'}</strong>/5 ({work.ratings_count || 0} reviews)
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-[#67628E]" />
                  <span>
                    <strong className="text-sm font-bold text-[#1E1B4B]">{work.comments_count || 0}</strong> Discussions
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#67628E]" />
                  <span>
                    <strong className="text-sm font-bold text-[#1E1B4B]">{chapters.length}</strong> {work.category === 'poem' ? 'Poems' : 'Chapters'}
                  </span>
                </div>
              </div>

              {/* Synopsis */}
              <div className="mt-6">
                <h3 className="font-serif text-sm font-bold text-[#1E1B4B] uppercase tracking-wider mb-2">
                  Synopsis
                </h3>
                <p className="font-serif-body text-sm sm:text-base text-[#383457] leading-relaxed whitespace-pre-line">
                  {work.synopsis || 'No synopsis provided.'}
                </p>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="mt-8 pt-6 border-t border-[#EFEAE0] flex flex-wrap items-center gap-3">
              {/* START READING BUTTON */}
              <button
                onClick={handleStartReading}
                disabled={chapters.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1E1B4B] text-[#FAF7F2] font-semibold text-sm hover:bg-[#312E81] transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <BookOpen className="w-4 h-4" />
                <span>
                  {data.readingProgress ? 'CONTINUE READING' : 'START READING'}
                </span>
              </button>

              {/* LISTEN WITH TEXT-TO-SPEECH */}
              <button
                onClick={handleListenNow}
                disabled={chapters.length === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#EFE9DC] text-[#1E1B4B] font-semibold text-sm hover:bg-[#E5DECDB0] border border-[#DDD5C5] transition-all disabled:opacity-50"
              >
                <Headphones className="w-4 h-4 text-[#4B4870]" />
                <span>LISTEN NOW</span>
              </button>

              {/* ADD TO LIBRARY DROPDOWN / SELECTOR */}
              <div className="relative">
                <select
                  value={libraryStatus || 'none'}
                  onChange={(e) => handleUpdateLibrary(e.target.value)}
                  disabled={savingLibrary}
                  className="py-3 px-4 rounded-2xl bg-white border border-[#DDD5C5] text-xs font-semibold text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B] cursor-pointer shadow-2xs"
                >
                  <option value="none">
                    {libraryStatus ? 'In Library (Change Shelf)' : '+ Add to Library'}
                  </option>
                  <option value="currently_reading">Currently Reading</option>
                  <option value="want_to_read">Want to Read</option>
                  <option value="completed">Completed</option>
                  <option value="saved">Saved Books</option>
                  {libraryStatus && <option value="remove">Remove from Library</option>}
                </select>
              </div>

              {/* Report work button */}
              <button
                onClick={() => setReportModalOpen(true)}
                className="ml-auto p-2.5 text-[#7A759C] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Report inappropriate content or infringement"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters / Table of Contents Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {/* Table of Contents */}
          <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[#1E1B4B]">
                  Table of Contents
                </h2>
                <p className="text-xs text-[#5D597E]">
                  {chapters.length} available {work.category === 'poem' ? 'pieces' : 'chapters'}
                </p>
              </div>

              {isOwner && (
                <button
                  onClick={() => onNavigate(`/write?edit=${work.id}&newChapter=true`)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1E1B4B] text-white text-xs font-semibold hover:bg-[#312E81]"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add New Chapter</span>
                </button>
              )}
            </div>

            {chapters.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center italic">
                No published chapters in this edition yet.
              </p>
            ) : (
              <div className="divide-y divide-[#EFEAE0]">
                {chapters.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => onNavigate(`/read/${work.id}/${ch.id}`)}
                    className="py-3.5 px-2 flex items-center justify-between hover:bg-[#FAF7F2] rounded-xl cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#7A759C] w-6">
                        {ch.chapter_number < 10 ? `0${ch.chapter_number}` : ch.chapter_number}
                      </span>
                      <div>
                        <h4 className="font-serif-body text-sm font-semibold text-[#1E1B4B] group-hover:text-[#312E81]">
                          {ch.title}
                        </h4>
                        <span className="text-[11px] text-[#7A759C]">
                          ~{Math.max(1, Math.round((ch.char_count || 1000) / 1000))} min read
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!ch.is_published && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                          Draft
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#9F9ABF] group-hover:text-[#1E1B4B] transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reader Discussions & Comments */}
          <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 sm:p-8 shadow-xs">
            <h2 className="font-display text-xl font-bold text-[#1E1B4B] mb-2">
              Reader Discussions & Theories
            </h2>
            <p className="text-xs text-[#5D597E] mb-6">
              Share your insights, question author motifs, or discuss plot progression with fellow readers.
            </p>

            {/* Comment Box */}
            <form onSubmit={handlePostComment} className="mb-8 p-4 rounded-2xl bg-[#FAF7F2] border border-[#DDD5C5]">
              <textarea
                rows={3}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={user ? "Write a comment or literary observation..." : "Sign in to join the conversation..."}
                disabled={!user}
                className="w-full p-3 bg-white border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
              />

              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-[#55507E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commentIsSpoiler}
                    onChange={(e) => setCommentIsSpoiler(e.target.checked)}
                    className="rounded text-[#1E1B4B]"
                  />
                  <span>Mark as spoiler</span>
                </label>

                <button
                  type="submit"
                  disabled={!user || !commentContent.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81] disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post Comment</span>
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center italic">
                  Be the first to leave a comment on this work.
                </p>
              ) : (
                comments.map((c) => {
                  const isSpoilerHidden = c.is_spoiler && !revealedSpoilers[c.id];

                  return (
                    <div key={c.id} className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE3D5]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1E1B4B] text-white flex items-center justify-center text-[10px] font-bold">
                            {c.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-[#1E1B4B]">{c.username}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {c.is_spoiler === 1 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                            Spoiler
                          </span>
                        )}
                      </div>

                      {/* Content with Spoiler Mask */}
                      {isSpoilerHidden ? (
                        <div
                          onClick={() => toggleSpoilerReveal(c.id)}
                          className="cursor-pointer p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between"
                        >
                          <span className="italic">This comment contains spoilers. Click to reveal.</span>
                          <AlertTriangle className="w-4 h-4 text-amber-700" />
                        </div>
                      ) : (
                        <p className="text-xs text-[#383457] leading-relaxed whitespace-pre-line">
                          {c.content}
                        </p>
                      )}

                      {/* Reply button */}
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-[#55507E]">
                        <button
                          onClick={() => setReplyingToId(replyingToId === c.id ? null : c.id)}
                          className="hover:text-[#1E1B4B] font-medium"
                        >
                          {replyingToId === c.id ? 'Cancel Reply' : 'Reply'}
                        </button>
                      </div>

                      {/* Reply Input */}
                      {replyingToId === c.id && (
                        <div className="mt-3 pl-4 border-l-2 border-[#DDD5C5]">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder={`Reply to @${c.username}...`}
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#DDD5C5] rounded-lg text-[#1E1B4B]"
                            />
                            <button
                              onClick={() => handlePostReply(c.id)}
                              className="px-3 py-1.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-lg hover:bg-[#312E81]"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Nested Replies */}
                      {c.replies && c.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-[#DDD5C5] space-y-2 pt-2">
                          {c.replies.map((r) => (
                            <div key={r.id} className="text-xs bg-white p-2.5 rounded-xl border border-gray-100">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-[#1E1B4B] text-[11px]">{r.username}</span>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(r.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-gray-700 text-xs leading-relaxed">{r.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Reader Reviews & Rating Submission */}
        <div className="lg:col-span-4 space-y-6">
          {/* Rate This Book Card */}
          <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 shadow-xs">
            <h3 className="font-display text-lg font-bold text-[#1E1B4B] mb-2">
              Reader Rating & Review
            </h3>
            <p className="text-xs text-[#5D597E] mb-4">
              Your honest rating directly shapes the weekly rankings on Indigo.
            </p>

            <form onSubmit={handleSubmitRating} className="space-y-4">
              {/* Star selector */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setUserRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= userRating
                          ? 'fill-amber-400 text-amber-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-bold text-sm text-[#1E1B4B]">
                  {userRating} / 5
                </span>
              </div>

              <textarea
                rows={3}
                value={userReviewText}
                onChange={(e) => setUserReviewText(e.target.value)}
                placeholder="Share your thoughts on the narrative, style, or characters..."
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
              />

              <button
                type="submit"
                disabled={submittingRating}
                className="w-full py-2.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81] transition-colors"
              >
                {data.userRating ? 'Update Your Rating' : 'Submit Rating & Review'}
              </button>
            </form>
          </div>

          {/* Rating Breakdown */}
          {reviewStats && (
            <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 shadow-xs">
              <h4 className="font-serif text-sm font-bold text-[#1E1B4B] mb-4">
                Rating Breakdown
              </h4>

              <div className="space-y-2 text-xs">
                {[5, 4, 3, 2, 1].map((s) => {
                  const key = s === 5 ? 'five_stars' : s === 4 ? 'four_stars' : s === 3 ? 'three_stars' : s === 2 ? 'two_stars' : 'one_stars';
                  const count = reviewStats[key] || 0;
                  const total = reviewStats.total_ratings || 1;
                  const pct = Math.round((count / total) * 100);

                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-12 font-medium text-gray-600">{s} Stars</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-gray-500 font-mono text-[11px]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews list */}
          <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 shadow-xs">
            <h4 className="font-serif text-sm font-bold text-[#1E1B4B] mb-4">
              Recent Reader Reviews
            </h4>

            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">
                  No written reviews yet.
                </p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="pb-3 border-b border-gray-100 last:border-none">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#1E1B4B]">{r.username}</span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < r.rating_val ? 'fill-amber-400 text-amber-500' : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {r.review_text && (
                      <p className="text-xs text-gray-700 leading-relaxed font-serif-body">
                        "{r.review_text}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-700 mb-2">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-display font-bold text-lg text-gray-900">
                Report Publication
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Help Indigo preserve artistic integrity and community safety. Reports are triaged directly by platform administrators.
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Reason
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-gray-300 rounded-xl text-xs font-medium"
                >
                  <option value="Plagiarism or copyright violation">Plagiarism or copyright violation</option>
                  <option value="Harassment or hate speech">Harassment or hate speech</option>
                  <option value="Prohibited or illegal content">Prohibited or illegal content</option>
                  <option value="Spam or automated manipulation">Spam or automated manipulation</option>
                  <option value="Other guidelines violation">Other guidelines violation</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                  Additional Details
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context or links to original sources..."
                  className="w-full p-2.5 bg-[#FAF7F2] border border-gray-300 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-[#1E1B4B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50"
                >
                  {reporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
