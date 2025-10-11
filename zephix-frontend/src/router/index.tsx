import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Dashboard Pages
import { AdminHome } from '@/pages/Dashboard/Home';
import { Inbox } from '@/pages/Dashboard/Inbox';
import { MyWork } from '@/pages/Dashboard/MyWork';

// Admin Pages
import { Administration } from '@/pages/Admin/Administration';
import { TrashPage } from '@/pages/Admin/Trash';
import { ImportData } from '@/pages/Admin/Import';
import { WorkspacesPage } from '@/pages/Admin/Workspaces';

// Settings Pages
import { MyProfile } from '@/pages/Settings/Profile';

// Help Pages
import { HelpPage } from '@/pages/Help';

// Template Pages
import { TemplateCenterPage } from '@/pages/Templates/TemplateCenterPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <SignupPage />
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard/home" replace />
      },
      {
        path: 'home',
        element: <AdminHome />
      },
      {
        path: 'inbox',
        element: <Inbox />
      },
      {
        path: 'my-work',
        element: <MyWork />
      }
    ]
  },
  {
    path: '/templates',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <TemplateCenterPage />
      }
    ]
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Administration />
      },
      {
        path: 'trash',
        element: <TrashPage />
      },
      {
        path: 'import',
        element: <ImportData />
      },
      {
        path: 'workspaces',
        element: <WorkspacesPage />
      },
      {
        path: 'users/invite',
        element: <Navigate to="/dashboard/home" state={{ openInviteModal: true }} replace />
      }
    ]
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'profile',
        element: <MyProfile />
      }
    ]
  },
  {
    path: '/help',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <HelpPage />
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);
