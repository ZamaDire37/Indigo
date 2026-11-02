import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Feather,
  PlusCircle,
  Edit,
  Trash2,
  Check,
  BookOpen,
  Eye,
  Star,
  ExternalLink,
  AlertTriangle,
  Upload
} from 'lucide-react';

export default function PenNamesPage({ onNavigate }) {
  const {
    user,
    penNames,
    activePenName,
    selectActivePenName,
    createPenName,
    updatePenName,
    deletePenName,
    fetchUser
  } = useAuth();

  const [detailedPenNames, setDetailedPenNames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit form state
  const [editingPenName, setEditingPenName] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete / Ownership Handling Modal
  const [deletingPenName, setDeletingPenName] = useState(null);
  const [deleteResolution, setDeleteResolution] = useState(null);
  const [deleteAction, setDeleteAction] = useState('transfer'); // 'transfer' or 'delete_works'
  const [transferTargetId, setTransferTargetId] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchDetailedPenNames = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/pen-names');
      setDetailedPenNames(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailedPenNames();
  }, [penNames]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmittingCreate(true);
    try {
      await createPenName(newName, newBio, newAvatar);
      setShowCreateModal(false);
      setNewName('');
      setNewBio('');
      setNewAvatar('');
      fetchDetailedPenNames();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleStartEdit = (pn) => {
    setEditingPenName(pn);
    setEditName(pn.name);
    setEditBio(pn.bio || '');
    setEditAvatar(pn.avatar_url || '');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editingPenName) return;

    setSubmittingEdit(true);
    try {
      await updatePenName(editingPenName.id, editName, editBio, editAvatar);
      setEditingPenName(null);
      fetchDetailedPenNames();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleStartDelete = async (pn) => {
    if (penNames.length <= 1) {
      alert('You must maintain at least one pen name on your author account. Create a new pen name first.');
      return;
    }

    setDeletingPenName(pn);
    setDeleteResolution(null);
    // Find default transfer candidate (first pen name that isn't this one)
    const other = penNames.find(p => p.id !== pn.id);
    if (other) setTransferTargetId(other.id);

    try {
      // Try soft delete; if works exist, server will return requiresResolution
      await apiRequest(`/pen-names/${pn.id}`, {
        method: 'DELETE',
        body: JSON.stringify({})
      });
      // If it deleted without error (0 works):
      await fetchUser();
      fetchDetailedPenNames();
      setDeletingPenName(null);
    } catch (err) {
      // Needs resolution modal
      setDeleteResolution({
        message: err.message,
        worksCount: pn.published_works_count || 1
      });
    }
  };

  const handleConfirmDeleteWithResolution = async () => {
    if (!deletingPenName) return;

    setSubmittingDelete(true);
    try {
      await deletePenName(deletingPenName.id, deleteAction, transferTargetId);
      await fetchUser();
      fetchDetailedPenNames();
      setDeletingPenName(null);
      setDeleteResolution(null);
    } catch (err) {
      alert('Deletion failed: ' + err.message);
    } finally {
      setSubmittingDelete(false);
    }
  };

  return (
    <div className="min-h-screen py-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-[#7A759C]">
            AUTHOR PERSONAS
          </span>
          <h1 className="font-cinzel text-3xl font-extrabold text-[#1E1B4B]">
            Multiple Pen Names
          </h1>
          <p className="text-xs sm:text-sm text-[#5D597E] mt-1 font-serif-body">
            Publish distinct genres under different identities. Readers see only the selected pen name for each work.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl hover:bg-[#312E81] transition-all shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Pen Name</span>
        </button>
      </div>

      {/* Pen Names Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {detailedPenNames.map((pn) => {
          const isActive = activePenName?.id === pn.id;

          return (
            <div
              key={pn.id}
              className={`bg-white border rounded-3xl p-6 shadow-xs flex flex-col justify-between transition-all ${
                isActive ? 'border-[#1E1B4B] ring-2 ring-[#1E1B4B]/10' : 'border-[#E5DECF]'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {pn.avatar_url ? (
                      <img
                        src={pn.avatar_url}
                        alt={pn.name}
                        className="w-12 h-12 rounded-full object-cover border border-[#DDD5C5]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#1E1B4B] text-white flex items-center justify-center font-bold text-base">
                        {pn.name.charAt(0)}
                      </div>
                    )}

                    <div>
                      <h3 className="font-display text-lg font-bold text-[#1E1B4B]">
                        {pn.name}
                      </h3>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" />
                          <span>Active Publishing Persona</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => selectActivePenName(pn)}
                          className="text-[11px] font-semibold text-[#312E81] hover:underline"
                        >
                          Switch to this pen name
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(pn)}
                      className="p-2 text-gray-500 hover:text-[#1E1B4B] rounded-lg hover:bg-gray-100"
                      title="Edit pen name"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartDelete(pn)}
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Delete pen name"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-xs text-[#48446B] font-serif-body leading-relaxed mb-4 min-h-[40px]">
                  {pn.bio || 'No biography written for this pen name.'}
                </p>

                {/* Stats */}
                <div className="py-2.5 px-3.5 bg-[#FAF7F2] rounded-xl border border-[#EAE3D5] flex items-center justify-between text-xs text-[#55507E]">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#67628E]" />
                    <span><strong>{pn.published_works_count || 0}</strong> Works</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#67628E]" />
                    <span><strong>{Number(pn.total_reads || 0).toLocaleString()}</strong> Total Reads</span>
                  </div>
                </div>
              </div>

              {/* Bottom links */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => onNavigate(`/author/${pn.id}`)}
                  className="flex items-center gap-1 text-[#312E81] font-semibold hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Public Author Page</span>
                </button>

                <button
                  onClick={() => onNavigate(`/write`)}
                  className="px-3 py-1 bg-[#1E1B4B] text-white rounded-lg text-xs font-semibold hover:bg-[#312E81]"
                >
                  Write under {pn.name}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE PEN NAME MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95">
            <h3 className="font-display font-bold text-lg text-[#1E1B4B] mb-2">
              Create New Pen Name
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Add a new author identity for your account. You can switch between pen names at any time.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Pen Name Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. MidnightInk, The Poet, S. K. Vance"
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Author Biography
                </label>
                <textarea
                  rows={3}
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="Describe your writing focus, inspirations, and aesthetic..."
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Avatar Picture URL
                </label>
                <input
                  type="text"
                  value={newAvatar}
                  onChange={(e) => setNewAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:border-[#1E1B4B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 text-xs font-semibold bg-[#1E1B4B] text-white rounded-xl hover:bg-[#312E81] disabled:opacity-50"
                >
                  {submittingCreate ? 'Creating...' : 'Create Pen Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PEN NAME MODAL */}
      {editingPenName && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 animate-in zoom-in-95">
            <h3 className="font-display font-bold text-lg text-[#1E1B4B] mb-2">
              Edit Pen Name
            </h3>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Pen Name Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Author Biography
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Avatar Picture URL
                </label>
                <input
                  type="text"
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-xs text-[#1E1B4B]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPenName(null)}
                  className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2 text-xs font-semibold bg-[#1E1B4B] text-white rounded-xl hover:bg-[#312E81] disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OWNERSHIP HANDLING MODAL WHEN DELETING PEN NAME */}
      {deleteResolution && deletingPenName && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-700 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-display font-bold text-lg text-gray-900">
                Confirm Pen Name Deletion & Works Ownership
              </h3>
            </div>

            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              <strong>{deletingPenName.name}</strong> currently has published or draft literary works associated with it. Please select how you want to handle these works:
            </p>

            <div className="space-y-3 mb-6 text-xs">
              {/* Option A: Transfer works to another pen name */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="delAction"
                  checked={deleteAction === 'transfer'}
                  onChange={() => setDeleteAction('transfer')}
                  className="mt-0.5 text-[#1E1B4B]"
                />
                <div className="flex-1">
                  <span className="font-bold text-gray-900 block">
                    Transfer published works to another pen name (Recommended)
                  </span>
                  <span className="text-gray-500 block mt-0.5">
                    Your stories and reader comments remain intact under a different author identity.
                  </span>

                  {deleteAction === 'transfer' && (
                    <div className="mt-2.5">
                      <select
                        value={transferTargetId}
                        onChange={(e) => setTransferTargetId(e.target.value)}
                        className="w-full p-2 bg-[#FAF7F2] border border-[#DDD5C5] rounded-lg text-xs font-semibold"
                      >
                        {penNames
                          .filter(p => p.id !== deletingPenName.id)
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              Transfer to: {p.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </label>

              {/* Option B: Permanently delete all works */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 cursor-pointer text-rose-950">
                <input
                  type="radio"
                  name="delAction"
                  checked={deleteAction === 'delete_works'}
                  onChange={() => setDeleteAction('delete_works')}
                  className="mt-0.5 text-rose-600"
                />
                <div>
                  <span className="font-bold text-rose-900 block">
                    Permanently delete all works under this pen name
                  </span>
                  <span className="text-rose-700 block mt-0.5">
                    Warning: All chapters, reader ratings, and discussion comments will be irreversibly erased.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingPenName(null);
                  setDeleteResolution(null);
                }}
                className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteWithResolution}
                disabled={submittingDelete}
                className="px-5 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 shadow-xs"
              >
                {submittingDelete ? 'Processing...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
