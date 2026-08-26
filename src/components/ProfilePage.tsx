import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Bot, BookOpen, Settings, LogOut, ChevronRight,
  Mail, Phone, Globe, Clock, User,
  ArrowLeft, Loader2, Save, X,
  Lock, Eye, EyeOff, Zap, Sparkles
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileData {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
}

interface AccountMetrics {
  memberSince: string;
  totalChats: number;
}

// ─── Sidebar Nav Items ──────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agents', label: 'Agent Center', icon: Bot, comingSoon: true },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, comingSoon: true },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // ─── State ──────────────────────────────────────────────────────────────
  const [activeNav, setActiveNav] = useState('dashboard');
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    timezone: 'UTC',
    language: 'English',
  });
  const [metrics, setMetrics] = useState<AccountMetrics>({
    memberSince: '',
    totalChats: 0,
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // ─── Load Profile Data ──────────────────────────────────────────────────

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);

    // Extract profile info from Supabase auth user
    const metadata = user.user_metadata || {};
    const email = user.email || '';
    const baseName = email.split('@')[0];
    const capitalizedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

    setProfile({
      full_name: metadata.full_name || metadata.name || capitalizedName,
      username: metadata.username || baseName,
      email,
      phone: metadata.phone || '',
      timezone: metadata.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      language: metadata.language || 'English',
    });

    // Load real metrics from database
    await loadMetrics();
    setLoading(false);
  };

  const loadMetrics = async () => {
    if (!user) return;

    // Member since - from user.created_at
    const memberSince = user.created_at
      ? new Date(user.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
      : 'Unknown';

    // Total chats - real count from conversations table
    const { count, error } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setMetrics({
      memberSince,
      totalChats: error ? 0 : (count || 0),
    });
  };

  // ─── Edit Profile Fields ────────────────────────────────────────────────

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveEdit = async (field: string) => {
    if (!user) return;
    setSaving(true);

    try {
      const updates: Record<string, string> = {};
      updates[field] = editValue;

      const { error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;

      setProfile((prev) => ({ ...prev, [field]: editValue }));
      setEditingField(null);
      setEditValue('');
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  // ─── Password Change ────────────────────────────────────────────────────

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setPasswordSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordSection(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  // ─── Sign Out ───────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  // ─── Render Profile Field Row ───────────────────────────────────────────

  const renderField = (label: string, field: string, value: string, icon: React.ReactNode) => {
    const isEditing = editingField === field;

    return (
      <div className="flex items-center justify-between py-3 border-b border-gray-800/50 last:border-0 group">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center text-gray-500 flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="bg-gray-800 text-white text-sm px-2 py-1 rounded-lg border border-blue-500/50 focus:outline-none focus:border-blue-400 w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(field);
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
            ) : (
              <p className="text-sm text-gray-200 truncate">{value || 'Not set'}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {isEditing ? (
            <>
              <button
                onClick={() => saveEdit(field)}
                disabled={saving}
                className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={cancelEdit}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => startEdit(field, value)}
              className="px-2 py-1 text-xs text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gray-950 circuit-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-gray-950 circuit-bg flex flex-col lg:flex-row">
      {/* ─── Left Sidebar Navigation ────────────────────────────────────── */}
      <aside className="w-full lg:w-64 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800/60 bg-gray-900/80 backdrop-blur-xl">
        {/* Back to Chat */}
        <div className="p-4 border-b border-gray-800/60">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.comingSoon) return;
                  setActiveNav(item.id);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 mb-1 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/20 text-white border border-blue-500/30'
                    : item.comingSoon
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.comingSoon && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-600 rounded">
                    Soon
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 text-blue-400" />}
              </button>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-gray-800/60 mt-auto">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/60 px-4 sm:px-6 py-4">
          <h1 className="text-xl font-bold text-white">Account and Settings</h1>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl">
          {/* ─── Profile Header Card ────────────────────────────────────── */}
          <div className="glass rounded-2xl p-6 sm:p-8 mb-6 text-center border border-gray-800/50">
            {/* Avatar */}
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-3xl font-bold text-white border-4 border-gray-900 shadow-xl shadow-blue-500/20">
              {profile.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{profile.full_name || 'User'}</h2>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Online</span>
              <span>·</span>
              <span>@{profile.username}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ─── Profile Overview ──────────────────────────────────────── */}
            <div className="glass rounded-2xl p-5 border border-gray-800/50">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                Profile Overview
              </h3>
              <div className="space-y-0">
                {renderField('Full Name', 'full_name', profile.full_name, <User className="w-4 h-4" />)}
                {renderField('Email Address', 'email', profile.email, <Mail className="w-4 h-4" />)}
                {renderField('Phone Number', 'phone', profile.phone, <Phone className="w-4 h-4" />)}
                {renderField('Time Zone', 'timezone', profile.timezone, <Clock className="w-4 h-4" />)}
                {renderField('Language', 'language', profile.language, <Globe className="w-4 h-4" />)}
              </div>
            </div>

            {/* ─── Account Metrics ──────────────────────────────────────── */}
            <div className="glass rounded-2xl p-5 border border-gray-800/50">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                Account Metrics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
                  <p className="text-xs text-gray-500 mb-1">Member Since</p>
                  <p className="text-lg font-bold text-white">{metrics.memberSince}</p>
                </div>
                <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
                  <p className="text-xs text-gray-500 mb-1">Total Chats</p>
                  <p className="text-lg font-bold text-white">{metrics.totalChats.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* ─── Subscription & Billing ──────────────────────────────── */}
            <div className="glass rounded-2xl p-5 border border-gray-800/50">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                Subscription & Billing
              </h3>
              <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 flex items-center justify-center border border-blue-500/20">
                      <Zap className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Free Plan</p>
                      <p className="text-xs text-gray-500">Basic features included</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg">
                    Active
                  </span>
                </div>
              </div>
              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-gray-800/50 text-gray-600 text-sm font-medium cursor-not-allowed border border-gray-700/30 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Upgrade (Coming Soon)
              </button>
            </div>

            {/* ─── Security ────────────────────────────────────────────── */}
            <div className="glass rounded-2xl p-5 border border-gray-800/50">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4">
                Security
              </h3>

              {/* Change Password */}
              <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Change Password</p>
                      <p className="text-xs text-gray-500">Update your password</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-500/30"
                  >
                    {showPasswordSection ? 'Cancel' : 'Change'}
                  </button>
                </div>

                {showPasswordSection && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-gray-700/30">
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="w-full bg-gray-900/50 text-white text-sm px-3 py-2.5 rounded-lg border border-gray-700/50 focus:outline-none focus:border-blue-500/50 pr-10"
                      />
                      <button
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-gray-900/50 text-white text-sm px-3 py-2.5 rounded-lg border border-gray-700/50 focus:outline-none focus:border-blue-500/50"
                    />
                    {passwordError && (
                      <p className="text-xs text-red-400">{passwordError}</p>
                    )}
                    {passwordSuccess && (
                      <p className="text-xs text-green-400">{passwordSuccess}</p>
                    )}
                    <button
                      onClick={handlePasswordChange}
                      disabled={changingPassword || !newPassword}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Log Out */}
              <button
                onClick={handleSignOut}
                className="w-full py-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium transition-colors border border-red-500/20 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
