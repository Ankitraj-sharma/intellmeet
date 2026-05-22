import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then(r => r.data.data.teams),
  })
}

export function useTeam(id: string | undefined) {
  return useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then(r => r.data.data.team),
    enabled: !!id,
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) => api.post('/teams', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team created!')
    },
  })
}

export function useJoinTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (inviteCode: string) => api.post(`/teams/join/${inviteCode}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Joined team!')
    },
    onError: () => toast.error('Invalid invite code'),
  })
}
