import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Bot, BookOpen, Settings, LogOut, ChevronRight,
  Mail, Phone, Globe, Clock, User, Shield,
  ArrowLeft, Loader2, Save, X,
  Lock, Eye, EyeOff, Zap, Sparkles,
  MessageSquare, Camera,
  AlertTriangle, CheckCircle, Link2
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileData {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  avatar_url: string;
}

interface AccountMetrics {
  memberSince: string;
  totalChats: number;
  totalMessages: number;
  lastActive: string;
}

interface Integration {
  provider: string;
  connected: boolean;
  email?: string;
}

interface ModalState {
  type: 'profile' | 'metrics' | 'subscription' | 'security' | 'integrations' | null;
}

// ─── Sidebar Nav Items ──────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'agents', label: 'Agent Center', icon: Bot, comingSoon: true },
  { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen, comingSoon: true },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// ─── Main Component ─────────────────────────────────────────────────────────

function AvatarImage({ src, name, size = 'md' }: { src: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = size === 'lg' ? 'w-24 h-24 text-3xl' : size === 'md' ? 'w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl' : 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm';
  
  if (!src || imgError) {
    return (
      <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center font-bold text-white`}>
        {name?.charAt(0).toUpperCase() || 'U'}
      </div>
    );
  }
  
  return (
    <img
      src={src}
      alt={name || 'Profile'}
      className={`${sizeClasses} rounded-full object-cover`}
      onError={() => setImgError(true)}
    />
  );
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── State ──────────────────────────────────────────────────────────────
  const [activeNav, setActiveNav] = useState('dashboard');
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    timezone: 'UTC',
    language: 'English',
    avatar_url: '',
  });
  const [metrics, setMetrics] = useState<AccountMetrics>({
    memberSince: '',
    totalChats: 0,
    totalMessages: 0,
    lastActive: '',
  });
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: null });

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Detect if user signed in with Google
  const isGoogleUser = user?.app_metadata?.providers?.includes('google') || 
                       user?.identities?.some(i => i.provider === 'google');

  // ─── Load Profile Data ──────────────────────────────────────────────────

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);

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
      avatar_url: metadata.avatar_url || '',
    });

    await loadMetrics();
    await loadIntegrations();
    setLoading(false);
  };

  const loadMetrics = async () => {
    if (!user) return;

    const memberSince = user.created_at
      ? new Date(user.created_at).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
      : 'Unknown';

    const { count: convCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', 
        (await supabase.from('conversations').select('id').eq('user_id', user.id)).data?.map(c => c.id) || []
      );

    const { data: lastConv } = await supabase
      .from('conversations')
      .select('updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    setMetrics({
      memberSince,
      totalChats: convCount || 0,
      totalMessages: msgCount || 0,
      lastActive: lastConv?.updated_at 
        ? new Date(lastConv.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Never',
    });
  };

  const loadIntegrations = async () => {
    if (!user) return;
    
    const providers = user.identities?.map(i => i.provider) || [];
    const emailIdentity = user.identities?.find(i => i.provider === 'email');
    
    const integrationList: Integration[] = [
      {
        provider: 'Google',
        connected: providers.includes('google'),
        email: user.user_metadata?.email,
      },
      {
        provider: 'Email',
        connected: providers.includes('email'),
        email: emailIdentity?.identity_data?.email,
      },
    ];
    
    setIntegrations(integrationList);
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

      const { error } = await supabase.auth.updateUser({ data: updates });
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

  // ─── Avatar Upload ──────────────────────────────────────────────────────

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a JPG or PNG image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    setUploadingAvatar(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL with cache-busting
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const avatarUrl = urlData.publicUrl;

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      });

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
    } catch (err) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: '' },
      });
      if (error) throw error;
      
      setProfile((prev) => ({ ...prev, avatar_url: '' }));
    } catch (err) {
      console.error('Failed to remove avatar:', err);
    }
  };

  // ─── Password Change ────────────────────────────────────────────────────

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (isGoogleUser) {
      setPasswordError('Password management is handled by Google. Please sign in with Google to make changes.');
      return;
    }

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: currentPassword,
      });

      if (authError) {
        setPasswordError('Current password is incorrect');
        setChangingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
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

  // ─── Modal Render ──────────────────────────────────────────────────────

  const renderModal = () => {
    if (!modal.type) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal({ type: null })} />
        <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl animate-scale-in">
          {/* Modal Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/95 backdrop-blur-xl">
            <h3 className="text-lg font-semibold text-white capitalize">
              {modal.type === 'integrations' ? 'Integrations' : modal.type}
            </h3>
            <button
              onClick={() => setModal({ type: null })}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4">
            {modal.type === 'profile' && renderProfileModal()}
            {modal.type === 'metrics' && renderMetricsModal()}
            {modal.type === 'subscription' && renderSubscriptionModal()}
            {modal.type === 'security' && renderSecurityModal()}
            {modal.type === 'integrations' && renderIntegrationsModal()}
          </div>
        </div>
      </div>
    );
  };

  // ─── Profile Modal ──────────────────────────────────────────────────────

  const renderProfileModal = () => (
    <div className="space-y-4">
      {/* Avatar Section */}
      <div className="flex flex-col items-center pb-4 border-b border-gray-800">
        <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
          <div className="w-24 h-24 rounded-full border-4 border-gray-800 overflow-hidden">
            <AvatarImage src={profile.avatar_url} name={profile.full_name} size="lg" />
          </div>
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
          {uploadingAvatar && (
            <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleAvatarClick}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Change Photo
          </button>
          {profile.avatar_url && (
            <>
              <span className="text-gray-600">·</span>
              <button
                onClick={handleRemoveAvatar}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editable Fields */}
      {[
        { label: 'Full Name', field: 'full_name', value: profile.full_name, icon: <User className="w-4 h-4" /> },
        { label: 'Username', field: 'username', value: profile.username, icon: <span className="text-xs font-bold">@</span> },
        { label: 'Phone', field: 'phone', value: profile.phone, icon: <Phone className="w-4 h-4" /> },
        { label: 'Timezone', field: 'timezone', value: profile.timezone, icon: <Clock className="w-4 h-4" /> },
        { label: 'Language', field: 'language', value: profile.language, icon: <Globe className="w-4 h-4" /> },
      ].map(({ label, field, value, icon }) => (
        <div key={field} className="flex items-center justify-between py-3 border-b border-gray-800/50 last:border-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center text-gray-500 flex-shrink-0">
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              {editingField === field ? (
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
            {editingField === field ? (
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
                className="px-2 py-1 text-xs text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Metrics Modal ──────────────────────────────────────────────────────

  const renderMetricsModal = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
          <p className="text-xs text-gray-500 mb-1">Member Since</p>
          <p className="text-lg font-bold text-white">{metrics.memberSince}</p>
        </div>
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
          <p className="text-xs text-gray-500 mb-1">Total Chats</p>
          <p className="text-lg font-bold text-white">{metrics.totalChats.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
          <p className="text-xs text-gray-500 mb-1">Total Messages</p>
          <p className="text-lg font-bold text-white">{metrics.totalMessages.toLocaleString()}</p>
        </div>
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
          <p className="text-xs text-gray-500 mb-1">Last Active</p>
          <p className="text-lg font-bold text-white">{metrics.lastActive}</p>
        </div>
      </div>
    </div>
  );

  // ─── Subscription Modal ─────────────────────────────────────────────────

  const renderSubscriptionModal = () => (
    <div className="space-y-4">
      <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 flex items-center justify-center border border-blue-500/20">
            <Zap className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">Free Plan</p>
            <p className="text-sm text-gray-500">Basic features included</p>
          </div>
          <span className="ml-auto text-xs px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg">
            Active
          </span>
        </div>
        <div className="space-y-2 text-sm text-gray-400">
          <p>✓ Unlimited conversations</p>
          <p>✓ Multiple AI agents</p>
          <p>✓ Web search integration</p>
          <p className="text-gray-600">✗ Priority support</p>
          <p className="text-gray-600">✗ Advanced analytics</p>
        </div>
      </div>
      <button
        disabled
        className="w-full py-3 rounded-xl bg-gray-800/50 text-gray-600 text-sm font-medium cursor-not-allowed border border-gray-700/30 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Upgrade (Coming Soon)
      </button>
    </div>
  );

  // ─── Security Modal ─────────────────────────────────────────────────────

  const renderSecurityModal = () => (
    <div className="space-y-4">
      {isGoogleUser ? (
        <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 flex items-center justify-center border border-blue-500/20">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Signed in with Google</p>
              <p className="text-xs text-gray-500">Password managed by Google</p>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            Your account is secured through Google authentication. To change your password, 
            please visit your Google Account settings directly.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800/40 rounded-xl p-5 border border-gray-700/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-white">Change Password</p>
                <p className="text-xs text-gray-500">Update your account password</p>
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
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full bg-gray-900/50 text-white text-sm px-3 py-2.5 rounded-lg border border-gray-700/50 focus:outline-none focus:border-blue-500/50 pr-10"
                />
                <button
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {passwordSuccess}
                </div>
              )}
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword || !currentPassword || !newPassword}
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
      )}

      {/* Log Out */}
      <button
        onClick={handleSignOut}
        className="w-full py-3 rounded-xl bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm font-medium transition-colors border border-red-500/20 flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Log Out
      </button>
    </div>
  );

  // ─── Integrations Modal ─────────────────────────────────────────────────

  const renderIntegrationsModal = () => (
    <div className="space-y-4">
      {integrations.map((integration) => (
        <div
          key={integration.provider}
          className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                integration.connected 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-gray-800 border-gray-700'
              }`}>
                {integration.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <Link2 className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{integration.provider}</p>
                <p className="text-xs text-gray-500">
                  {integration.connected ? integration.email || 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-lg ${
              integration.connected 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-gray-800 text-gray-500 border border-gray-700'
            }`}>
              {integration.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Trello-style Card Component ────────────────────────────────────────

  const DashboardCard = ({ 
    title, 
    icon, 
    onClick, 
    children 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className="w-full text-left glass rounded-2xl p-4 sm:p-5 border border-gray-800/50 hover:border-blue-500/30 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs sm:text-sm font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
      </div>
      {children}
    </button>
  );

  // ─── Main Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-gray-950 circuit-bg flex flex-col lg:flex-row">
      
      {/* ─── Mobile Top Nav (Horizontal Scroll) ───────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-20 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800/60">
        {/* Back + Title Row */}
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-sm font-semibold text-white">Account and Settings</h1>
          <div className="w-16" /> {/* Spacer */}
        </div>
        
        {/* Horizontal Scrollable Nav Pills */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
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
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/30 to-cyan-600/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10'
                    : item.comingSoon
                    ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed border border-gray-800/50'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white border border-gray-700/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.comingSoon && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-gray-700/50 text-gray-500 rounded-full border border-gray-600/30">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
          
          {/* Log Out Pill */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-500/20 flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* ─── Left Sidebar (Desktop Only) ──────────────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-shrink-0 border-r border-gray-800/60 bg-gray-900/80 backdrop-blur-xl flex-col">
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
        <nav className="p-3 flex-1">
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
        <div className="p-3 border-t border-gray-800/60">
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          {/* ─── Profile Header Card ────────────────────────────────────── */}
          <div className="glass rounded-2xl p-5 sm:p-6 mb-5 text-center border border-gray-800/50">
            {/* Avatar */}
            <div 
              onClick={handleAvatarClick}
              className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 cursor-pointer group"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-gray-900 shadow-xl shadow-blue-500/20 overflow-hidden">
                <AvatarImage src={profile.avatar_url} name={profile.full_name} size="md" />
              </div>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">{profile.full_name || 'User'}</h2>
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full" />
              <span>Online</span>
              <span>·</span>
              <span>@{profile.username}</span>
            </div>
          </div>

          {/* ─── Trello-style Cards Grid ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            
            {/* Profile Overview Card */}
            <DashboardCard
              title="Profile"
              icon={<User className="w-3.5 h-3.5" />}
              onClick={() => setModal({ type: 'profile' })}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                  <Mail className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                  <Phone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span>{profile.phone || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                  <Globe className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span>{profile.language}</span>
                </div>
              </div>
            </DashboardCard>

            {/* Account Metrics Card */}
            <DashboardCard
              title="Metrics"
              icon={<MessageSquare className="w-3.5 h-3.5" />}
              onClick={() => setModal({ type: 'metrics' })}
            >
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-gray-800/30 rounded-lg p-2.5 sm:p-3">
                  <p className="text-base sm:text-lg font-bold text-white">{metrics.totalChats}</p>
                  <p className="text-[10px] text-gray-500">Chats</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-2.5 sm:p-3">
                  <p className="text-base sm:text-lg font-bold text-white">{metrics.totalMessages}</p>
                  <p className="text-[10px] text-gray-500">Messages</p>
                </div>
              </div>
            </DashboardCard>

            {/* Subscription Card */}
            <DashboardCard
              title="Subscription"
              icon={<Zap className="w-3.5 h-3.5" />}
              onClick={() => setModal({ type: 'subscription' })}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-600/30 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                  <Zap className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Free Plan</p>
                  <span className="text-xs text-green-400">Active</span>
                </div>
              </div>
            </DashboardCard>

            {/* Security Card */}
            <DashboardCard
              title="Security"
              icon={<Shield className="w-3.5 h-3.5" />}
              onClick={() => setModal({ type: 'security' })}
            >
              <div className="space-y-2">
                {isGoogleUser ? (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                    <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                    <span>Google Auth</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                    <Lock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span>Password protected</span>
                  </div>
                )}
                <p className="text-[10px] text-gray-500">Click to manage security settings</p>
              </div>
            </DashboardCard>

            {/* Integrations Card */}
            <DashboardCard
              title="Integrations"
              icon={<Link2 className="w-3.5 h-3.5" />}
              onClick={() => setModal({ type: 'integrations' })}
            >
              <div className="space-y-2">
                {integrations.map((int) => (
                  <div key={int.provider} className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-300">{int.provider}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      int.connected ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {int.connected ? 'Connected' : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </DashboardCard>

            {/* Settings Card */}
            <DashboardCard
              title="Settings"
              icon={<Settings className="w-3.5 h-3.5" />}
              onClick={() => setModal({ type: 'security' })}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-300">
                  <Settings className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                  <span>Account preferences</span>
                </div>
                <p className="text-[10px] text-gray-500">Manage your account settings</p>
              </div>
            </DashboardCard>
          </div>
        </div>
      </main>

      {/* ─── Modal ─────────────────────────────────────────────────────── */}
      {renderModal()}
    </div>
  );
}
