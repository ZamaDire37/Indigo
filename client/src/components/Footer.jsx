import React from 'react';
import { BookOpen, Feather, Heart, Shield, Sparkles } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-[#161436] text-[#D8D4E8] border-t border-[#29265C] pt-12 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] text-[#1E1B4B] flex items-center justify-center font-bold">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-cinzel text-xl font-bold tracking-wider text-[#FAF7F2]">
                INDIGO
              </span>
            </div>
            <p className="text-xs text-[#A9A4C6] leading-relaxed">
              Where words find a home. A free, open literary publishing house and community for novelists, poets, and storytellers worldwide.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#E0DCF0]">
              <Shield className="w-3.5 h-3.5 text-indigo-300" />
              <span>100% Free • Writer Owned • Immediate</span>
            </div>
          </div>

          {/* Publishing */}
          <div>
            <h4 className="font-serif text-sm font-semibold text-[#FAF7F2] tracking-wide mb-3">
              Publishing
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('/write')} className="hover:text-white transition-colors">
                  Create a Work
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/write')} className="hover:text-white transition-colors">
                  Upload Document (.docx, .pdf)
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/pen-names')} className="hover:text-white transition-colors">
                  Manage Multiple Pen Names
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/discover?category=novel')} className="hover:text-white transition-colors">
                  Serialized Novels
                </button>
              </li>
            </ul>
          </div>

          {/* Discovery */}
          <div>
            <h4 className="font-serif text-sm font-semibold text-[#FAF7F2] tracking-wide mb-3">
              Discovery
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('/discover?category=novel')} className="hover:text-white transition-colors">
                  Novels & Epics
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/discover?category=poem')} className="hover:text-white transition-colors">
                  Poetry Collections
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/discover?category=short_story')} className="hover:text-white transition-colors">
                  Short Stories
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/discover?sort=trending')} className="hover:text-white transition-colors">
                  Trending Rankings
                </button>
              </li>
            </ul>
          </div>

          {/* Literary Community */}
          <div>
            <h4 className="font-serif text-sm font-semibold text-[#FAF7F2] tracking-wide mb-3">
              Community & Safety
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('/community')} className="hover:text-white transition-colors">
                  Reader Discussions
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/library')} className="hover:text-white transition-colors">
                  Personal Reading Library
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/settings')} className="hover:text-white transition-colors">
                  Community Rules & Moderation
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/settings')} className="hover:text-white transition-colors">
                  Appeals & Inquiries
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#29265C] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8782A8]">
          <p>© {new Date().getFullYear()} INDIGO Publishing Platform. Writers retain full copyright to their works.</p>
          <p className="mt-2 sm:mt-0 flex items-center gap-1">
            Built with reverence for literature
          </p>
        </div>
      </div>
    </footer>
  );
}
