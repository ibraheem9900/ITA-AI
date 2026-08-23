import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const APP_LOGO = '/1775218881775-3ee13392-9669-4d24-ae5f-9ac05cae51cf.png';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Completing sign in…');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Supabase PKCE: exchange the authorization code for a session
        const { data, error: sessionError } =
          await supabase.auth.exchangeCodeForSession(window.location.href);

        if (sessionError) {
          const errMsg = sessionError.message.toLowerCase();
          // Detect network / DNS failures
          if (
            errMsg.includes('failed to fetch') ||
            errMsg.includes('network') ||
            errMsg.includes('econnrefused')
          ) {
            throw new Error(
              'Cannot reach Supabase. The project may be paused — visit supabase.com/dashboard and click Restore.',
            );
          }

          // Try hash-based flow (legacy / implicit grant)
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1),
          );
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: setSessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            if (setSessionError) throw setSessionError;
          } else {
            throw sessionError;
          }
        }

        // If we get here, session is set — redirect to app
        if (data?.session || !sessionError) {
          setStatus('Signed in successfully!');
          // Small delay so user sees the success message
          setTimeout(() => navigate('/', { replace: true }), 500);
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Authentication failed';
        setError(msg);
        console.error('Auth callback error:', msg);
        // After 3 seconds, redirect to login
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div
      className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5"
      style={{ minHeight: '100dvh' }}
    >
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-1" style={{ top: '-10%', left: '-5%' }} />
        <div className="blob blob-2" style={{ bottom: '-5%', right: '-5%' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600/40 to-cyan-500/40 rounded-2xl flex items-center justify-center border border-blue-500/20 animate-pulse-glow">
          <img src={APP_LOGO} alt="ITA AI" className="w-10 h-10" />
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-11 h-11 bg-red-500/15 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="text-red-400 text-sm font-medium">
              Sign-in failed
            </p>
            <p className="text-gray-500 text-xs max-w-xs text-center">
              {error}
            </p>
            <p className="text-gray-600 text-xs">
              Redirecting to login…
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              <span
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <p className="text-gray-400 text-sm font-medium">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
