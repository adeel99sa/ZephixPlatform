import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProjectsDashboard } from './ProjectsDashboard';

export const ProjectsPage: React.FC = () => {
  return (
    <Routes>
      <Route index element={<ProjectsDashboard />} />
      {/* Add more project-related routes here as needed */}
      {/* <Route path=":projectId" element={<ProjectDetailPage />} /> */}
      {/* <Route path=":projectId/edit" element={<ProjectEditPage />} /> */}
    </Routes>
  );
};
