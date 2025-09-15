import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Mail, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';

interface VerificationResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isEmailVerified: boolean;
  };
}

const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setError('Invalid verification link');
      setLoading(false);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      setLoading(true);
      setError(null);

      const data = await api.get(`/auth/verify-email/${verificationToken}`);
      setResult(data);
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/auth/login', { 
          state: { 
            message: 'Email verified successfully! You can now log in.',
            email: data.user?.email 
          }
        });
      }, 3000);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryVerification = () => {
    if (token) {
      verifyEmail(token);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <motion.div 
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-4"
            >
              <RefreshCw className="h-12 w-12 text-blue-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Your Email
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <motion.div 
        className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          {result?.success ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verified Successfully!
              </h2>
              <p className="text-gray-600 mb-6">
                {result.message}
              </p>
              {result.user && (
                <div className="bg-green-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-green-800">
                    Welcome, <strong>{result.user.firstName} {result.user.lastName}</strong>!
                  </p>
                  <p className="text-sm text-green-700">
                    {result.user.email}
                  </p>
                </div>
              )}
              <div className="space-y-3">
                <motion.p 
                  className="text-sm text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  Redirecting to login in 3 seconds...
                </motion.p>
                <Link
                  to="/auth/login"
                  state={{ 
                    message: 'Email verified successfully! You can now log in.',
                    email: result.user?.email 
                  }}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
                >
                  Continue to Login
                </Link>
              </div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-600 mb-6">
                {error || 'The verification link is invalid or has expired.'}
              </p>
              
              <div className="bg-red-50 p-4 rounded-lg mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-sm text-red-800">
                    Common reasons for verification failure:
                  </p>
                </div>
                <ul className="text-sm text-red-700 mt-2 ml-7 space-y-1">
                  <li>• Link has expired (24-hour limit)</li>
                  <li>• Email already verified</li>
                  <li>• Invalid or corrupted link</li>
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleRetryVerification}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Verification
                </button>
                <Link
                  to="/auth/login"
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-block text-center"
                >
                  Back to Login
                </Link>
                <Link
                  to="/auth/resend-verification"
                  className="w-full text-blue-600 hover:text-blue-700 transition-colors inline-block text-center text-sm"
                >
                  Request New Verification Email
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default EmailVerificationPage;
