import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { RecentlyVisited } from '../../components/Dashboard/RecentlyVisited';
import { AdminActionItems } from '../../components/Dashboard/AdminActionItems';
import { QuickStats } from '../../components/Dashboard/QuickStats';
import { LearnSection } from '../../components/Dashboard/LearnSection';
import { FeaturedTemplates } from '../../components/Dashboard/FeaturedTemplates';
import { CreateWorkspaceModal } from '../../components/Modals/CreateWorkspaceModal';
import { InviteMembersModal } from '../../components/Modals/InviteMembersModal';
import { Button } from '../../components/ui/Button';
import { Plus, UserPlus, Upload } from 'lucide-react';

export function AdminHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentActivity, setRecentActivity] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showInviteMembers, setShowInviteMembers] = useState(false);

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const fetchHomeData = async () => {
      if (!user?.organizationId) return;
      
      try {
        setLoading(true);
        
        // Fetch all home data in parallel
        const [recentResponse, actionResponse, statsResponse] = await Promise.all([
          api.get('/dashboard/recent', { params: { organizationId: user.organizationId, limit: 6 } }),
          api.get('/dashboard/action-items', { params: { organizationId: user.organizationId } }),
          api.get('/dashboard/stats', { params: { organizationId: user.organizationId } })
        ]);

        setRecentActivity(recentResponse.data?.data || recentResponse.data || []);
        setActionItems(actionResponse.data?.data || actionResponse.data || []);
        setStats(statsResponse.data?.data || statsResponse.data || null);
      } catch (error) {
        console.error('Failed to fetch home data:', error);
        // Set empty data on error
        setRecentActivity([]);
        setActionItems([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, [user?.organizationId]);

  const handleWorkspaceCreated = () => {
    // Refresh the page or update workspace list
    window.location.reload();
  };

  const handleMembersInvited = () => {
    // Show success message
    alert('Invitations sent successfully!');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-8">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">
          {getGreeting()}, {user?.firstName || user?.name || 'Admin'}
        </h1>
        
        {/* Quick Actions */}
        <div className="flex gap-3 mt-4">
          <Button 
            variant="primary" 
            icon={Plus}
            onClick={() => setShowCreateWorkspace(true)}
          >
            Create Workspace
          </Button>
          <Button 
            variant="secondary" 
            icon={UserPlus}
            onClick={() => setShowInviteMembers(true)}
          >
            Invite Members
          </Button>
          <Button 
            variant="secondary" 
            icon={Upload}
            onClick={() => navigate('/admin/import')}
          >
            Import Data
          </Button>
        </div>
      </header>

      {/* Main Content Sections */}
      <div className="space-y-8">
        <RecentlyVisited items={recentActivity} />
        <AdminActionItems items={actionItems} />
        <QuickStats stats={stats} onCreateWorkspace={() => setShowCreateWorkspace(true)} />
        <LearnSection />
        <FeaturedTemplates />
      </div>

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
        onSuccess={handleWorkspaceCreated}
      />
      
      <InviteMembersModal
        isOpen={showInviteMembers}
        onClose={() => setShowInviteMembers(false)}
        onSuccess={handleMembersInvited}
      />
    </div>
  );
}
