import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { useEffect } from 'react';
import { FiCpu } from 'react-icons/fi';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLoginSuccess = async (credentialResponse) => {
    try {
      console.log('[Login] Google sign-in successful, processing...');
      await login(credentialResponse);
      console.log('[Login] Login complete, redirecting to home');
      navigate('/');
    } catch (error) {
      console.error('[Login] Login processing error:', error);
      alert(`Login failed: ${error.message}`);
    }
  };

  const handleLoginError = (errorData) => {
    console.error('[Login] Google sign-in failed:', errorData);
    // Show error after a moment to let error state render
    setTimeout(() => {
      alert('Google sign-in failed. Please try again.');
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-sky-100 bg-white/95 backdrop-blur p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm">
            <FiCpu className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">
            AI Debate Arena
          </h1>
          <p className="text-slate-600 text-base">
            Sign in to continue
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-sky-100 bg-sky-50/70 p-4">
          <p className="text-center text-slate-600 text-sm leading-relaxed">
            Sign in with your Google account to continue. Your name will be saved automatically!
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            theme="outline"
            size="large"
            width="300"
          />
        </div>

        <div className="mt-8 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <p className="text-center text-slate-600 font-medium text-sm">
            Clean layout, focused practice, and simple feedback.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-violet-100 bg-violet-50/50 p-4">
          <p className="text-xs text-slate-500 text-center leading-relaxed">
            <strong>Note:</strong> We only access your name and email for debate purposes. Your data is never shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}
