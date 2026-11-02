import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import {
  MessageSquare,
  BookOpen,
  Eye,
  AlertTriangle,
  Send,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function CommunityPage({ onNavigate }) {
  const [works, setWorks] = useState([]);
  const [selectedWorkId, setSelectedWorkId] = useState('all');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealedSpoilers, setRevealedSpoilers] = useState({});

  useEffect(() => {
    apiRequest('/works?limit=30')
      .then(res => setWorks(res.works || []))
      .catch(console.error);
  }, []);

  const fetchCommunityDiscussions = async (workId) => {
    setLoading(true);
    try {
      if (workId === 'all') {
        // Fetch comments for all works by gathering top works comments
        const topWorks = works.slice(0, 5);
        const results = await Promise.all(
          topWorks.map(w =>
            apiRequest(`/works/${w.id}/comments`)
              .then(list => list.map(c => ({ ...c, work_title: w.title, work_id: w.id })))
              .catch(() => [])
          )
        );
        setComments(results.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      } else {
        const list = await apiRequest(`/works/${workId}/comments`);
        const targetWork = works.find(w => w.id === workId);
        setComments(list.map(c => ({ ...c, work_title: targetWork?.title, work_id: workId })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (works.length > 0) {
      fetchCommunityDiscussions(selectedWorkId);
    }
  }, [selectedWorkId, works]);

  const toggleSpoiler = (id) => {
    setRevealedSpoilers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A759C]">
          LITERARY FORUM
        </span>
        <h1 className="font-cinzel text-3xl font-extrabold text-[#1E1B4B]">
          Community Discussions
        </h1>
        <p className="text-xs sm:text-sm text-[#5D597E] mt-1 font-serif-body">
          Engage with fellow readers, explore literary interpretations, and share observations.
        </p>
      </div>

      {/* Book Filter Select */}
      <div className="bg-white border border-[#E5DECF] rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#55507E]" />
          <span className="text-xs font-bold text-[#1E1B4B]">Filter by Book:</span>
        </div>

        <select
          value={selectedWorkId}
          onChange={(e) => setSelectedWorkId(e.target.value)}
          className="w-full sm:w-auto p-2 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs font-medium text-[#1E1B4B] focus:outline-none"
        >
          <option value="all">All Books Across Indigo</option>
          {works.map(w => (
            <option key={w.id} value={w.id}>{w.title}</option>
          ))}
        </select>
      </div>

      {/* Discussions Feed */}
      {loading ? (
        <div className="py-24 text-center text-gray-500 font-serif">
          Gathering community observations...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-16 bg-white/70 rounded-3xl border border-dashed border-[#DDD5C5] p-8">
          <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-600">No discussions yet for this selection.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(c => {
            const isSpoilerHidden = c.is_spoiler && !revealedSpoilers[c.id];

            return (
              <div
                key={c.id}
                className="bg-white border border-[#E5DECF] rounded-2xl p-5 shadow-xs hover:border-[#1E1B4B]/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1E1B4B] text-white flex items-center justify-center font-bold text-xs uppercase">
                      {c.username.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#1E1B4B] block leading-none">{c.username}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {c.work_title && (
                    <button
                      onClick={() => onNavigate(`/book/${c.work_id}`)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#312E81] hover:underline bg-[#FAF7F2] px-2.5 py-1 rounded-md border border-[#EAE3D5]"
                    >
                      <span>{c.work_title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {isSpoilerHidden ? (
                  <div
                    onClick={() => toggleSpoiler(c.id)}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 cursor-pointer flex items-center justify-between"
                  >
                    <span className="italic">Observation contains potential plot spoilers. Click to reveal.</span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                ) : (
                  <p className="text-xs text-[#383457] leading-relaxed font-serif-body whitespace-pre-line">
                    {c.content}
                  </p>
                )}

                {/* Replies preview if any */}
                {c.replies && c.replies.length > 0 && (
                  <div className="mt-3 pl-3 border-l-2 border-[#DDD5C5] space-y-2">
                    {c.replies.map(r => (
                      <div key={r.id} className="text-xs bg-[#FAF7F2] p-2.5 rounded-xl">
                        <span className="font-bold text-[#1E1B4B] text-[11px] block">{r.username}</span>
                        <p className="text-gray-700 text-xs mt-0.5">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
