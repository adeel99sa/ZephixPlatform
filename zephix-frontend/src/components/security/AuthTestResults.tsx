/**
 * Authentication Test Results Component
 * Displays comprehensive test results and recommendations
 */

import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, Info, Download, RefreshCw } from 'lucide-react';
import { authTestRunner, AuthTestSummary } from '../../utils/authTestRunner';
import { securityMiddleware } from '../../middleware/security.middleware';

interface AuthTestResultsProps {
  className?: string;
}

export const AuthTestResults: React.FC<AuthTestResultsProps> = ({ className = '' }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AuthTestSummary | null>(null);
  const [securityReport, setSecurityReport] = useState<any>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  // Run tests when component mounts
  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const testResults = await authTestRunner.runAuthTests();
      setResults(testResults);
      setLastRun(new Date().toISOString());
      
      // Get security audit report
      const auditReport = securityMiddleware.getSecurityAuditReport();
      setSecurityReport(auditReport);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? 'text-green-700' : 'text-red-700';
  };

  const downloadResults = () => {
    if (results) {
      const dataStr = JSON.stringify({
        timestamp: new Date().toISOString(),
        results,
        securityReport,
      }, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auth-test-results-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!results) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Running authentication tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Authentication Test Results</h2>
              <p className="text-sm text-gray-500">
                Last run: {lastRun ? new Date(lastRun).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
              ) : (
                <Play className="w-4 h-4 inline mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run Tests'}
            </button>
            
            <button
              onClick={downloadResults}
              className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              <Download className="w-4 h-4 inline mr-2" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{results.total}</div>
            <div className="text-xs text-gray-500">Total Tests</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{results.passed}</div>
            <div className="text-xs text-gray-500">Passed</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{results.failed}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round((results.passed / results.total) * 100)}%
            </div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>
        </div>

        {/* Critical Status */}
        <div className="space-y-3 mb-6">
          <div className={`flex items-center space-x-3 p-3 rounded-lg ${
            results.backendConnectivity ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {getStatusIcon(results.backendConnectivity)}
            <div>
              <div className={`font-medium ${getStatusColor(results.backendConnectivity)}`}>
                Backend Connectivity
              </div>
              <div className="text-sm text-gray-600">
                {results.backendConnectivity ? 'Connected successfully' : 'Connection failed'}
              </div>
            </div>
          </div>
          
          <div className={`flex items-center space-x-3 p-3 rounded-lg ${
            results.apiEndpointValidation ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {getStatusIcon(results.apiEndpointValidation)}
            <div>
              <div className={`font-medium ${getStatusColor(results.apiEndpointValidation)}`}>
                API Endpoint Validation
              </div>
              <div className="text-sm text-gray-600">
                {results.apiEndpointValidation ? 'All endpoints valid' : 'Endpoint validation failed'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="border-t border-gray-200">
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
          
          <div className="space-y-3">
            {results.authTests.map((test, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${
                test.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.passed)}
                  <div>
                    <div className={`font-medium ${getStatusColor(test.passed)}`}>
                      {test.testName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {test.details}
                    </div>
                    {test.error && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {test.error}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {test.duration}ms
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(test.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Report */}
      {securityReport && (
        <div className="border-t border-gray-200">
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Audit Report</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Total Events:</span>
                <span className="ml-2 text-sm">{securityReport.totalEvents}</span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-600">Last Audit:</span>
                <span className="ml-2 text-sm">
                  {new Date(securityReport.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
            
            {securityReport.eventsBySeverity && (
              <div>
                <span className="text-sm font-medium text-gray-600">Events by Severity:</span>
                <div className="mt-2 space-y-1">
                  {Object.entries(securityReport.eventsBySeverity).map(([severity, count]) => (
                    <div key={severity} className="text-sm">
                      <span className="capitalize">{severity}:</span>
                      <span className="ml-2">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="border-t border-gray-200">
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
          
          <div className="space-y-3">
            {!results.backendConnectivity && (
              <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-red-800">Critical Issue</div>
                  <div className="text-sm text-red-700">
                    Backend is not accessible. Check deployment and network configuration.
                  </div>
                </div>
              </div>
            )}
            
            {!results.apiEndpointValidation && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-800">Warning</div>
                  <div className="text-sm text-yellow-700">
                    API endpoints validation failed. Check backend route configuration.
                  </div>
                </div>
              </div>
            )}
            
            {results.failed > 0 && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Info className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-yellow-800">Action Required</div>
                  <div className="text-sm text-yellow-700">
                    {results.failed} test(s) failed. Review and fix issues before production deployment.
                  </div>
                </div>
              </div>
            )}
            
            {results.passed === results.total && results.backendConnectivity && results.apiEndpointValidation && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-green-800">All Systems Go!</div>
                  <div className="text-sm text-green-700">
                    All tests passed! Your authentication system is ready for production.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthTestResults;