import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Zap, Shield, Globe,
  X, ExternalLink, CheckCircle2, AlertCircle, Copy, Check, KeyRound,
} from 'lucide-react';

type AuthMode = 'signin' | 'signup' | 'verify' | 'forgot-password' | 'reset-password';

function isNetworkError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('network') ||
    m.includes('err_name_not_resolved') ||
    m.includes('err_network') ||
    m.includes('dns_probe') ||
    m.includes('econnrefused') ||
    m.includes('econnreset') ||
    m.includes('Load failed') ||
    m.includes('networkerror')
  );
}

const APP_LOGO = '/1775218881775-3ee13392-9669-4d24-ae5f-9ac05cae51cf.png';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const CALLBACK_URL = `${SUPABASE_URL}/auth/v1/callback`;

const features = [
  { icon: Zap,    label: 'Real-time AI web search' },
  { icon: Shield, label: 'Secure & private conversations' },
  { icon: Globe,  label: 'Multilingual responses' },
];

const GOOGLE_SETUP_STEPS = [
  {
    step: 1,
    title: 'Open your Supabase dashboard',
    detail: 'Go to supabase.com/dashboard and select your project.',
    link: 'https://supabase.com/dashboard',
    linkLabel: 'Open Supabase Dashboard →',
  },
  {
    step: 2,
    title: 'Go to Authentication → Providers',
    detail: 'In the left sidebar: Authentication → Providers → scroll to Google.',
    link: null,
    linkLabel: null,
  },
  {
    step: 3,
    title: 'Copy your callback URL',
    detail: 'You\'ll need this when setting up Google Console.',
    link: null,
    linkLabel: null,
    copyValue: CALLBACK_URL,
  },
  {
    step: 4,
    title: 'Create Google OAuth credentials',
    detail: 'Go to Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID. Add the callback URL above as an authorized redirect URI.',
    link: 'https://console.cloud.google.com/apis/credentials',
    linkLabel: 'Open Google Cloud Console →',
  },
  {
    step: 5,
    title: 'Paste Client ID + Secret into Supabase',
    detail: 'Copy the Client ID and Client Secret from Google Console and paste them into the Google provider settings in Supabase. Enable the toggle and save.',
    link: null,
    linkLabel: null,
  },
];

function GoogleSetupModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CALLBACK_URL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg glass rounded-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto themed-scroll">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <h2 className="text-white font-bold text-lg">Enable Google Sign-In</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Google OAuth needs a one-time setup in your Supabase dashboard. Follow these steps:
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {GOOGLE_SETUP_STEPS.map(({ step, title, detail, link, linkLabel, copyValue }) => (
            <div key={step} className="flex gap-3 p-3.5 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="flex-shrink-0 w-7 h-7 bg-blue-600/20 border border-blue-500/30 rounded-full flex items-center justify-center text-blue-400 text-xs font-bold">
                {step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold mb-0.5">{title}</p>
                <p className="text-gray-400 text-xs leading-relaxed">{detail}</p>

                {copyValue && (
                  <div className="mt-2 flex items-center gap-2 bg-gray-900/60 rounded-lg px-3 py-2 border border-gray-700/50">
                    <code className="text-cyan-400 text-xs flex-1 truncate">{copyValue}</code>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 text-gray-500 hover:text-cyan-400 transition-colors"
                      title="Copy"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {link && linkLabel && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {linkLabel} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2.5 p-3 bg-green-900/15 border border-green-700/30 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-300 text-xs leading-relaxed">
            Once set up, Google sign-in will work instantly — no code changes needed. Just reload the page after saving in Supabase.
          </p>
        </div>

        <button
          onClick={onClose}
          className="btn-primary w-full mt-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl text-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);
  const { signIn, signUp, signInWithGoogle, verifyOtp, forgotPassword, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      switch (mode) {
        case 'verify':
          await verifyOtp(email, otp);
          break;
        case 'forgot-password':
          await forgotPassword(email);
          setNotice('Check your email for a password reset link.');
          break;
        case 'reset-password':
          if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
          }
          if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
          }
          await resetPassword(newPassword);
          setNotice('Password updated successfully!');
          setTimeout(() => {
            setMode('signin');
            setNotice('');
          }, 2000);
          break;
        case 'signup':
          if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
          }
          if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
          }
          const { needsVerification } = await signUp(email, password);
          if (needsVerification) {
            setNotice('Check your email for a confirmation link or verification code.');
            setMode('verify');
          }
          break;
        case 'signin':
        default:
          await signIn(email, password);
          break;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (isNetworkError(raw)) {
        setError('Cannot reach the server. Your Supabase project may be paused — please check supabase.com/dashboard and restore it.');
      } else {
        setError(raw || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const lower = raw.toLowerCase();
      if (isNetworkError(lower)) {
        setError('Cannot reach the server. Your Supabase project may be paused — please check supabase.com/dashboard and restore it.');
      } else if (
        lower.includes('provider') ||
        lower.includes('not enabled') ||
        lower.includes('validation_failed') ||
        lower.includes('unsupported') ||
        lower.includes('bad request')
      ) {
        setShowGoogleSetup(true);
      } else {
        setError('Google sign-in failed. Please try again or use email/password.');
      }
      setGoogleLoading(false);
    }
  };

  // Check Supabase connectivity on mount
  const [serverStatus, setServerStatus] = useState<'ok' | 'down' | 'checking'>('checking');
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(SUPABASE_URL + '/rest/v1/', { method: 'HEAD', signal: AbortSignal.timeout(8000) });
        setServerStatus(res.ok || res.status === 401 || res.status === 404 ? 'ok' : 'down');
      } catch {
        setServerStatus('down');
      }
    };
    check();
  }, []);

  const switchMode = (m: AuthMode) => {
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setNewPassword('');
    setMode(m);
  };

  const getPasswordRequirements = (pw: string) => {
    const checks = [
      { label: 'At least 6 characters', met: pw.length >= 6 },
      { label: 'Has uppercase letter', met: /[A-Z]/.test(pw) },
      { label: 'Has number', met: /[0-9]/.test(pw) },
    ];
    return checks;
  };

  return (
    <>
      {showGoogleSetup && <GoogleSetupModal onClose={() => setShowGoogleSetup(false)} />}

      <div className="min-h-screen flex overflow-hidden bg-gray-950" style={{ minHeight: '100dvh' }}>
        {/* Background blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="blob blob-1" style={{ top: '5%', left: '2%' }} />
          <div className="blob blob-2" style={{ bottom: '5%', right: '2%' }} />
        </div>

        {/* ── Left panel: form ── */}
        <div className="relative z-10 flex flex-col justify-center w-full lg:w-[48%] px-6 py-10 sm:px-10 xl:px-16 overflow-y-auto themed-scroll">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden">
                <img src={APP_LOGO} alt="ITA AI" className="w-7 h-7" />
              </div>
              <span className="text-2xl font-black tracking-wide gradient-text-animated">ITA AI</span>
            </div>
            <p className="text-gray-500 text-sm mt-1.5">Your intelligent search companion</p>
          </div>

          {/* Supabase connection warning */}
          {serverStatus === 'down' && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-700/40 rounded-xl animate-slide-up">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 text-sm font-semibold">Server is unavailable</p>
                  <p className="text-red-400/70 text-xs mt-1 leading-relaxed">
                    Your Supabase project appears to be paused. Go to{' '}
                    <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline text-red-300 hover:text-red-200">
                      supabase.com/dashboard
                    </a>{' '}
                    and click <strong>Restore</strong> on your project to fix this.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Card */}
          <div className="glass rounded-2xl p-7 w-full max-w-md animate-scale-in">

            {/* ── Verify OTP ── */}
            {mode === 'verify' && (
              <>
                <div className="mb-5">
                  <div className="w-11 h-11 bg-blue-500/15 rounded-xl flex items-center justify-center mb-3">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Verify your email</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Enter the code sent to{' '}
                    <span className="text-blue-400 font-medium">{email}</span>
                  </p>
                </div>

                {notice && (
                  <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/40 rounded-xl text-blue-300 text-sm animate-slide-up">
                    {notice}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 bg-gray-800/70 border border-gray-700 rounded-xl text-white text-center text-2xl tracking-[0.6em] placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  />
                  {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}
                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="btn-primary w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                  >
                    {loading ? <Spinner /> : <>Verify <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    ← Back to sign up
                  </button>
                </form>
              </>
            )}

            {/* ── Forgot Password ── */}
            {mode === 'forgot-password' && (
              <>
                <div className="mb-5">
                  <div className="w-11 h-11 bg-amber-500/15 rounded-xl flex items-center justify-center mb-3">
                    <KeyRound className="w-5 h-5 text-amber-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Reset your password</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Enter your email and we'll send you a reset link
                  </p>
                </div>

                {notice && (
                  <div className="mb-4 p-3 bg-green-900/20 border border-green-700/40 rounded-xl text-green-300 text-sm animate-slide-up">
                    {notice}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        required placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}

                  <button
                    type="submit" disabled={loading}
                    className="btn-primary w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 text-sm"
                  >
                    {loading ? <Spinner /> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
                  </button>

                  <button
                    type="button" onClick={() => switchMode('signin')}
                    className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Back to sign in
                  </button>
                </form>
              </>
            )}

            {/* ── Reset Password (new password) ── */}
            {mode === 'reset-password' && (
              <>
                <div className="mb-5">
                  <div className="w-11 h-11 bg-green-500/15 rounded-xl flex items-center justify-center mb-3">
                    <Lock className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Set new password</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Create a strong new password for your account
                  </p>
                </div>

                {notice && (
                  <div className="mb-4 p-3 bg-green-900/20 border border-green-700/40 rounded-xl text-green-300 text-sm animate-slide-up">
                    {notice}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type={showPassword ? 'text' : 'password'} value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type={showPassword ? 'text' : 'password'} value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {newPassword.length > 0 && (
                    <div className="space-y-1">
                      {getPasswordRequirements(newPassword).map(({ label, met }) => (
                        <div key={label} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className={`w-3.5 h-3.5 ${met ? 'text-green-400' : 'text-gray-600'}`} />
                          <span className={met ? 'text-green-400' : 'text-gray-500'}>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}

                  <button
                    type="submit" disabled={loading}
                    className="btn-primary w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 text-sm mt-1"
                  >
                    {loading ? <Spinner /> : <>Update Password <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </>
            )}

            {/* ── Sign In / Sign Up ── */}
            {(mode === 'signin' || mode === 'signup') && (
              <>
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-white">
                    {mode === 'signin' ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {mode === 'signin' ? 'Sign in to your ITA AI account' : 'Start your AI-powered journey'}
                  </p>
                </div>

                {/* Google button */}
                <button
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="btn-primary w-full flex items-center justify-center gap-3 py-2.5 bg-gray-800/70 hover:bg-gray-700/70 border border-gray-700 hover:border-gray-500 rounded-xl text-white text-sm font-medium transition-all mb-4 disabled:opacity-50"
                >
                  {googleLoading ? <Spinner small /> : (
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
                </button>

                <div className="relative flex items-center mb-4">
                  <div className="flex-1 border-t border-gray-800" />
                  <span className="px-3 text-xs text-gray-600 uppercase tracking-wider">or</span>
                  <div className="flex-1 border-t border-gray-800" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        required placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-400">Password</label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot-password')}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                      <input
                        type={showPassword ? 'text' : 'password'} value={password}
                        onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {mode === 'signup' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input
                          type={showPassword ? 'text' : 'password'} value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-800/70 border border-gray-700 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                      )}
                    </div>
                  )}

                  {error && <ErrorBanner msg={error} onDismiss={() => setError('')} />}

                  <button
                    type="submit" disabled={loading}
                    className="btn-primary w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 text-sm mt-1"
                  >
                    {loading
                      ? <Spinner />
                      : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>
                    }
                  </button>

                  <p className="text-center text-sm text-gray-500 pt-1">
                    {mode === 'signin' ? (
                      <>Don't have an account?{' '}
                        <button type="button" onClick={() => switchMode('signup')}
                          className="text-blue-400 hover:text-blue-300 font-medium transition-colors underline underline-offset-2">
                          Create Account
                        </button>
                      </>
                    ) : (
                      <>Already have an account?{' '}
                        <button type="button" onClick={() => switchMode('signin')}
                          className="text-blue-400 hover:text-blue-300 font-medium transition-colors underline underline-offset-2">
                          Sign In
                        </button>
                      </>
                    )}
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

        {/* ── Right panel: branding ── */}
        <div className="hidden lg:flex relative w-[52%] flex-col justify-center items-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-gray-950 to-purple-950/60" />
          <div className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(ellipse at 60% 40%, rgba(59,130,246,0.18) 0%, transparent 60%),
                                radial-gradient(ellipse at 30% 70%, rgba(6,182,212,0.12) 0%, transparent 50%),
                                radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.10) 0%, transparent 50%)`,
            }}
          />
          <div className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-gray-950/30" />

          <div className="relative z-10 text-center px-12 max-w-lg animate-slide-up">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-blue-600/30 to-cyan-600/30 rounded-3xl mb-8 shadow-2xl shadow-blue-500/20 animate-pulse-glow border border-blue-500/20 backdrop-blur-sm">
              <img src={APP_LOGO} alt="ITA AI" className="w-16 h-16" />
            </div>
            <h1 className="text-5xl font-black tracking-wide mb-3 gradient-text-animated">ITA AI</h1>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed">
              Search smarter. Think deeper.<br />Get answers instantly.
            </p>
            <div className="space-y-3 text-left">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-4 glass rounded-xl px-5 py-3.5">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-gray-300 text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-10 text-xs text-gray-700">Powered by Groq · Llama 3.1 · SerpAPI</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Spinner({ small }: { small?: boolean }) {
  const s = small ? 'w-4 h-4' : 'w-5 h-5';
  return <span className={`${s} border-2 border-white/30 border-t-white rounded-full animate-spin`} />;
}

function ErrorBanner({ msg, onDismiss }: { msg: string; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-red-900/20 border border-red-700/40 rounded-xl text-red-300 text-sm animate-slide-up">
      <span className="flex-1 leading-snug">{msg}</span>
      <button onClick={onDismiss} className="flex-shrink-0 mt-0.5 text-red-500 hover:text-red-300 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
