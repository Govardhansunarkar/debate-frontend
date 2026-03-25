import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { useEffect } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLoginSuccess = (credentialResponse) => {
    try {
      login(credentialResponse);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLoginError = () => {
    console.log('Login Failed');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full border-4 border-white/30">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
            🎤 AI Debate Arena
          </h1>
          <p className="text-gray-600 text-lg font-semibold">
            Sign in to get started
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <p className="text-center text-gray-700 text-sm">
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

        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
          <p className="text-center text-gray-800 font-semibold text-sm">
            💪 Improve your debating skills | 🧠 Get AI-powered feedback | 🏆 Track your progress
          </p>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
          <p className="text-xs text-gray-600 text-center">
            <strong>Note:</strong> We only access your name and email for debate purposes. Your data is never shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}
