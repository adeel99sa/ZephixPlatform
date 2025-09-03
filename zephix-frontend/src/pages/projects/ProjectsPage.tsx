import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProjectsDashboard } from './ProjectsDashboard';
import { ProjectDetail } from './ProjectDetail';

export const ProjectsPage: React.FC = () => {
  return (
    <Routes>
      <Route index element={<ProjectsDashboard />} />
      <Route path=":id" element={<ProjectDetail />} />
      {/* Add more project-related routes here as needed */}
      {/* <Route path=":projectId/edit" element={<ProjectEditPage />} /> */}
    </Routes>
  );
};
