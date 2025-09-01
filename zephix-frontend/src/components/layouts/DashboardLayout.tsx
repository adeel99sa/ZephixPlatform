import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/navigation/Sidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, permissions } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      <div className="flex">
        <Sidebar permissions={permissions} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

