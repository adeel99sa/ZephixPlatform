import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, AlertCircle, Loader, CheckCircle2 } from 'lucide-react';
import { orgInvitesApi, type ApiError } from '@/services/orgInvitesApi';
import { useAuth } from '@/state/AuthContext';

export const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthFromInvite, completeLoginRedirect } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{
    email: string;
    role: string;
    orgName: string;
    expiresAt: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const [status, setStatus] = useState<
    'validating' | 'ready' | 'submitting' | 'success' | 'error'
  >('validating');
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Read token from URL on mount
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      // Clear stale returnUrl if token is missing
      localStorage.removeItem('zephix.returnUrl');
      setStatus('error');
      setError('Invite token is missing');
      setErrorCode('MISSING_TOKEN');
      return;
    }
    setToken(tokenParam);
  }, [searchParams]);

  // Validate invite on mount when token is available
  useEffect(() => {
    if (!token || status !== 'validating') return;

    const validateInvite = async () => {
      try {
        const data = await orgInvitesApi.validateInvite(token);
        setInviteData(data);
        setStatus('ready');
        setError(null);
      } catch (err) {
        const apiError = err as ApiError;
        setStatus('error');
        setErrorCode(apiError.code || 'UNKNOWN');

        // Clear stale returnUrl if token validation fails
        localStorage.removeItem('zephix.returnUrl');

        if (apiError.code === 'ORG_INVITE_NOT_FOUND') {
          setError('Invite not found or expired');
        } else {
          setError(apiError.message || 'Failed to validate invite');
        }
      }
    };

    validateInvite();
  }, [token, status]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) {
      setError(null);
      setErrorCode(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);

    // Client-side password validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setErrorCode('VALIDATION_ERROR');
      return;
    }

    if (!formData.fullName.trim()) {
      setError('Full name is required');
      setErrorCode('VALIDATION_ERROR');
      return;
    }

    if (!token) {
      setError('Invite token is missing');
      setErrorCode('MISSING_TOKEN');
      return;
    }

    setStatus('submitting');

    try {
      // Call accept endpoint - API interceptor unwraps response.data automatically
      const response = await orgInvitesApi.acceptInvite({
        token,
        fullName: formData.fullName.trim(),
        password: formData.password,
      });

      // CRITICAL: API interceptor already unwraps response.data, so response is already the data
      // Use the same auth storage function as login (reuses exact same logic)
      setAuthFromInvite({
        user: response.user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        sessionId: response.sessionId,
      });

      setStatus('success');

      // Use shared post-login redirect logic (handles onboarding, returnUrl, default)
      // No setTimeout - routing happens immediately after auth state is set
      await completeLoginRedirect(navigate);
    } catch (err) {
      const apiError = err as ApiError;
      setStatus('error');
      setErrorCode(apiError.code || 'UNKNOWN');

      if (apiError.code === 'ORG_INVITE_NOT_FOUND') {
        setError('Invite not found or expired');
      } else if (apiError.code === 'ORG_USER_ALREADY_EXISTS') {
        setError('Account already exists. Go to login.');
      } else if (apiError.code === 'VALIDATION_ERROR' || apiError.statusCode === 400) {
        setError('Please fix the form fields');
      } else {
        setError(apiError.message || 'Failed to accept invite');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link
            to="/"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">ZEPHIX</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Accept Invitation
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Loading state for validation */}
          {status === 'validating' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                <Loader className="h-6 w-6 text-indigo-600 animate-spin" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Validating Invitation...
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Please wait while we verify your invitation.
              </p>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {errorCode === 'ORG_USER_ALREADY_EXISTS'
                  ? 'Account Already Exists'
                  : 'Invitation Error'}
              </h3>
              <p className="mt-2 text-sm text-gray-500">{error}</p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Go to Login
                </Link>
              </div>
            </div>
          )}

          {/* Success state - brief flash before redirect */}
          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Account Created!
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Redirecting...
              </p>
            </div>
          )}

          {/* Form state (ready or submitting) */}
          {(status === 'ready' || status === 'submitting') && inviteData && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Invite details */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Invitation Details
                </h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-blue-700">Organization:</dt>
                    <dd className="text-blue-900 font-medium">
                      {inviteData.orgName}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-700">Email:</dt>
                    <dd className="text-blue-900 font-medium">
                      {inviteData.email}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-700">Role:</dt>
                    <dd className="text-blue-900 font-medium capitalize">
                      {inviteData.role}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-blue-700">Expires:</dt>
                    <dd className="text-blue-900 font-medium">
                      {new Date(inviteData.expiresAt).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Error display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Full name field */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={status === 'submitting'}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={status === 'submitting'}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter a password (min 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={status === 'submitting'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Password must be at least 8 characters
                </p>
              </div>

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={
                    status === 'submitting' ||
                    !formData.fullName.trim() ||
                    !formData.password ||
                    formData.password.length < 8
                  }
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'submitting' ? (
                    <div className="flex items-center">
                      <Loader className="h-4 w-4 text-white animate-spin mr-2" />
                      Creating Account...
                    </div>
                  ) : (
                    'Accept Invitation & Create Account'
                  )}
                </button>
              </div>

              {/* Login link */}
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
