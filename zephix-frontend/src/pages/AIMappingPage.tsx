import React from 'react';
import { AIMappingInterface } from '../components/ai/AIMappingInterface';

export const AIMappingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <AIMappingInterface />
      </div>
    </div>
  );
};
