import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import AuthCallback from './components/AuthCallback';
import ChatContainer from './components/ChatContainer';

const APP_LOGO = '/1775218881775-3ee13392-9669-4d24-ae5f-9ac05cae51cf.png';

// Detect if the current URL contains an OAuth callback hash
function isOAuthCallback() {
  return (
    window.location.hash.includes('access_token') ||
    window.location.hash.includes('error=')
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  // Show a nicer loading screen during OAuth callback processing
  if (loading) {
    const isCallback = isOAuthCallback();
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

          <p className="text-gray-400 text-sm font-medium">
            {isCallback ? 'Completing sign in…' : 'Loading ITA AI…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* OAuth callback route — always rendered, no auth gate */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* All other routes */}
      <Route
        path="*"
        element={user ? <ChatContainer /> : <Navigate to="/" replace />}
      />
      <Route
        path="/"
        element={user ? <ChatContainer /> : <Auth />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
