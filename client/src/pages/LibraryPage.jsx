import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Bookmark,
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  Trash2,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function LibraryPage({ onNavigate, onOpenAuth }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'currently_reading', 'want_to_read', 'completed', 'saved'

  const fetchLibrary = async (statusFilter) => {
    setLoading(true);
    try {
      const endpoint = statusFilter && statusFilter !== 'all'
        ? `/reading/library?status=${statusFilter}`
        : '/reading/library';
      const data = await apiRequest(endpoint);
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLibrary(activeTab);
    } else {
      setLoading(false);
    }
  }, [user, activeTab]);

  const handleRemove = async (workId) => {
    if (!confirm('Remove this book from your library?')) return;
    try {
      await apiRequest(`/reading/library/${workId}`, { method: 'DELETE' });
      setItems(prev => prev.filter(item => item.id !== workId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateShelf = async (workId, newStatus) => {
    try {
      await apiRequest('/reading/library', {
        method: 'POST',
        body: JSON.stringify({ work_id: workId, status: newStatus })
      });
      fetchLibrary(activeTab);
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto my-24 p-8 text-center bg-white rounded-3xl border border-[#DDD5C5]">
        <Bookmark className="w-12 h-12 text-[#1E1B4B] mx-auto mb-3" />
        <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">My Personal Library</h2>
        <p className="text-sm text-gray-600 mt-2">
          Keep track of your reading journey, bookmark stories, poems, and thoughts you want to explore, and resume reading anytime.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="mt-5 px-6 py-2.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81]"
        >
          Sign In to Access Library
        </button>
      </div>
    );
  }

  const counts = {
    all: items.length,
    currently_reading: items.filter(i => i.library_status === 'currently_reading').length,
    want_to_read: items.filter(i => i.library_status === 'want_to_read').length,
    completed: items.filter(i => i.library_status === 'completed').length,
    saved: items.filter(i => i.library_status === 'saved').length
  };

  return (
    <div className="min-h-screen py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A759C]">
          PERSONAL ARCHIVE
        </span>
        <h1 className="font-cinzel text-3xl font-extrabold text-[#1E1B4B]">
          My Library
        </h1>
        <p className="text-xs sm:text-sm text-[#5D597E] mt-1 font-serif-body">
          Private to your account. Your reading progress syncs automatically across all chapters and listening sessions.
        </p>
      </div>

      {/* Library Shelf Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E5DECF] pb-3 mb-8">
        {[
          { id: 'all', label: 'All Saved' },
          { id: 'currently_reading', label: 'Currently Reading' },
          { id: 'want_to_read', label: 'Want to Read' },
          { id: 'completed', label: 'Completed' },
          { id: 'saved', label: 'Saved Books' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-[#1E1B4B] text-white shadow-xs'
                : 'text-gray-600 hover:text-black hover:bg-white'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Items List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#6B6694]">
          <Bookmark className="w-9 h-9 animate-bounce mb-3" />
          <p className="font-serif text-sm">Opening your bookshelf...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white/70 rounded-3xl border border-dashed border-[#DDD5C5] p-8">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-[#1E1B4B]">
            Your shelf is empty
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Explore the bookstore discovery sections to find compelling stories to add to your personal collection.
          </p>
          <button
            onClick={() => onNavigate('/discover')}
            className="mt-4 px-5 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81]"
          >
            Discover Books
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const hasProgress = item.progress_percentage > 0;

            return (
              <div
                key={item.id}
                className="bg-white border border-[#E5DECF] rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    {/* Cover */}
                    <div
                      onClick={() => onNavigate(`/book/${item.id}`)}
                      className="w-20 aspect-[3/4] rounded-xl overflow-hidden bg-[#ECE6DA] shrink-0 cursor-pointer shadow-xs"
                    >
                      {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#1E1B4B] text-white flex items-center justify-center text-[10px] p-1 text-center font-bold">
                          {item.title}
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A759C]">
                        {item.category}
                      </span>
                      <h3
                        onClick={() => onNavigate(`/book/${item.id}`)}
                        className="font-display text-base font-bold text-[#1E1B4B] hover:text-[#312E81] cursor-pointer truncate mt-0.5"
                      >
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#55507E] font-medium truncate">
                        By {item.pen_name}
                      </p>

                      {/* Shelf status pill */}
                      <div className="mt-2">
                        <select
                          value={item.library_status}
                          onChange={(e) => handleUpdateShelf(item.id, e.target.value)}
                          className="text-[11px] font-semibold py-1 px-2 rounded-lg bg-[#FAF7F2] border border-[#DDD5C5] text-[#1E1B4B] cursor-pointer"
                        >
                          <option value="currently_reading">Currently Reading</option>
                          <option value="want_to_read">Want to Read</option>
                          <option value="completed">Completed</option>
                          <option value="saved">Saved Books</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Reading Progress Indicator */}
                  {hasProgress && (
                    <div className="my-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#EAE3D5]">
                      <div className="flex justify-between text-[11px] mb-1.5 font-medium text-[#48446B]">
                        <span className="truncate pr-2">
                          {item.last_chapter_title ? item.last_chapter_title : `Chapter ${item.last_chapter_number || 1}`}
                        </span>
                        <span className="font-mono font-bold text-[#1E1B4B]">{item.progress_percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#DDD5C5] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${item.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Bottom Controls */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      if (item.last_chapter_id) {
                        onNavigate(`/read/${item.id}/${item.last_chapter_id}`);
                      } else {
                        onNavigate(`/book/${item.id}`);
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1E1B4B] text-white font-semibold rounded-xl hover:bg-[#312E81] transition-colors"
                  >
                    <span>{hasProgress ? 'Resume Reading' : 'Start Reading'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Remove from Library"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
