import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Zap, CheckCircle, XCircle, Loader } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '../../state/AuthContext';

export const InviteAcceptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'checking' | 'success' | 'error' | 'login-required'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invitation token is missing');
      return;
    }

    // Wait for auth to load
    if (authLoading) {
      return;
    }

    // If not logged in, prompt login
    if (!user) {
      setStatus('login-required');
      setMessage('Please log in to accept the invitation');
      return;
    }

    // User is logged in, accept invite
    const acceptInvite = async () => {
      setStatus('checking');
      try {
        const response = await api.post('/invites/accept', { token });
        setStatus('success');
        setMessage('Invitation accepted successfully! Redirecting...');

        // Redirect to home after 2 seconds
        setTimeout(() => {
          navigate('/home');
        }, 2000);
      } catch (error: any) {
        console.error('Invite acceptance error:', error);
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
          'Invalid or expired invitation token.',
        );
      }
    };

    acceptInvite();
  }, [searchParams, navigate, user, authLoading]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ZEPHIX</span>
          </Link>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          {(status === 'loading' || status === 'checking') && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                <Loader className="h-6 w-6 text-indigo-600 animate-spin" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {status === 'loading' ? 'Loading...' : 'Accepting Invitation...'}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {status === 'loading'
                  ? 'Please wait...'
                  : 'Please wait while we process your invitation.'}
              </p>
            </>
          )}

          {status === 'login-required' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <Zap className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Login Required
              </h3>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
              <div className="mt-6">
                <Link
                  to={`/login?redirect=${encodeURIComponent(window.location.href)}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Log In
                </Link>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Invitation Accepted!
              </h3>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Invitation Failed
              </h3>
              <p className="mt-2 text-sm text-gray-500">{message}</p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Go to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

