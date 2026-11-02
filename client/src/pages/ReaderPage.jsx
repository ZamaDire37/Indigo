import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  Headphones,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  Volume2,
  Maximize2,
  Minimize2,
  List,
  Check,
  Type,
  Sun,
  Moon,
  Bookmark,
  Share2
} from 'lucide-react';

export default function ReaderPage({ workId, chapterId, onNavigate, autoplay = false }) {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reader Settings
  const [fontSize, setFontSize] = useState(18); // px
  const [fontFamily, setFontFamily] = useState('serif'); // 'serif', 'sans', 'display', 'mono'
  const [theme, setTheme] = useState('paper'); // 'paper', 'sepia', 'indigo', 'dark', 'light'
  const [viewMode, setViewMode] = useState('scroll'); // 'scroll' or 'paginated'
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reading Progress State
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);

  // Text-To-Speech (TTS) State
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsVoice, setTtsVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [ttsParagraphIndex, setTtsParagraphIndex] = useState(0);

  const contentRef = useRef(null);
  const paragraphRefs = useRef([]);
  const ttsUtteranceRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Load Chapter Data
  const fetchChapter = async (targetChapId) => {
    setLoading(true);
    try {
      const res = await apiRequest(`/chapters/${targetChapId}`);
      setData(res);

      if (res.userProgress) {
        setProgressPercent(res.userProgress.progress_percentage || 0);
        setActiveParagraphIndex(res.userProgress.last_paragraph_index || 0);
      } else {
        setProgressPercent(0);
        setActiveParagraphIndex(0);
      }

      // Record reading event to refresh weekly and live rankings
      apiRequest(`/works/${res.chapter.work_id}/read`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.error('Failed to load chapter:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chapterId) {
      fetchChapter(chapterId);
    }
  }, [chapterId]);

  // Handle Autoplay if requested via query
  useEffect(() => {
    if (autoplay && data && !loading && !ttsPlaying) {
      setTimeout(() => {
        startTTS(activeParagraphIndex);
      }, 600);
    }
  }, [autoplay, data, loading]);

  // Load Voices for SpeechSynthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !ttsVoice) {
          // Prefer English voice if available
          const preferred = voices.find(v => v.lang.startsWith('en')) || voices[0];
          setTtsVoice(preferred.name);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Break content into readable paragraphs
  const paragraphs = React.useMemo(() => {
    if (!data?.chapter?.content) return [];
    return data.chapter.content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);
  }, [data]);

  // Break paragraphs into paginated pages if in paginated view
  const pages = React.useMemo(() => {
    if (paragraphs.length === 0) return [];
    const chunks = [];
    const perPage = Math.max(2, Math.floor(22 / (fontSize / 14)));
    for (let i = 0; i < paragraphs.length; i += perPage) {
      chunks.push({
        paragraphs: paragraphs.slice(i, i + perPage),
        startIndex: i
      });
    }
    return chunks;
  }, [paragraphs, fontSize]);

  // Save Reading Progress to Server
  const saveProgressToServer = (percentage, pIndex) => {
    if (!user || !data?.chapter) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      apiRequest('/reading/progress', {
        method: 'POST',
        body: JSON.stringify({
          work_id: data.chapter.work_id,
          chapter_id: data.chapter.id,
          progress_percentage: Math.min(100, Math.round(percentage)),
          last_paragraph_index: pIndex
        })
      }).catch(err => console.warn('Failed to save progress:', err));
    }, 600);
  };

  // Track scroll position in continuous scroll view
  useEffect(() => {
    if (viewMode !== 'scroll') return;

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const current = window.scrollY;
        const pct = Math.min(100, Math.round((current / totalScroll) * 100));
        setProgressPercent(pct);

        // Approximate active paragraph from scroll position
        const pIdx = Math.min(
          paragraphs.length - 1,
          Math.floor((pct / 100) * paragraphs.length)
        );
        setActiveParagraphIndex(pIdx);
        saveProgressToServer(pct, pIdx);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewMode, paragraphs, data]);

  // Scroll to remembered paragraph index after initial load
  useEffect(() => {
    if (activeParagraphIndex > 0 && paragraphRefs.current[activeParagraphIndex]) {
      setTimeout(() => {
        paragraphRefs.current[activeParagraphIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 400);
    }
  }, [loading]);

  // ==========================================
  // TEXT-TO-SPEECH (TTS) IMPLEMENTATION
  // ==========================================
  const stopTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setTtsPlaying(false);
    setTtsActive(false);
  };

  const speakParagraph = (index) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech Synthesis is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    if (index >= paragraphs.length) {
      // Reached end of current chapter!
      if (data?.nextChapter) {
        // Automatically advance to the next chapter and continue reading aloud!
        onNavigate(`/read/${data.chapter.work_id}/${data.nextChapter.id}?autoplay=true`);
      } else {
        stopTTS();
      }
      return;
    }

    const text = paragraphs[index];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsRate;

    if (ttsVoice) {
      const matched = availableVoices.find(v => v.name === ttsVoice);
      if (matched) utterance.voice = matched;
    }

    utterance.onstart = () => {
      setTtsPlaying(true);
      setTtsActive(true);
      setTtsParagraphIndex(index);
      setActiveParagraphIndex(index);

      // Auto-scroll paragraph into view
      if (paragraphRefs.current[index]) {
        paragraphRefs.current[index].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }

      // Calculate and save progress
      const pct = Math.round(((index + 1) / paragraphs.length) * 100);
      setProgressPercent(pct);
      saveProgressToServer(pct, index);
    };

    utterance.onend = () => {
      // Progress to next paragraph
      speakParagraph(index + 1);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.error('Speech synthesis error:', e);
      }
    };

    ttsUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const startTTS = (fromIndex = activeParagraphIndex) => {
    setTtsActive(true);
    speakParagraph(fromIndex);
  };

  const pauseTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    setTtsPlaying(false);
    // Remember position
    saveProgressToServer(progressPercent, ttsParagraphIndex);
  };

  const resumeTTS = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setTtsPlaying(true);
      } else {
        speakParagraph(ttsParagraphIndex);
      }
    }
  };

  const skipForwardTTS = () => {
    const nextIdx = Math.min(paragraphs.length - 1, ttsParagraphIndex + 1);
    speakParagraph(nextIdx);
  };

  const skipBackTTS = () => {
    const prevIdx = Math.max(0, ttsParagraphIndex - 1);
    speakParagraph(prevIdx);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (viewMode === 'paginated') {
          if (currentPageIndex < pages.length - 1) {
            setCurrentPageIndex(prev => prev + 1);
          } else if (data?.nextChapter) {
            onNavigate(`/read/${data.chapter.work_id}/${data.nextChapter.id}`);
          }
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (viewMode === 'paginated') {
          if (currentPageIndex > 0) {
            setCurrentPageIndex(prev => prev - 1);
          } else if (data?.prevChapter) {
            onNavigate(`/read/${data.chapter.work_id}/${data.prevChapter.id}`);
          }
        }
      } else if (e.key === ' ' && ttsActive) {
        e.preventDefault();
        if (ttsPlaying) pauseTTS();
        else resumeTTS();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentPageIndex, pages, data, ttsActive, ttsPlaying]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Theme style classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'sepia':
        return 'bg-[#F7F0DC] text-[#2C2416] selection:bg-[#DECBA4]';
      case 'indigo':
        return 'bg-[#0E0C22] text-[#E0DCF4] selection:bg-[#312E81]';
      case 'dark':
        return 'bg-[#121212] text-[#E0E0E0] selection:bg-[#333333]';
      case 'light':
        return 'bg-[#FFFFFF] text-[#111111] selection:bg-[#E2E8F0]';
      case 'paper':
      default:
        return 'bg-[#FAF7F2] text-[#1E1B4B] selection:bg-[#EAE3D5]';
    }
  };

  const getHeaderBg = () => {
    switch (theme) {
      case 'sepia':
        return 'bg-[#F2E8CE]/95 border-[#DECBA4] text-[#2C2416]';
      case 'indigo':
        return 'bg-[#14122E]/95 border-[#282457] text-[#FAF7F2]';
      case 'dark':
        return 'bg-[#1A1A1A]/95 border-[#2E2E2E] text-white';
      case 'light':
        return 'bg-white/95 border-gray-200 text-gray-900';
      case 'paper':
      default:
        return 'bg-[#FAF7F2]/95 border-[#E5DECF] text-[#1E1B4B]';
    }
  };

  const getFontFamilyClass = () => {
    switch (fontFamily) {
      case 'sans':
        return 'font-sans';
      case 'display':
        return 'font-display';
      case 'mono':
        return 'font-mono';
      case 'serif':
      default:
        return 'font-serif-body';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${getThemeClasses()}`}>
        <BookOpen className="w-10 h-10 animate-bounce mb-3 opacity-60" />
        <p className="font-serif text-sm">Turning to chapter...</p>
      </div>
    );
  }

  const { chapter, toc = [], prevChapter, nextChapter } = data;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${getThemeClasses()}`}>
      {/* Sticky Reader Header */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between transition-colors ${getHeaderBg()}`}>
        {/* Left: Back & Work Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate(`/book/${chapter.work_id}`)}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            title="Return to Book Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="max-w-[200px] sm:max-w-md truncate">
            <h1 className="text-xs sm:text-sm font-bold truncate">
              {chapter.work_title}
            </h1>
            <p className="text-[11px] opacity-75 truncate">
              {chapter.title} • {chapter.pen_name}
            </p>
          </div>
        </div>

        {/* Center: Reading Progress Bar */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-xs mx-6">
          <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-mono font-bold w-10 text-right">
            {progressPercent}%
          </span>
        </div>

        {/* Right: Controls & Menus */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Audio Listen Toggle Button */}
          <button
            onClick={() => {
              if (ttsActive && ttsPlaying) {
                pauseTTS();
              } else if (ttsActive && !ttsPlaying) {
                resumeTTS();
              } else {
                startTTS(activeParagraphIndex);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
              ttsActive
                ? 'bg-indigo-600 text-white animate-pulse'
                : 'bg-black/10 hover:bg-black/15'
            }`}
            title="Listen with Text-to-Speech"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {ttsActive ? (ttsPlaying ? 'Listening' : 'Paused') : 'Listen'}
            </span>
          </button>

          {/* Table of Contents */}
          <button
            onClick={() => setTocOpen(true)}
            className="p-2 rounded-lg hover:bg-black/5"
            title="Table of Contents"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Reading Appearance Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-black/5"
            title="Appearance Settings"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* FLOATING TEXT-TO-SPEECH CONTROLLER BAR */}
      {ttsActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1E1B4B] text-white px-5 py-3 rounded-full shadow-2xl border border-indigo-500/30 flex items-center gap-3 sm:gap-4 max-w-lg w-[90%] sm:w-auto animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-1">
            <button
              onClick={skipBackTTS}
              className="p-1.5 hover:bg-white/15 rounded-full transition-colors"
              title="Skip to previous paragraph"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={ttsPlaying ? pauseTTS : resumeTTS}
              className="p-2.5 bg-white text-[#1E1B4B] hover:bg-indigo-100 rounded-full transition-transform active:scale-95 shadow-md"
              title={ttsPlaying ? 'Pause' : 'Play'}
            >
              {ttsPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={skipForwardTTS}
              className="p-1.5 hover:bg-white/15 rounded-full transition-colors"
              title="Skip to next paragraph"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={stopTTS}
              className="p-1.5 hover:bg-white/15 rounded-full transition-colors text-rose-300"
              title="Stop listening"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-white/20 hidden sm:block" />

          {/* Reading Rate Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 hidden sm:inline">Speed:</span>
            <select
              value={ttsRate}
              onChange={(e) => {
                const newRate = parseFloat(e.target.value);
                setTtsRate(newRate);
                if (ttsPlaying) {
                  speakParagraph(ttsParagraphIndex);
                }
              }}
              className="bg-white/15 text-white text-xs font-semibold py-1 px-2 rounded-lg border-none focus:outline-none"
            >
              <option value="0.75" className="text-black">0.75x</option>
              <option value="1.0" className="text-black">1.0x</option>
              <option value="1.25" className="text-black">1.25x</option>
              <option value="1.5" className="text-black">1.5x</option>
              <option value="2.0" className="text-black">2.0x</option>
            </select>
          </div>

          {/* Voice Selector if available */}
          {availableVoices.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5">
              <select
                value={ttsVoice || ''}
                onChange={(e) => {
                  setTtsVoice(e.target.value);
                  if (ttsPlaying) speakParagraph(ttsParagraphIndex);
                }}
                className="bg-white/15 text-white text-xs py-1 px-2 rounded-lg max-w-[120px] truncate focus:outline-none"
              >
                {availableVoices.map(v => (
                  <option key={v.name} value={v.name} className="text-black">
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Main Reading Surface */}
      <main className="max-w-3xl mx-auto px-6 sm:px-8 py-12 md:py-16">
        {/* Chapter Header */}
        <div className="text-center mb-12 pb-8 border-b border-black/10">
          <span className="text-xs uppercase tracking-widest font-semibold opacity-70 block mb-1">
            {chapter.work_title}
          </span>
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight mb-2">
            {chapter.title}
          </h2>
          <span className="font-serif-body text-xs sm:text-sm italic opacity-80">
            By {chapter.pen_name}
          </span>
        </div>

        {/* Reading Text Container */}
        <div
          ref={contentRef}
          className={`${getFontFamilyClass()} leading-loose space-y-6 select-text transition-all`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {viewMode === 'paginated' ? (
            /* Paginated View */
            <div className="space-y-6 animate-in fade-in duration-200">
              {pages[currentPageIndex]?.paragraphs.map((p, idx) => {
                const absIdx = pages[currentPageIndex].startIndex + idx;
                const isSpoken = ttsActive && ttsParagraphIndex === absIdx;

                return (
                  <p
                    key={absIdx}
                    ref={el => paragraphRefs.current[absIdx] = el}
                    onClick={() => {
                      if (ttsActive) speakParagraph(absIdx);
                    }}
                    className={`transition-all rounded-lg p-2 ${
                      isSpoken
                        ? 'bg-indigo-500/20 font-medium scale-[1.01] shadow-xs'
                        : 'hover:bg-black/2'
                    }`}
                  >
                    {p}
                  </p>
                );
              })}

              {/* Paginated Navigation Bar */}
              <div className="pt-10 flex items-center justify-between border-t border-black/10 text-xs font-semibold">
                <button
                  disabled={currentPageIndex === 0 && !prevChapter}
                  onClick={() => {
                    if (currentPageIndex > 0) {
                      setCurrentPageIndex(prev => prev - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else if (prevChapter) {
                      onNavigate(`/read/${chapter.work_id}/${prevChapter.id}`);
                    }
                  }}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <span className="font-mono text-xs opacity-70">
                  Page {currentPageIndex + 1} of {pages.length}
                </span>

                <button
                  disabled={currentPageIndex === pages.length - 1 && !nextChapter}
                  onClick={() => {
                    if (currentPageIndex < pages.length - 1) {
                      setCurrentPageIndex(prev => prev + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else if (nextChapter) {
                      onNavigate(`/read/${chapter.work_id}/${nextChapter.id}`);
                    }
                  }}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Continuous Scroll View */
            paragraphs.map((p, idx) => {
              const isSpoken = ttsActive && ttsParagraphIndex === idx;

              return (
                <p
                  key={idx}
                  ref={el => paragraphRefs.current[idx] = el}
                  onClick={() => {
                    if (ttsActive) speakParagraph(idx);
                  }}
                  className={`transition-all rounded-xl p-2.5 ${
                    isSpoken
                      ? 'bg-indigo-500/25 ring-2 ring-indigo-400 font-medium scale-[1.01] shadow-xs'
                      : 'hover:bg-black/2'
                  }`}
                >
                  {p}
                </p>
              );
            })
          )}
        </div>

        {/* Chapter Footer Navigation */}
        <div className="mt-16 pt-8 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          {prevChapter ? (
            <button
              onClick={() => onNavigate(`/read/${chapter.work_id}/${prevChapter.id}`)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-black/5 hover:bg-black/10 transition-colors text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <div className="text-left">
                <span className="text-[10px] opacity-70 block uppercase">Previous Chapter</span>
                <span>{prevChapter.title}</span>
              </div>
            </button>
          ) : (
            <div />
          )}

          {nextChapter ? (
            <button
              onClick={() => onNavigate(`/read/${chapter.work_id}/${nextChapter.id}`)}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#1E1B4B] text-white hover:bg-[#312E81] transition-colors text-xs font-semibold shadow-md ml-auto"
            >
              <div className="text-right">
                <span className="text-[10px] text-indigo-200 block uppercase">Next Chapter</span>
                <span>{nextChapter.title}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-center sm:text-right ml-auto">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg inline-block">
                You've reached the latest chapter
              </span>
            </div>
          )}
        </div>
      </main>

      {/* TABLE OF CONTENTS DRAWER */}
      {tocOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-sm bg-white text-gray-900 h-full p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h3 className="font-display font-bold text-lg text-[#1E1B4B]">
                Table of Contents
              </h3>
              <button onClick={() => setTocOpen(false)} className="p-1 text-gray-500 hover:text-black">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 py-2">
              {toc.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setTocOpen(false);
                    onNavigate(`/read/${chapter.work_id}/${c.id}`);
                  }}
                  className={`w-full text-left p-3 text-xs flex items-center justify-between rounded-xl hover:bg-gray-50 transition-colors ${
                    c.id === chapter.id ? 'bg-[#F4EFE6] font-bold text-[#1E1B4B]' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate pr-2">
                    {c.chapter_number}. {c.title}
                  </span>
                  {c.id === chapter.id && (
                    <Check className="w-4 h-4 text-[#1E1B4B] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* READING SETTINGS MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <h3 className="font-display font-bold text-base text-[#1E1B4B]">
                Reading Customisation
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="p-1 text-gray-400 hover:text-black">
                ✕
              </button>
            </div>

            <div className="space-y-6 py-4">
              {/* Font Size Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-gray-700 uppercase mb-2">
                  <span>Text Size</span>
                  <span className="font-mono">{fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-serif">A</span>
                  <input
                    type="range"
                    min="14"
                    max="26"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-[#1E1B4B]"
                  />
                  <span className="text-xl font-serif">A</span>
                </div>
              </div>

              {/* Reading Theme Palette */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  Reading Palette
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'paper', label: 'Paper', bg: 'bg-[#FAF7F2] text-[#1E1B4B] border-[#DDD5C5]' },
                    { id: 'sepia', label: 'Sepia', bg: 'bg-[#F7F0DC] text-[#2C2416] border-[#DECBA4]' },
                    { id: 'indigo', label: 'Indigo', bg: 'bg-[#0E0C22] text-[#FAF7F2] border-[#2A265E]' },
                    { id: 'dark', label: 'Dark', bg: 'bg-[#121212] text-[#E0E0E0] border-[#333]' },
                    { id: 'light', label: 'White', bg: 'bg-white text-gray-900 border-gray-300' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`p-2 rounded-xl text-center border text-xs font-semibold transition-all ${t.bg} ${
                        theme === t.id ? 'ring-2 ring-indigo-600 scale-105' : ''
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  Typography
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setFontFamily('serif')}
                    className={`p-2.5 rounded-xl border text-left font-serif-body font-semibold ${
                      fontFamily === 'serif' ? 'border-[#1E1B4B] bg-[#F4EFE6]' : 'border-gray-200'
                    }`}
                  >
                    Literary Serif
                  </button>
                  <button
                    onClick={() => setFontFamily('sans')}
                    className={`p-2.5 rounded-xl border text-left font-sans font-semibold ${
                      fontFamily === 'sans' ? 'border-[#1E1B4B] bg-[#F4EFE6]' : 'border-gray-200'
                    }`}
                  >
                    Modern Sans
                  </button>
                  <button
                    onClick={() => setFontFamily('display')}
                    className={`p-2.5 rounded-xl border text-left font-display font-semibold ${
                      fontFamily === 'display' ? 'border-[#1E1B4B] bg-[#F4EFE6]' : 'border-gray-200'
                    }`}
                  >
                    Editorial Display
                  </button>
                  <button
                    onClick={() => setFontFamily('mono')}
                    className={`p-2.5 rounded-xl border text-left font-mono font-semibold ${
                      fontFamily === 'mono' ? 'border-[#1E1B4B] bg-[#F4EFE6]' : 'border-gray-200'
                    }`}
                  >
                    Typewriter Mono
                  </button>
                </div>
              </div>

              {/* Reading Layout Mode */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  Reading Experience Mode
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setViewMode('scroll')}
                    className={`p-2.5 rounded-xl border text-left font-medium ${
                      viewMode === 'scroll' ? 'border-[#1E1B4B] bg-[#F4EFE6] font-bold' : 'border-gray-200'
                    }`}
                  >
                    Seamless Scroll
                  </button>
                  <button
                    onClick={() => setViewMode('paginated')}
                    className={`p-2.5 rounded-xl border text-left font-medium ${
                      viewMode === 'paginated' ? 'border-[#1E1B4B] bg-[#F4EFE6] font-bold' : 'border-gray-200'
                    }`}
                  >
                    Page-by-Page Flip
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-5 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
