import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { store } from './store';
import { theme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

// Layout components
import { MainLayout } from './components/layouts/MainLayout';
import { AuthLayout } from './components/layouts/AuthLayout';

// Page components
import { Dashboard } from './pages/Dashboard';
import { Templates } from './pages/Templates';
import { TemplateBuilder } from './pages/TemplateBuilder';
import { Documents } from './pages/Documents';
import { DocumentEditor } from './pages/DocumentEditor';
import { AIAnalytics } from './pages/AIAnalytics';
import { Collaboration } from './pages/Collaboration';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { NotFound } from './pages/NotFound';

// Protected route wrapper
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <CssBaseline />
            <Router>
              <AuthProvider>
                <SocketProvider>
                  <Routes>
                    {/* Auth routes */}
                    <Route element={<AuthLayout />}>
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                    </Route>

                    {/* Protected routes */}
                    <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      
                      {/* Template routes */}
                      <Route path="/templates" element={<Templates />} />
                      <Route path="/templates/new" element={<TemplateBuilder />} />
                      <Route path="/templates/:id/edit" element={<TemplateBuilder />} />
                      
                      {/* Document routes */}
                      <Route path="/documents" element={<Documents />} />
                      <Route path="/documents/new" element={<DocumentEditor />} />
                      <Route path="/documents/:id" element={<DocumentEditor />} />
                      
                      {/* Collaboration & Analytics */}
                      <Route path="/collaboration/:documentId" element={<Collaboration />} />
                      <Route path="/analytics" element={<AIAnalytics />} />
                      
                      {/* Settings */}
                      <Route path="/settings/*" element={<Settings />} />
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>

                  {/* Global notifications */}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#363636',
                        color: '#fff',
                      },
                      success: {
                        iconTheme: {
                          primary: '#4caf50',
                          secondary: '#fff',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#f44336',
                          secondary: '#fff',
                        },
                      },
                    }}
                  />
                </SocketProvider>
              </AuthProvider>
            </Router>
          </LocalizationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;