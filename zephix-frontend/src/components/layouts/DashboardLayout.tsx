// File: src/components/layouts/DashboardLayout.tsx
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/navigation/Sidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const authData = useAuth();
  
  console.log('[DashboardLayout] Auth data:', {
    hasUser: !!authData.user,
    permissions: authData.permissions
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader />
      <div className="flex">
        <Sidebar permissions={authData.permissions} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}