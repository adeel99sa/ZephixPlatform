import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Shield, Lock, Eye, Server } from 'lucide-react';

export const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-2 mb-4">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">ZEPHIX</span>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Security</h1>
          <p className="text-gray-600 mt-2">Security and data protection</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="w-6 h-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-900">Security Features</h2>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-8">
              We take security seriously. Here's how we protect your data and ensure the safety of our platform.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <Lock className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Encryption</h3>
                    <p className="text-gray-700 text-sm">
                      All data is encrypted in transit and at rest using industry-standard encryption protocols.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Eye className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Control</h3>
                    <p className="text-gray-700 text-sm">
                      Role-based access control ensures users only see data they're authorized to access.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Server className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Infrastructure Security</h3>
                    <p className="text-gray-700 text-sm">
                      Our infrastructure is built on secure cloud platforms with regular security updates.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication</h3>
                    <p className="text-gray-700 text-sm">
                      Secure authentication with JWT tokens and password protection for user accounts.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Lock className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance</h3>
                    <p className="text-gray-700 text-sm">
                      We follow industry best practices and are building toward enterprise security standards.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Eye className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Monitoring</h3>
                    <p className="text-gray-700 text-sm">
                      Continuous monitoring and alerting systems detect and respond to security threats.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Security Commitment</h3>
              <p className="text-blue-800 text-sm">
                As an early-stage product, we're committed to implementing strong security measures. 
                We regularly review and update our security practices to protect your data and are building toward enterprise-grade standards.
              </p>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Reporting Security Issues</h2>
            <p className="text-gray-700 mb-6">
              If you discover a security vulnerability, please contact us immediately. We take all security reports seriously 
              and will respond promptly to address any concerns.
            </p>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Zap className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
