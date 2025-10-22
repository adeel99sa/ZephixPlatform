import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api/client';

interface DiagnosticResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function DiagnosticsPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    // Test 1: Health endpoint
    try {
      const response = await apiClient.get('/health');
      diagnostics.push({
        test: 'Health Endpoint',
        status: 'success',
        message: 'Backend is reachable',
        details: response.data
      });
    } catch (error: any) {
      diagnostics.push({
        test: 'Health Endpoint',
        status: 'error',
        message: error.message,
        details: error.response?.data
      });
    }

    // Test 2: API Base URL
    diagnostics.push({
      test: 'API Base URL',
      status: 'success',
      message: apiClient.defaults.baseURL || '/api',
      details: { baseURL: apiClient.defaults.baseURL }
    });

    // Test 3: Auth token presence
    const token = localStorage.getItem('authToken');
    diagnostics.push({
      test: 'Auth Token',
      status: token ? 'success' : 'error',
      message: token ? 'Token present in localStorage' : 'No token found',
      details: token ? { tokenLength: token.length } : null
    });

    // Test 4: Current user
    const userStr = localStorage.getItem('user');
    try {
      const user = userStr ? JSON.parse(userStr) : null;
      diagnostics.push({
        test: 'User Data',
        status: user ? 'success' : 'error',
        message: user ? `Logged in as ${user.email}` : 'No user data',
        details: user
      });
    } catch (error) {
      diagnostics.push({
        test: 'User Data',
        status: 'error',
        message: 'Invalid user data in localStorage',
        details: null
      });
    }

    setResults(diagnostics);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">System Diagnostics</h1>
      
      <button
        onClick={runDiagnostics}
        disabled={isRunning}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isRunning ? 'Running...' : 'Run Diagnostics'}
      </button>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded border-l-4 ${
              result.status === 'success'
                ? 'bg-green-50 border-green-500'
                : result.status === 'error'
                ? 'bg-red-50 border-red-500'
                : 'bg-gray-50 border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{result.test}</h3>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  result.status === 'success'
                    ? 'bg-green-100 text-green-800'
                    : result.status === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {result.status}
              </span>
            </div>
            <p className="mt-2 text-sm">{result.message}</p>
            {result.details && (
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
