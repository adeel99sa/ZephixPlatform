import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Home } from 'lucide-react';

export const Forbidden: React.FC = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16" data-testid="forbidden-page">
      <Shield className="h-12 w-12 text-rose-400" />
      <h1 className="mt-4 text-3xl font-bold text-slate-900">403</h1>
      <h2 className="mt-2 text-lg font-semibold text-slate-700">Access Forbidden</h2>
      <p className="mt-2 text-sm text-slate-500">
        You don't have permission to access this resource.
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
