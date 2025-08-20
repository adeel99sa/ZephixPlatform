import React from 'react';
import { Search, Bell, User } from 'lucide-react';

export const TopNavigation: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left: Logo + Admin Console */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <span className="font-semibold text-lg">ZEPHIX</span>
        </div>
        <span className="text-gray-500">Admin Console</span>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search or type command..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Right: Notifications + Avatar */}
      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-400 hover:text-gray-600 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full"></span>
        </button>
        
        <div className="flex items-center space-x-2">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
            alt="Admin"
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm font-medium">Demo Admin</span>
        </div>
      </div>
    </header>
  );
};

