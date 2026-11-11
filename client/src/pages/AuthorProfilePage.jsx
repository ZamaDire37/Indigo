import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import BookCard from '../components/BookCard';
import {
  Feather,
  BookOpen,
  Eye,
  Star,
  MessageSquare,
  Sparkles,
  Calendar,
  Share2
} from 'lucide-react';

export default function AuthorProfilePage({ authorId, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'novels', 'poems', 'shortStories'

  useEffect(() => {
    setLoading(true);
    apiRequest(`/pen-names/${authorId}/public`)
      .then(res => setProfile(res))
      .catch(err => {
        console.error('Failed to load author profile:', err);
      })
      .finally(() => setLoading(false));
  }, [authorId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#6B6694]">
        <Feather className="w-10 h-10 animate-bounce mb-3" />
        <p className="font-serif text-sm">Opening the author archives...</p>
      </div>
    );
  }

  if (!profile?.author) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 text-center bg-white rounded-3xl border border-gray-200">
        <h2 className="font-display text-lg font-bold text-gray-900">Author Not Found</h2>
        <p className="text-xs text-gray-500 mt-2">This author persona may have been removed or renamed.</p>
        <button
          onClick={() => onNavigate('/')}
          className="mt-4 px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl"
        >
          Return to Bookstore
        </button>
      </div>
    );
  }

  const { author, stats, catalogue } = profile;

  const getFilteredWorks = () => {
    switch (activeTab) {
      case 'shortStories':
        return catalogue.shortStories || [];
      case 'poems':
        return catalogue.poems || [];
      case 'thoughts':
        return catalogue.thoughts || [];
      case 'novels':
        return catalogue.novels || [];
      case 'all':
      default:
        return catalogue.all || [];
    }
  };

  const displayedWorks = getFilteredWorks();

  return (
    <div className="min-h-screen py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Author Header Banner */}
      <div className="bg-[#FFFDF9] border border-[#E5DECF] rounded-3xl p-6 sm:p-10 shadow-xs mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            {author.avatar_url ? (
              <img
                src={author.avatar_url}
                alt={author.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-[#DDD5C5] shadow-md"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#1E1B4B] to-[#3B3878] text-[#FAF7F2] flex items-center justify-center font-bold text-3xl shadow-md">
                {author.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Bio & Details */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A759C]">
                INDIGO AUTHOR PROFILE
              </span>
              <span className="text-xs text-[#8E8AA8]">
                • Member since {new Date(author.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </span>
            </div>

            <h1 className="font-cinzel text-3xl sm:text-4xl font-extrabold text-[#1E1B4B] tracking-tight">
              {author.name}
            </h1>

            <p className="font-serif-body text-sm sm:text-base text-[#47436B] mt-2 max-w-2xl leading-relaxed">
              {author.bio || 'Author on Indigo literary publishing house.'}
            </p>

            {/* Author Metrics */}
            <div className="mt-5 flex flex-wrap items-center gap-6 text-xs text-[#524E79] pt-4 border-t border-[#EAE3D5]">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#67628E]" />
                <span>
                  <strong className="text-sm font-bold text-[#1E1B4B]">{stats.totalWorks}</strong> Published Works
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#67628E]" />
                <span>
                  <strong className="text-sm font-bold text-[#1E1B4B]">{Number(stats.totalReads || 0).toLocaleString()}</strong> Total Reads
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-amber-700">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>
                  <strong className="text-sm font-bold text-[#1E1B4B]">{stats.overallRating || 'New'}</strong> Rating
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#67628E]" />
                <span>
                  <strong className="text-sm font-bold text-[#1E1B4B]">{stats.totalComments || 0}</strong> Discussions
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catalogue Filter Tabs */}
      <div className="flex items-center justify-between border-b border-[#E5DECF] pb-3 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-[#1E1B4B] text-white'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            All Publications ({catalogue.all?.length || 0})
          </button>

          {catalogue.shortStories?.length > 0 && (
            <button
              onClick={() => setActiveTab('shortStories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'shortStories'
                  ? 'bg-[#1E1B4B] text-white'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Short Stories ({catalogue.shortStories.length})
            </button>
          )}

          {catalogue.poems?.length > 0 && (
            <button
              onClick={() => setActiveTab('poems')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'poems'
                  ? 'bg-[#1E1B4B] text-white'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Poetry ({catalogue.poems.length})
            </button>
          )}

          {catalogue.thoughts?.length > 0 && (
            <button
              onClick={() => setActiveTab('thoughts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'thoughts'
                  ? 'bg-[#1E1B4B] text-white'
                  : 'text-gray-600 hover:text-black hover:bg-gray-100'
              }`}
            >
              Thoughts & Quotes ({catalogue.thoughts.length})
            </button>
          )}
        </div>
      </div>

      {/* Author's Works Grid */}
      {displayedWorks.length === 0 ? (
        <p className="text-center py-16 text-xs text-gray-500 italic">
          No works in this category.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {displayedWorks.map((work) => (
            <BookCard
              key={work.id}
              work={{ ...work, pen_name: author.name }}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
