import React from 'react';
import { Eye, Star, MessageSquare, BookOpen } from 'lucide-react';

export default function BookCard({ work, onNavigate }) {
  if (!work) return null;

  const genres = Array.isArray(work.genres)
    ? work.genres
    : (typeof work.genres === 'string' ? JSON.parse(work.genres || '[]') : []);

  const genresString = genres.slice(0, 2).join(' | ');

  const formatReads = (num) => {
    if (!num) return '0';
    return Number(num).toLocaleString();
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'poem':
        return 'Poem';
      case 'short_story':
        return 'Short Story';
      case 'novel':
      default:
        return 'Novel';
    }
  };

  return (
    <div
      onClick={() => onNavigate(`/book/${work.id}`)}
      className="group cursor-pointer bg-[#FFFDF9] border border-[#E7E0D3] rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      {/* Cover Image Presentation */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#ECE6DA]">
        {work.cover_url ? (
          <img
            src={work.cover_url}
            alt={work.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#232050] to-[#161436] text-[#FAF7F2]">
            <BookOpen className="w-10 h-10 mb-2 opacity-50" />
            <span className="font-display text-lg font-bold line-clamp-3 leading-snug">
              {work.title}
            </span>
            <span className="text-xs text-indigo-200 mt-2 font-medium">
              By {work.pen_name}
            </span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#1E1B4B]/85 text-white backdrop-blur-xs">
            {getCategoryBadge(work.category)}
          </span>
          {work.status && (
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md backdrop-blur-xs ${
              work.status === 'completed'
                ? 'bg-emerald-800/85 text-emerald-100'
                : work.status === 'on_hiatus'
                ? 'bg-amber-800/85 text-amber-100'
                : 'bg-indigo-900/85 text-indigo-100'
            }`}>
              {work.status === 'ongoing' ? 'Ongoing' : work.status === 'completed' ? 'Completed' : 'On Hiatus'}
            </span>
          )}
        </div>
      </div>

      {/* Book Metadata & Statistics */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title & Author */}
          <h3 className="font-display text-base font-bold text-[#1E1B4B] group-hover:text-[#3730A3] transition-colors line-clamp-1 leading-snug uppercase tracking-wide">
            {work.title}
          </h3>

          <p className="text-xs text-[#524E79] font-medium mt-0.5 line-clamp-1">
            By <span className="font-semibold text-[#2D2A57]">{work.pen_name}</span>
          </p>

          {/* Genre line */}
          {genresString && (
            <p className="text-[11px] font-medium text-[#7D78A2] mt-1 line-clamp-1 italic">
              {genresString}
            </p>
          )}

          {/* Synopsis preview */}
          {work.synopsis && (
            <p className="text-xs text-[#5D597A] mt-2 line-clamp-2 leading-relaxed">
              {work.synopsis}
            </p>
          )}
        </div>

        {/* Real Persistent Stats Line */}
        <div className="mt-4 pt-3 border-t border-[#EFEAE0] flex items-center justify-between text-[11px] text-[#48446B]">
          {/* Reads */}
          <div className="flex items-center gap-1" title={`${formatReads(work.reads_count)} total reads`}>
            <Eye className="w-3.5 h-3.5 text-[#67628E]" />
            <span className="font-semibold">{formatReads(work.reads_count)}</span>
          </div>

          {/* Average Rating */}
          <div className="flex items-center gap-1 text-amber-700" title={`Average rating: ${work.avg_rating || 'N/A'}`}>
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span className="font-bold text-[#1E1B4B]">
              {work.avg_rating ? `${work.avg_rating}/5` : 'New'}
            </span>
          </div>

          {/* Comments count */}
          <div className="flex items-center gap-1" title={`${work.comments_count || 0} reader discussions`}>
            <MessageSquare className="w-3.5 h-3.5 text-[#67628E]" />
            <span>{work.comments_count || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
