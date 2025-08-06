import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { render, RenderOptions } from '@testing-library/react';

interface RouterWrapperProps {
  children: React.ReactNode;
}

const RouterWrapper: React.FC<RouterWrapperProps> = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

export const renderWithRouter = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: RouterWrapper, ...options });
};

