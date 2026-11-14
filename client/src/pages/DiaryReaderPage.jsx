import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Calendar,
  Lock,
  Globe,
  Share2,
  Sparkles,
  BookOpen,
  Feather
} from 'lucide-react';

export default function DiaryReaderPage({ entryId, onNavigate }) {
  const { user } = useAuth();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('paper'); // 'paper', 'sepia', 'night'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchEntry = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiRequest(`/diary/entry/${entryId}`);
        setEntry(res.entry);
      } catch (err) {
        setError(err.message || 'Unable to open entry');
      } finally {
        setLoading(false);
      }
    };
    if (entryId) {
      fetchEntry();
    }
  }, [entryId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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

  const themeClasses = {
    paper: 'bg-[#FAF7F2] text-[#1E1B4B]',
    sepia: 'bg-[#F4ECD8] text-[#433422]',
    night: 'bg-[#181628] text-[#EDEAF5]'
  };

  const cardClasses = {
    paper: 'bg-[#FFFDF9] border-[#E5DECF] shadow-xs',
    sepia: 'bg-[#FDF6E3] border-[#E0D3BC] shadow-xs',
    night: 'bg-[#211E36] border-[#312C50] text-[#EDEAF5] shadow-lg'
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-[#6B6694]">
        <BookOpen className="w-10 h-10 animate-bounce mb-3 text-[#1E1B4B]" />
        <p className="font-serif text-sm">Opening journal archives...</p>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="max-w-md mx-auto my-28 p-8 text-center bg-white rounded-3xl border border-[#DDD5C5] shadow-xs">
        <Lock className="w-12 h-12 text-stone-400 mx-auto mb-3" />
        <h2 className="font-display text-xl font-bold text-[#1E1B4B]">Private Entry</h2>
        <p className="text-xs text-gray-500 mt-2 font-serif-body">
          {error || 'This diary entry is private to its author or does not exist.'}
        </p>
        <button
          onClick={() => onNavigate('/diary')}
          className="mt-5 px-5 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl"
        >
          Go to My Diary
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-10 transition-colors duration-200 ${themeClasses[theme]}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Navigation & Controls Bar */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-black/10">
          <button
            onClick={() => onNavigate('/diary')}
            className="flex items-center gap-1.5 text-xs font-semibold hover:opacity-75 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Journal</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <div className="flex rounded-lg p-0.5 border border-black/10 text-[10px] font-bold">
              <button
                onClick={() => setTheme('paper')}
                className={`px-2 py-0.5 rounded ${theme === 'paper' ? 'bg-[#1E1B4B] text-white' : 'opacity-70'}`}
              >
                Paper
              </button>
              <button
                onClick={() => setTheme('sepia')}
                className={`px-2 py-0.5 rounded ${theme === 'sepia' ? 'bg-[#433422] text-[#FDF6E3]' : 'opacity-70'}`}
              >
                Sepia
              </button>
              <button
                onClick={() => setTheme('night')}
                className={`px-2 py-0.5 rounded ${theme === 'night' ? 'bg-indigo-600 text-white' : 'opacity-70'}`}
              >
                Night
              </button>
            </div>

            {/* Share button if public */}
            {entry.is_public === 1 && (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg border border-black/10 hover:opacity-80"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Journal Reading Sheet */}
        <div className={`rounded-3xl border p-8 sm:p-14 ${cardClasses[theme]}`}>
          {/* Header */}
          <div className="space-y-2 pb-6 border-b border-black/10">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="uppercase tracking-widest opacity-60 font-bold">
                {formatDateDisplay(entry.entry_date)}
              </span>

              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                entry.is_public
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {entry.is_public ? <><Globe className="w-2.5 h-2.5" /> Shared Entry</> : <><Lock className="w-2.5 h-2.5" /> Private to Author</>}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight leading-snug">
              {entry.title}
            </h1>

            {/* Author Attribution & Atmosphere */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs opacity-75">
              {entry.pen_name && (
                <span>
                  Author: <strong className="font-semibold">{entry.pen_name}</strong>
                </span>
              )}
              {entry.mood && (
                <span className="px-2 py-0.5 rounded bg-black/5 font-medium">
                  Mood: {entry.mood}
                </span>
              )}
              {entry.weather && (
                <span className="px-2 py-0.5 rounded bg-black/5 font-medium">
                  {entry.weather}
                </span>
              )}
            </div>
          </div>

          {/* Clean Journal Text */}
          <div className="font-serif-body text-lg sm:text-xl leading-relaxed pt-8 space-y-6 whitespace-pre-wrap">
            {entry.content}
          </div>
        </div>
      </div>
    </div>
  );
}
