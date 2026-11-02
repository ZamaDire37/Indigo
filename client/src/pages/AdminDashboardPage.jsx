import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Users,
  BookOpen,
  Eye,
  MessageSquare,
  AlertTriangle,
  FileCheck,
  Check,
  X,
  Search,
  ExternalLink,
  Ban,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function AdminDashboardPage({ onNavigate }) {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'users', 'content', 'reports', 'appeals'
  const [loading, setLoading] = useState(true);

  // Stats data
  const [statsData, setStatsData] = useState(null);

  // Users data
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  // Content moderation data
  const [worksList, setWorksList] = useState([]);
  const [contentSearch, setContentSearch] = useState('');

  // Reports data
  const [reportsList, setReportsList] = useState([]);
  const [reportFilter, setReportFilter] = useState('all');

  // Appeals data
  const [appealsList, setAppealsList] = useState([]);

  const fetchStats = async () => {
    try {
      const res = await apiRequest('/admin/stats');
      setStatsData(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await apiRequest('/admin/users');
      setUsersList(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorks = async () => {
    try {
      const res = await apiRequest('/admin/works');
      setWorksList(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async (status = reportFilter) => {
    try {
      const endpoint = status !== 'all' ? `/admin/reports?status=${status}` : '/admin/reports';
      const res = await apiRequest(endpoint);
      setReportsList(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppeals = async () => {
    try {
      const res = await apiRequest('/admin/appeals');
      setAppealsList(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      setLoading(true);
      Promise.all([fetchStats(), fetchUsers(), fetchWorks(), fetchReports(), fetchAppeals()])
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  // Suspend / Unsuspend user
  const handleToggleSuspendUser = async (userId, currentSuspended) => {
    if (!confirm(`Are you sure you want to ${currentSuspended ? 'reinstate' : 'suspend'} this account?`)) return;
    try {
      await apiRequest(`/admin/users/${userId}/suspend`, { method: 'PUT' });
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  // Moderate Work (Remove / Restore)
  const handleModerateWork = async (workId, action) => {
    const reason = action === 'remove'
      ? prompt('Enter moderation reason for removal (will be sent to author):', 'Violation of platform community standards')
      : null;
    if (action === 'remove' && !reason) return;

    try {
      await apiRequest(`/admin/works/${workId}/moderation`, {
        method: 'PUT',
        body: JSON.stringify({ action, reason })
      });
      fetchWorks();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  // Resolve / Dismiss Report
  const handleUpdateReportStatus = async (reportId, newStatus) => {
    try {
      await apiRequest(`/admin/reports/${reportId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      fetchReports();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  // Review Appeal
  const handleReviewAppeal = async (appealId, decision) => {
    const adminNotes = prompt(`Enter administrator decision notes for ${decision}:`, 'Reviewed in accordance with Indigo publishing bylaws.');
    try {
      await apiRequest(`/admin/appeals/${appealId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: decision, admin_notes: adminNotes })
      });
      fetchAppeals();
      fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-24 p-8 text-center bg-white rounded-3xl border border-rose-200">
        <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto mb-3" />
        <h2 className="font-display text-xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-xs text-gray-600 mt-2">
          Administrator credentials are required to view this dashboard.
        </p>
        <button
          onClick={() => onNavigate('/')}
          className="mt-4 px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
              ADMINISTRATIVE HARBOR
            </span>
          </div>
          <h1 className="font-cinzel text-3xl font-extrabold text-[#1E1B4B] mt-1">
            Indigo Admin & Moderation Center
          </h1>
          <p className="text-xs text-[#5D597E] mt-0.5">
            Preserving immediate publication while maintaining editorial integrity, safety, and community standards.
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex flex-wrap items-center bg-white p-1 rounded-2xl border border-[#E5DECF] text-xs font-semibold shadow-xs">
          {[
            { id: 'stats', label: 'Platform Stats' },
            { id: 'users', label: `Users (${usersList.length})` },
            { id: 'content', label: `Content (${worksList.length})` },
            { id: 'reports', label: `Reports (${statsData?.metrics?.pendingReports || 0})` },
            { id: 'appeals', label: `Appeals (${statsData?.metrics?.pendingAppeals || 0})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#1E1B4B] text-white shadow-xs'
                  : 'text-gray-600 hover:text-black hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-500 font-serif">
          Loading platform telemetries...
        </div>
      ) : (
        <>
          {/* TAB 1: PLATFORM OVERVIEW STATISTICS */}
          {activeTab === 'stats' && statsData && (
            <div className="space-y-8">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Registered Users', val: statsData.metrics.totalUsers, icon: Users, color: 'text-blue-600' },
                  { label: 'Published Works', val: statsData.metrics.publishedWorks, icon: BookOpen, color: 'text-indigo-600' },
                  { label: 'Total Reads', val: Number(statsData.metrics.totalReads).toLocaleString(), icon: Eye, color: 'text-emerald-600' },
                  { label: 'Reader Comments', val: statsData.metrics.totalComments, icon: MessageSquare, color: 'text-purple-600' },
                  { label: 'Pending Reports', val: statsData.metrics.pendingReports, icon: AlertTriangle, color: 'text-rose-600' },
                  { label: 'Pending Appeals', val: statsData.metrics.pendingAppeals, icon: FileCheck, color: 'text-amber-600' }
                ].map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-[#E5DECF] shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{m.label}</span>
                        <Icon className={`w-4 h-4 ${m.color}`} />
                      </div>
                      <span className="font-display text-2xl font-bold text-[#1E1B4B]">{m.val}</span>
                    </div>
                  );
                })}
              </div>

              {/* Popular Books & Active Writers Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Most Popular Works */}
                <div className="bg-white p-6 rounded-3xl border border-[#E5DECF] shadow-xs">
                  <h3 className="font-display font-bold text-base text-[#1E1B4B] mb-4">
                    Most Popular Published Works
                  </h3>
                  <div className="divide-y divide-gray-100">
                    {statsData.popularBooks?.map(b => (
                      <div key={b.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-gray-900 block">{b.title}</span>
                          <span className="text-gray-500">By {b.pen_name} • {b.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#1E1B4B] block">{Number(b.reads_count).toLocaleString()} reads</span>
                          <span className="text-amber-600 font-semibold">{b.avg_rating || 'New'} ★</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Most Active Writers */}
                <div className="bg-white p-6 rounded-3xl border border-[#E5DECF] shadow-xs">
                  <h3 className="font-display font-bold text-base text-[#1E1B4B] mb-4">
                    Most Active Pen Names
                  </h3>
                  <div className="divide-y divide-gray-100">
                    {statsData.activeWriters?.map(w => (
                      <div key={w.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-gray-900 block">{w.name}</span>
                          <span className="text-gray-500">Account: @{w.username}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#1E1B4B] block">{w.works_count} works</span>
                          <span className="text-gray-500">{Number(w.total_reads).toLocaleString()} reads</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-3xl border border-[#E5DECF] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-lg text-[#1E1B4B]">
                  User Accounts Management
                </h3>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users..."
                  className="px-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Username / Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Pen Names</th>
                      <th className="py-3 px-4">Works Published</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList
                      .filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                      .map(u => (
                        <tr key={u.id} className="hover:bg-gray-50/60">
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900 block">@{u.username}</span>
                            <span className="text-gray-500 text-[11px]">{u.email}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === 'admin' ? 'bg-indigo-100 text-indigo-900' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">{u.pen_names_count || 0}</td>
                          <td className="py-3 px-4 font-mono font-bold">{u.works_count || 0}</td>
                          <td className="py-3 px-4">
                            {u.is_suspended ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Suspended
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleToggleSuspendUser(u.id, u.is_suspended)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                  u.is_suspended
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                }`}
                              >
                                {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CONTENT MODERATION */}
          {activeTab === 'content' && (
            <div className="bg-white rounded-3xl border border-[#E5DECF] p-6 shadow-xs">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-lg text-[#1E1B4B]">
                  Published Works Catalog & Moderation
                </h3>
                <input
                  type="text"
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  placeholder="Filter works by title or pen name..."
                  className="px-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4">Work Title</th>
                      <th className="py-3 px-4">Pen Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Reads</th>
                      <th className="py-3 px-4">Reports</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Moderation Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {worksList
                      .filter(w => w.title.toLowerCase().includes(contentSearch.toLowerCase()) || w.pen_name.toLowerCase().includes(contentSearch.toLowerCase()))
                      .map(w => (
                        <tr key={w.id} className="hover:bg-gray-50/60">
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-900 block">{w.title}</span>
                            <span className="text-gray-400 text-[10px]">Owner: @{w.owner_username}</span>
                          </td>
                          <td className="py-3 px-4 font-serif">{w.pen_name}</td>
                          <td className="py-3 px-4 uppercase text-[10px] font-bold">{w.category}</td>
                          <td className="py-3 px-4 font-mono font-bold">{Number(w.reads_count).toLocaleString()}</td>
                          <td className="py-3 px-4">
                            {w.reports_count > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                {w.reports_count} Flagged
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {w.is_published ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Published
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Removed / Unpublished
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => onNavigate(`/book/${w.id}`)}
                                className="p-1 text-gray-500 hover:text-black"
                                title="Open book page"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                              {w.is_published ? (
                                <button
                                  onClick={() => handleModerateWork(w.id, 'remove')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-800 hover:bg-rose-200"
                                >
                                  Remove Work
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleModerateWork(w.id, 'restore')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                >
                                  Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: REPORT MANAGEMENT */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-3xl border border-[#E5DECF] p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="font-display font-bold text-lg text-[#1E1B4B]">
                    Community Reports Triage
                  </h3>
                  <p className="text-xs text-gray-500">
                    Review complaints regarding plagiarism, copyright, harassment, or spam.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-xl border border-[#DDD5C5] text-xs">
                  {['all', 'pending', 'resolved', 'dismissed'].map(f => (
                    <button
                      key={f}
                      onClick={() => {
                        setReportFilter(f);
                        fetchReports(f);
                      }}
                      className={`px-3 py-1 rounded-lg transition-colors ${
                        reportFilter === f ? 'bg-[#1E1B4B] text-white font-bold' : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {reportsList.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-10 italic">
                    No reports match this status.
                  </p>
                ) : (
                  reportsList.map(r => (
                    <div key={r.id} className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DECF] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-indigo-900">
                            Target: {r.target_type}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'pending' ? 'bg-amber-100 text-amber-800' : r.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {r.status}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Reported by @{r.reporter_username} on {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="font-bold text-xs text-gray-900 mt-1">
                          Reason: {r.reason}
                        </p>
                        {r.details && (
                          <p className="text-xs text-gray-600 mt-0.5 font-serif-body">
                            "{r.details}"
                          </p>
                        )}
                        {r.targetInfo && (
                          <div className="mt-2 text-[11px] text-indigo-900 bg-white p-2 rounded-lg border border-gray-200 inline-block">
                            Referenced Item: <strong>{r.targetInfo.title || r.targetInfo.username || r.targetInfo.content?.substring(0, 50)}</strong>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {r.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateReportStatus(r.id, 'resolved')}
                              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleUpdateReportStatus(r.id, 'dismissed')}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-300"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: APPEALS WORKFLOW */}
          {activeTab === 'appeals' && (
            <div className="bg-white rounded-3xl border border-[#E5DECF] p-6 shadow-xs">
              <h3 className="font-display font-bold text-lg text-[#1E1B4B] mb-2">
                User Moderation Appeals
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Indigo allows writers and users to appeal suspensions or content removal actions.
              </p>

              <div className="space-y-4">
                {appealsList.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-10 italic">
                    No active user appeals.
                  </p>
                ) : (
                  appealsList.map(a => (
                    <div key={a.id} className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DECF] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-bold text-xs text-gray-900">@{a.username}</span>
                          <span className="text-[10px] text-gray-400">({a.email})</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.status === 'pending' ? 'bg-amber-100 text-amber-800' : a.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {a.status}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-gray-800">
                          Action Appealed: {a.action_type}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 font-serif-body">
                          Reason given: "{a.reason}"
                        </p>
                        {a.admin_notes && (
                          <p className="text-[11px] text-indigo-900 mt-2 font-medium bg-white p-2 rounded-lg border border-gray-200">
                            Admin resolution notes: {a.admin_notes}
                          </p>
                        )}
                      </div>

                      {a.status === 'pending' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleReviewAppeal(a.id, 'approved')}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                          >
                            Approve Appeal
                          </button>
                          <button
                            onClick={() => handleReviewAppeal(a.id, 'rejected')}
                            className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
