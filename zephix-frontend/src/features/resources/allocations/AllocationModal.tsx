/**
 * AllocationModal
 *
 * Modal for creating a new resource allocation.
 * Selects member from workspace members.
 */

import React, { useState, useEffect } from 'react';
import { X, User, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { CreateAllocationInput } from './types';

interface WorkspaceMember {
  id: string;
  userId: string;
  role: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface AllocationModalProps {
  projectId: string;
  existingUserIds: string[];
  onClose: () => void;
  onSubmit: (input: CreateAllocationInput) => Promise<void>;
}

export const AllocationModal: React.FC<AllocationModalProps> = ({
  projectId,
  existingUserIds,
  onClose,
  onSubmit,
}) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [allocationPercent, setAllocationPercent] = useState<number>(100);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch workspace members
  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      setMembersError(null);
      try {
        const res = await api.get('/workspaces/members');
        const data = res.data?.data || res.data || [];
        // Filter out already allocated users
        const available = data.filter(
          (m: WorkspaceMember) => !existingUserIds.includes(m.userId)
        );
        setMembers(available);
      } catch (e) {
        setMembersError('Failed to load workspace members');
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [existingUserIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setSubmitting(true);
    try {
      await onSubmit({
        projectId,
        userId: selectedUserId,
        allocationPercent,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const getMemberDisplayName = (member: WorkspaceMember): string => {
    if (member.user?.name) return member.user.name;
    if (member.user?.firstName || member.user?.lastName) {
      return `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim();
    }
    return member.user?.email || 'Unknown';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Add Resource Allocation</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Member *</label>
            {loadingMembers ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-indigo-600 rounded-full" />
                Loading members...
              </div>
            ) : membersError ? (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                {membersError}
              </div>
            ) : members.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                All workspace members are already allocated to this project
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select a team member</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {getMemberDisplayName(member)} ({member.role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Allocation Percent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allocation % (0-100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={allocationPercent}
              onChange={(e) => setAllocationPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
              disabled={submitting || !selectedUserId || members.length === 0}
            >
              {submitting ? 'Adding...' : 'Add Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AllocationModal;
