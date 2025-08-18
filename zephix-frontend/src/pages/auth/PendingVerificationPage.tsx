import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { apiJson } from '../../services/api';

interface LocationState {
  email?: string;
  message?: string;
}

const PendingVerificationPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const { user } = useAuthStore();
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const userEmail = state?.email || user?.email || '';

  const handleResendVerification = async () => {
    try {
      setResending(true);
      setResendError(null);
      setResendSuccess(false);

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth/login');
        return;
      }

      try {
        await apiJson('/auth/resend-verification', {
          method: 'POST',
        });
        setResendSuccess(true);
      } catch (error: any) {
        if (error.message === 'UNAUTHORIZED') {
          // Token expired, redirect to login
          navigate('/auth/login');
          return;
        }
        setResendError(error.message || 'Failed to resend verification email');
      }
    } catch (err) {
      setResendError('Network error. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div 
        className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Mail className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your Email Address
          </h2>
          
          <p className="text-gray-600 mb-6">
            {state?.message || 'We\'ve sent a verification email to your inbox. Please check your email and click the verification link to activate your account.'}
          </p>

          {userEmail && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-800">
                Verification email sent to:
              </p>
              <p className="font-medium text-blue-900">
                {userEmail}
              </p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-amber-800 mb-1">
                  Important Security Notice
                </p>
                <p className="text-sm text-amber-700">
                  You cannot log in until your email is verified. This helps protect your account and ensures important notifications reach you.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-left bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">
                What to do next:
              </p>
              <ol className="text-sm text-gray-700 space-y-1">
                <li className="flex items-start">
                  <span className="font-medium text-blue-600 mr-2">1.</span>
                  Check your inbox (and spam folder)
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-blue-600 mr-2">2.</span>
                  Click the verification link in the email
                </li>
                <li className="flex items-start">
                  <span className="font-medium text-blue-600 mr-2">3.</span>
                  Return here to log in
                </li>
              </ol>
            </div>

            {resendSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 p-4 rounded-lg"
              >
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-sm text-green-800">
                    Verification email sent successfully! Please check your inbox.
                  </p>
                </div>
              </motion.div>
            ) : null}

            {resendError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 p-4 rounded-lg"
              >
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-sm text-red-800">
                    {resendError}
                  </p>
                </div>
              </motion.div>
            )}

            <button
              onClick={handleResendVerification}
              disabled={resending || resendSuccess}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {resending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendSuccess ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Email Sent
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </button>

            <div className="flex space-x-3">
              <Link
                to="/auth/login"
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
              >
                Back to Login
              </Link>
              <Link
                to="/auth/register"
                className="flex-1 text-blue-600 hover:text-blue-700 transition-colors px-6 py-3 text-center font-medium"
              >
                Try Different Email
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              The verification link expires in 24 hours for your security.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PendingVerificationPage;
