import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import BookCard from '../components/BookCard';
import {
  Search,
  TrendingUp,
  Award,
  MessageCircle,
  Clock,
  Sparkles,
  BookOpen,
  Feather,
  Compass,
  ArrowRight,
  Filter,
  Calendar
} from 'lucide-react';

export default function HomePage({ onNavigate }) {
  const [timeframe, setTimeframe] = useState('this_week'); // 'today', 'this_week', 'this_month', 'all_time'
  const [data, setData] = useState({
    trending: [],
    mostRead: [],
    highestRated: [],
    mostDiscussed: [],
    recentlyPublished: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHomepageData = async (selectedTimeframe) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/works/homepage?timeframe=${selectedTimeframe}`);
      setData(res);
    } catch (err) {
      console.error('Failed to load homepage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomepageData(timeframe);
  }, [timeframe]);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/discover?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const categories = [
    { name: 'Novels', count: 'Serialized epics & sagas', cat: 'novel', icon: BookOpen },
    { name: 'Poetry', count: 'Verses, lyrics & haikus', cat: 'poem', icon: Feather },
    { name: 'Short Stories', count: 'Bite-sized literary fiction', cat: 'short_story', icon: Sparkles }
  ];

  const popularGenres = [
    'Romance', 'Fantasy', 'Mystery', 'Thriller', 'Science Fiction',
    'Historical Fiction', 'Drama', 'Poetry', 'Horror', 'Adventure'
  ];

  return (
    <div className="min-h-screen">
      {/* Compact Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF7F2] via-[#F4EFE6] to-[#FAF7F2] border-b border-[#E5DECF] py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#1E1B4B]/10 text-[#1E1B4B] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#3730A3]" />
              Free Online Literary Publishing & Reading
            </span>

            <h1 className="font-cinzel text-3xl sm:text-5xl font-extrabold text-[#1E1B4B] tracking-tight leading-tight">
              Where words find a home.
            </h1>

            <p className="font-serif-body text-base sm:text-lg text-[#47436B] mt-2 leading-relaxed">
              Discover captivating novels, poems, and short stories—or share your own voice with the world immediately. No fees. No paywalls. Pure literature.
            </p>

            {/* Prominent Search Bar in Hero */}
            <form onSubmit={handleHeroSearch} className="mt-5 relative max-w-xl">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#7E79A4]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author pen name, keyword, or genre..."
                className="w-full pl-12 pr-28 py-3 bg-white border-2 border-[#DDD5C5] rounded-2xl text-sm text-[#1E1B4B] placeholder-[#8B86AA] focus:outline-none focus:border-[#1E1B4B] shadow-sm transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81] transition-colors"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Weekly Rankings Timeframe Switcher Bar */}
      <section className="bg-[#FAF7F2] border-b border-[#E7E0D3] py-4 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#524E79]" />
            <span className="text-xs font-bold text-[#1E1B4B] uppercase tracking-wider">
              Literary Rankings Timeframe:
            </span>
          </div>

          {/* Timeframe Buttons: Today, This week, This month, All time */}
          <div className="flex items-center bg-[#ECE6DA] p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === 'today'
                  ? 'bg-white text-[#1E1B4B] font-bold shadow-xs'
                  : 'text-[#58537F] hover:text-[#1E1B4B]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('this_week')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === 'this_week'
                  ? 'bg-white text-[#1E1B4B] font-bold shadow-xs'
                  : 'text-[#58537F] hover:text-[#1E1B4B]'
              }`}
            >
              This Week (Weekly)
            </button>
            <button
              onClick={() => setTimeframe('this_month')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === 'this_month'
                  ? 'bg-white text-[#1E1B4B] font-bold shadow-xs'
                  : 'text-[#58537F] hover:text-[#1E1B4B]'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('all_time')}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeframe === 'all_time'
                  ? 'bg-white text-[#1E1B4B] font-bold shadow-xs'
                  : 'text-[#58537F] hover:text-[#1E1B4B]'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-14">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#6B6694]">
            <BookOpen className="w-10 h-10 animate-bounce mb-3" />
            <p className="font-serif text-sm">Opening the library archives...</p>
          </div>
        ) : (
          <>
            {/* Section A: TRENDING NOW */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-100 text-[#1E1B4B]">
                    <TrendingUp className="w-5 h-5 text-[#3730A3]" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">
                      Trending Now
                    </h2>
                    <p className="text-xs text-[#5D597E]">
                      Stories catching fire with rapid reader engagement {timeframe === 'this_week' ? 'this week' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate(`/discover?sort=trending&timeframe=${timeframe}`)}
                  className="text-xs font-semibold text-[#312E81] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {data.trending.slice(0, 4).map((work) => (
                  <BookCard key={work.id} work={work} onNavigate={onNavigate} />
                ))}
              </div>
            </section>

            {/* Section B: MOST READ */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
                    <BookOpen className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">
                      Most Read
                    </h2>
                    <p className="text-xs text-[#5D597E]">
                      Books receiving the highest number of reads {timeframe === 'all_time' ? '(All Time)' : `(${timeframe.replace('_', ' ')})`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate(`/discover?sort=most_read&timeframe=${timeframe}`)}
                  className="text-xs font-semibold text-[#312E81] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {data.mostRead.slice(0, 4).map((work) => (
                  <BookCard key={work.id} work={work} onNavigate={onNavigate} />
                ))}
              </div>
            </section>

            {/* Category Discovery Banners */}
            <section className="bg-gradient-to-r from-[#1E1B4B] to-[#2E2A72] rounded-3xl p-6 sm:p-8 text-[#FAF7F2] shadow-md">
              <div className="mb-6">
                <h3 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wide">
                  Explore by Category
                </h3>
                <p className="text-xs text-indigo-200 mt-1">
                  Dive into distinct forms of literary craft
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.cat}
                      onClick={() => onNavigate(`/discover?category=${cat.cat}`)}
                      className="group flex items-start gap-4 p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-all hover:scale-[1.02]"
                    >
                      <div className="p-3 rounded-xl bg-white/15 text-white group-hover:bg-white group-hover:text-[#1E1B4B] transition-colors">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-white">
                          {cat.name}
                        </h4>
                        <p className="text-xs text-indigo-200 mt-0.5">
                          {cat.count}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Section C: HIGHEST RATED */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900">
                    <Award className="w-5 h-5 text-emerald-800" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">
                      Highest Rated
                    </h2>
                    <p className="text-xs text-[#5D597E]">
                      Works acclaimed by verified Indigo readers
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('/discover?sort=highest_rated')}
                  className="text-xs font-semibold text-[#312E81] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {data.highestRated.slice(0, 4).map((work) => (
                  <BookCard key={work.id} work={work} onNavigate={onNavigate} />
                ))}
              </div>
            </section>

            {/* Section D: MOST DISCUSSED */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-100 text-purple-900">
                    <MessageCircle className="w-5 h-5 text-purple-800" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">
                      Most Discussed
                    </h2>
                    <p className="text-xs text-[#5D597E]">
                      Stories sparking vibrant comments, theories, and literary debates
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('/discover?sort=most_discussed')}
                  className="text-xs font-semibold text-[#312E81] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {data.mostDiscussed.slice(0, 4).map((work) => (
                  <BookCard key={work.id} work={work} onNavigate={onNavigate} />
                ))}
              </div>
            </section>

            {/* Section E: RECENTLY PUBLISHED */}
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-sky-100 text-sky-900">
                    <Clock className="w-5 h-5 text-sky-800" />
                  </div>
                  <div>
                    <h2 className="font-display text-2xl font-bold text-[#1E1B4B]">
                      Recently Published
                    </h2>
                    <p className="text-xs text-[#5D597E]">
                      Fresh releases from new and established pen names
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('/discover?sort=recent')}
                  className="text-xs font-semibold text-[#312E81] hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {data.recentlyPublished.slice(0, 4).map((work) => (
                  <BookCard key={work.id} work={work} onNavigate={onNavigate} />
                ))}
              </div>
            </section>

            {/* Section F: DISCOVER MORE BY GENRE */}
            <section className="pt-6 border-t border-[#E7E0D3]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-xl font-bold text-[#1E1B4B]">
                  Discover by Genre
                </h3>
                <button
                  onClick={() => onNavigate('/discover')}
                  className="text-xs text-[#312E81] font-semibold hover:underline"
                >
                  Browse All Genres
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {popularGenres.map((g) => (
                  <button
                    key={g}
                    onClick={() => onNavigate(`/discover?genre=${encodeURIComponent(g)}`)}
                    className="px-4 py-2 rounded-xl bg-white border border-[#DDD5C5] text-xs font-medium text-[#2E2A5C] hover:border-[#1E1B4B] hover:bg-[#FAF7F2] transition-colors shadow-2xs"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
