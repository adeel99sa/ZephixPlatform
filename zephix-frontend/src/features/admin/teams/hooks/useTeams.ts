import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsApi, Team, CreateTeamDto, UpdateTeamDto } from '../api/teamsApi';
import { toast } from 'sonner';

export function useTeams(params?: { search?: string; status?: 'active' | 'archived' }) {
  return useQuery({
    queryKey: ['teams', params],
    queryFn: () => teamsApi.getTeams(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useTeam(id: string | null) {
  return useQuery({
    queryKey: ['team', id],
    queryFn: () => teamsApi.getTeam(id!),
    enabled: !!id,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (team: CreateTeamDto) => teamsApi.createTeam(team),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create team');
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateTeamDto }) =>
      teamsApi.updateTeam(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team', variables.id] });
      toast.success('Team updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update team');
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => teamsApi.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete team');
    },
  });
}





