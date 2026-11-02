import React, { useState } from 'react';
import { apiRequest } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Lock,
  User,
  ShieldAlert,
  CheckCircle,
  FileText,
  KeyRound
} from 'lucide-react';

export default function SettingsPage({ onNavigate, onOpenAuth }) {
  const { user, fetchUser } = useAuth();

  // Profile fields
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  // Reset Token Form
  const [resetToken, setResetToken] = useState('');
  const [tokenNewPassword, setTokenNewPassword] = useState('');
  const [tokenMsg, setTokenMsg] = useState('');

  // Appeal fields
  const [appealType, setAppealType] = useState('suspension');
  const [appealReason, setAppealReason] = useState('');
  const [appealMsg, setAppealMsg] = useState('');

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 text-center bg-white rounded-3xl border border-gray-200">
        <h2 className="font-display text-xl font-bold text-[#1E1B4B]">Sign in required</h2>
        <p className="text-xs text-gray-500 mt-2">Please sign in to access your account settings.</p>
        <button
          onClick={() => onOpenAuth('login')}
          className="mt-4 px-4 py-2 bg-[#1E1B4B] text-white text-xs font-semibold rounded-xl"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ username, email })
      });
      setProfileMsg('Account profile successfully updated.');
      fetchUser();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    try {
      await apiRequest('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setPasswordMsg('Password successfully changed.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetWithToken = async (e) => {
    e.preventDefault();
    setTokenMsg('');
    try {
      const res = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ resetToken, newPassword: tokenNewPassword })
      });
      setTokenMsg(res.message);
      setResetToken('');
      setTokenNewPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmitAppeal = async (e) => {
    e.preventDefault();
    setAppealMsg('');
    try {
      const res = await apiRequest('/admin/appeals', {
        method: 'POST',
        body: JSON.stringify({ action_type: appealType, reason: appealReason })
      });
      setAppealMsg(res.message);
      setAppealReason('');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen py-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A759C]">
          ACCOUNT MANAGEMENT
        </span>
        <h1 className="font-cinzel text-3xl font-extrabold text-[#1E1B4B]">
          Settings & Security
        </h1>
        <p className="text-xs sm:text-sm text-[#5D597E] mt-1 font-serif-body">
          Manage your account credentials, security preferences, and moderation inquiries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Information */}
        <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <User className="w-4 h-4 text-[#1E1B4B]" />
            <h3 className="font-display font-bold text-base text-[#1E1B4B]">
              Account Profile
            </h3>
          </div>

          {profileMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl mb-4">
              {profileMsg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#1E1B4B] text-white font-semibold rounded-xl hover:bg-[#312E81]"
            >
              Update Profile
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Lock className="w-4 h-4 text-[#1E1B4B]" />
            <h3 className="font-display font-bold text-base text-[#1E1B4B]">
              Change Password
            </h3>
          </div>

          {passwordMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl mb-4">
              {passwordMsg}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#1E1B4B] text-white font-semibold rounded-xl hover:bg-[#312E81]"
            >
              Change Password
            </button>
          </form>
        </div>
      </div>

      {/* Moderation Appeal Submission Card */}
      <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          <ShieldAlert className="w-5 h-5 text-indigo-700" />
          <h3 className="font-display font-bold text-base text-[#1E1B4B]">
            Submit a Moderation Appeal
          </h3>
        </div>
        <p className="text-xs text-gray-600 mb-4 font-serif-body leading-relaxed">
          If your account was suspended or an administrative action unpublished your work, you may submit a formal appeal directly to the Indigo administrative tribunal.
        </p>

        {appealMsg && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs rounded-xl mb-4">
            {appealMsg}
          </div>
        )}

        <form onSubmit={handleSubmitAppeal} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">Action Being Appealed</label>
            <select
              value={appealType}
              onChange={(e) => setAppealType(e.target.value)}
              className="w-full sm:w-72 p-2 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl font-medium"
            >
              <option value="suspension">Account Suspension</option>
              <option value="work_removed">Work Removal / Moderation Flag</option>
              <option value="comment_removed">Comment Deletion</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">Detailed Explanation & Case Statement</label>
            <textarea
              rows={4}
              required
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Explain the background context, clarify originality, or appeal false flagging..."
              className="w-full p-3 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-gray-900 focus:outline-none focus:border-[#1E1B4B]"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-[#1E1B4B] text-white font-semibold rounded-xl hover:bg-[#312E81]"
          >
            Submit Appeal for Review
          </button>
        </form>
      </div>

      {/* Password Reset Token Form */}
      <div className="bg-white border border-[#E5DECF] rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
          <KeyRound className="w-4 h-4 text-[#1E1B4B]" />
          <h3 className="font-display font-bold text-base text-[#1E1B4B]">
            Reset Password with Token
          </h3>
        </div>

        {tokenMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl mb-4">
            {tokenMsg}
          </div>
        )}

        <form onSubmit={handleResetWithToken} className="space-y-4 text-xs max-w-md">
          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">Reset Token</label>
            <input
              type="text"
              required
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Paste UUID token received from forgot password..."
              className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 uppercase mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={tokenNewPassword}
              onChange={(e) => setTokenNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 bg-[#FAF7F2] border border-[#DDD5C5] rounded-xl text-[#1E1B4B]"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#1E1B4B] text-white font-semibold rounded-xl hover:bg-[#312E81]"
          >
            Set New Password
          </button>
        </form>
      </div>
    </div>
  );
}
