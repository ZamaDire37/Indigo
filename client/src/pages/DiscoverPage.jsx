import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import BookCard from '../components/BookCard';
import {
  Search,
  Filter,
  SlidersHorizontal,
  X,
  BookOpen,
  ArrowUpDown,
  Calendar,
  Sparkles,
  Globe,
  Feather
} from 'lucide-react';

export default function DiscoverPage({ initialQuery = '', onNavigate }) {
  const [activeTab, setActiveTab] = useState('works'); // 'works' | 'diaries'
  const [works, setWorks] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [search, setSearch] = useState(initialQuery);
  const [category, setCategory] = useState('all'); // all, novel, short_story, poem
  const [genre, setGenre] = useState('all');
  const [status, setStatus] = useState('all'); // all, ongoing, completed, on_hiatus
  const [sort, setSort] = useState('recent'); // recent, trending, most_read, highest_rated, most_discussed
  const [timeframe, setTimeframe] = useState('all_time');
  const [page, setPage] = useState(1);

  const genresList = [
    'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Horror',
    'Science Fiction', 'Drama', 'Adventure', 'Historical Fiction',
    'Poetry', 'Non-fiction'
  ];

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 18,
        sort,
        timeframe
      });

      if (category !== 'all') params.append('category', category);
      if (genre !== 'all') params.append('genre', genre);
      if (status !== 'all') params.append('status', status);
      if (search.trim()) params.append('search', search.trim());

      const res = await apiRequest(`/works?${params.toString()}`);
      setWorks(res.works || []);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to discover works:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicDiaries = async () => {
    setDiaryLoading(true);
    try {
      const res = await apiRequest('/diary/public');
      setDiaries(res.entries || []);
    } catch (err) {
      console.error('Failed to load shared diaries:', err);
    } finally {
      setDiaryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'diaries') {
      fetchPublicDiaries();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'works') {
      fetchWorks();
    }
  }, [category, genre, status, sort, timeframe, page, activeTab]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchWorks();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setGenre('all');
    setStatus('all');
    setSort('recent');
    setTimeframe('all_time');
    setPage(1);
  };

  return (
    <div className="min-h-screen py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-3xl font-extrabold text-[#1E1B4B]">
            Discover Literature
          </h1>
          <p className="text-sm text-[#5D597E] mt-1 font-serif-body">
            Explore short stories, poems, thoughtful reflections, and voluntarily shared personal journals.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#EAE4D7] rounded-xl self-start sm:self-auto border border-[#DDD5C5]">
          <button
            onClick={() => setActiveTab('works')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'works'
                ? 'bg-[#1E1B4B] text-white shadow-xs'
                : 'text-[#4B4870] hover:text-[#1E1B4B]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Works & Stories</span>
          </button>
          <button
            onClick={() => setActiveTab('diaries')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'diaries'
                ? 'bg-[#1E1B4B] text-white shadow-xs'
                : 'text-[#4B4870] hover:text-[#1E1B4B]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-300" />
            <span>Shared Diaries</span>
          </button>
        </div>
      </div>

      {activeTab === 'diaries' ? (
        /* Shared Public Diaries Section */
        <div>
          <div className="bg-[#FAF7F2] border border-[#E5DECF] rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-700" />
                <h2 className="font-serif font-bold text-lg text-[#1E1B4B]">
                  Shared Journal Reflections
                </h2>
              </div>
              <p className="text-xs text-[#5D597E] mt-1 max-w-2xl font-serif-body">
                Intimate writings, memoirs, and daily meditations voluntarily shared with the community.
                Personal diaries remain strictly private by default unless an author chooses to share them.
              </p>
            </div>
            <button
              onClick={() => onNavigate('/diary')}
              className="px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81] transition-all whitespace-nowrap"
            >
              Open My Diary
            </button>
          </div>

          {diaryLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#6B6694]">
              <Globe className="w-9 h-9 animate-spin mb-3 text-indigo-600" />
              <p className="font-serif text-sm">Gathering shared reflections...</p>
            </div>
          ) : diaries.length === 0 ? (
            <div className="text-center py-20 bg-white/70 border border-dashed border-[#DDD5C5] rounded-3xl p-8">
              <Globe className="w-12 h-12 text-[#9A95BD] mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold text-[#1E1B4B]">
                No public journal entries shared yet
              </h3>
              <p className="text-xs text-[#5D597E] mt-1 max-w-md mx-auto">
                Be the first to share a quiet reflection or quote study with fellow readers.
              </p>
              <button
                onClick={() => onNavigate('/diary')}
                className="mt-4 px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl"
              >
                Write in My Diary
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {diaries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => onNavigate(`/diary/read/${entry.id}`)}
                  className="bg-white border border-[#E5DECF] rounded-2xl p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#7E79A4] mb-3">
                      <span className="font-mono text-[11px] bg-[#F4EFE6] px-2.5 py-1 rounded-md text-[#4B4870]">
                        {new Date(entry.entry_date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      {entry.mood && (
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {entry.mood}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif font-bold text-lg text-[#1E1B4B] group-hover:text-indigo-900 transition-colors line-clamp-1 mb-2">
                      {entry.title}
                    </h3>

                    <p className="text-xs text-gray-600 font-serif-body leading-relaxed line-clamp-4">
                      {entry.content}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#4B4870]">
                      By {entry.pen_name || entry.username || 'Anonymous'}
                    </span>
                    <span className="text-indigo-700 font-semibold group-hover:underline flex items-center gap-1">
                      Read Entry →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard Literature Works Section */
        <>
          {/* Filter and Search Bar Card */}
          <div className="bg-white border border-[#E5DECF] rounded-2xl p-5 mb-8 shadow-xs">
            {/* Search Row */}
            <form onSubmit={handleSearchSubmit} className="relative mb-5">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7E79A4]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by book title, author pen name, or synopsis keywords..."
                className="w-full pl-10 pr-24 py-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-sm focus:outline-none focus:border-[#1E1B4B] focus:bg-white text-[#1E1B4B]"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-lg hover:bg-[#312E81]"
              >
                Search
              </button>
            </form>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-[11px] font-bold text-[#55507E] uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="w-full py-1.5 px-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-lg text-xs font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
                >
                  <option value="all">All Categories</option>
                  <option value="short_story">Short Stories</option>
                  <option value="poem">Poetry</option>
                  <option value="thought">Thoughts & Quotes</option>
                </select>
              </div>

              {/* Genre Filter */}
              <div>
                <label className="block text-[11px] font-bold text-[#55507E] uppercase tracking-wider mb-1">
                  Genre
                </label>
                <select
                  value={genre}
                  onChange={(e) => {
                    setGenre(e.target.value);
                    setPage(1);
                  }}
                  className="w-full py-1.5 px-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-lg text-xs font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
                >
                  <option value="all">All Genres</option>
                  {genresList.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-[#55507E] uppercase tracking-wider mb-1">
                  Publication Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full py-1.5 px-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-lg text-xs font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
                >
                  <option value="all">All Statuses</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="on_hiatus">On Hiatus</option>
                </select>
              </div>

              {/* Sorting */}
              <div>
                <label className="block text-[11px] font-bold text-[#55507E] uppercase tracking-wider mb-1">
                  Sort By
                </label>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                  className="w-full py-1.5 px-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-lg text-xs font-medium text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
                >
                  <option value="recent">Recently Published</option>
                  <option value="trending">Trending Now</option>
                  <option value="most_read">Most Read</option>
                  <option value="highest_rated">Highest Rated</option>
                  <option value="most_discussed">Most Discussed</option>
                </select>
              </div>
            </div>

            {/* Timeframe selector when viewing trending or most read */}
            {(sort === 'trending' || sort === 'most_read') && (
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
                <span className="text-xs font-bold text-[#1E1B4B]">Timeframe:</span>
                <div className="flex items-center gap-1.5 text-xs">
                  {['today', 'this_week', 'this_month', 'all_time'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        timeframe === tf
                          ? 'bg-[#1E1B4B] text-white font-semibold'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tf.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters Reset */}
            {(category !== 'all' || genre !== 'all' || status !== 'all' || search || sort !== 'recent') && (
              <div className="mt-3 flex items-center justify-between text-xs text-[#5D597E]">
                <span>
                  Showing {totalCount} matching works
                </span>
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-rose-700 font-semibold hover:underline"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reset all filters</span>
                </button>
              </div>
            )}
          </div>

          {/* Results Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#6B6694]">
              <BookOpen className="w-9 h-9 animate-bounce mb-3" />
              <p className="font-serif text-sm">Searching the shelves...</p>
            </div>
          ) : works.length === 0 ? (
            <div className="text-center py-20 bg-white/60 border border-dashed border-[#DDD5C5] rounded-3xl p-8">
              <BookOpen className="w-12 h-12 text-[#9A95BD] mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold text-[#1E1B4B]">
                No works found matching your criteria
              </h3>
              <p className="text-xs text-[#5D597E] mt-1 max-w-md mx-auto">
                Try adjusting your search keywords, clearing your genre filters, or explore our recently published catalog.
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl"
              >
                Show All Books
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-6">
              {works.map((work) => (
                <BookCard key={work.id} work={work} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
