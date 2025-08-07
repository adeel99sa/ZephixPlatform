import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, FileText } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="w-6 h-6 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
          </div>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing and using Zephix, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Use License</h2>
            <p className="text-gray-700 mb-4">
              Permission is granted to temporarily use Zephix for personal or commercial project management purposes. 
              This is the grant of a license, not a transfer of title.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Disclaimer</h2>
            <p className="text-gray-700 mb-4">
              The materials on Zephix are provided on an 'as is' basis. Zephix makes no warranties, 
              expressed or implied, and hereby disclaims and negates all other warranties including without limitation, 
              implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Limitations</h2>
            <p className="text-gray-700 mb-4">
              In no event shall Zephix or its suppliers be liable for any damages (including, without limitation, 
              damages for loss of data or profit, or due to business interruption) arising out of the use or 
              inability to use the materials on Zephix.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Revisions and Errata</h2>
            <p className="text-gray-700 mb-4">
              The materials appearing on Zephix could include technical, typographical, or photographic errors. 
              Zephix does not warrant that any of the materials on its website are accurate, complete or current.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Links</h2>
            <p className="text-gray-700 mb-4">
              Zephix has not reviewed all of the sites linked to its website and is not responsible for the contents 
              of any such linked site. The inclusion of any link does not imply endorsement by Zephix of the site.
            </p>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Modifications</h2>
            <p className="text-gray-700 mb-6">
              Zephix may revise these terms of service for its website at any time without notice. 
              By using this website you are agreeing to be bound by the then current version of these Terms of Service.
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
