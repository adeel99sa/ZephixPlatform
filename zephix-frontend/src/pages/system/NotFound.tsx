import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16" data-testid="not-found-page">
      <AlertTriangle className="h-12 w-12 text-slate-400" />
      <h1 className="mt-4 text-3xl font-bold text-slate-900">404</h1>
      <h2 className="mt-2 text-lg font-semibold text-slate-700">Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-500">
        The page you're looking for doesn't exist.
      </p>
      <div className="mt-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
};
