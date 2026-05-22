import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface CreateMeetingInput {
  title: string
  description?: string
  scheduledAt?: string
  type?: 'instant' | 'scheduled' | 'recurring'
  settings?: Record<string, unknown>
  team?: string
  tags?: string[]
}

export function useMeetings(params?: { search?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['meetings', params],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (params?.search) qs.set('search', params.search)
      if (params?.status) qs.set('status', params.status)
      if (params?.page) qs.set('page', String(params.page))
      if (params?.limit) qs.set('limit', String(params.limit))
      return api.get(`/meetings?${qs}`).then(r => r.data.data)
    },
  })
}

export function useMeeting(meetingId: string | undefined) {
  return useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: () => api.get(`/meetings/${meetingId}`).then(r => r.data.data.meeting),
    enabled: !!meetingId,
  })
}

export function useCreateMeeting() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateMeetingInput) => api.post('/meetings', data),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      navigate(`/meeting/${data.data.meeting.meetingId}/lobby`)
    },
    onError: () => toast.error('Failed to create meeting'),
  })
}

export function useEndMeeting(meetingId: string) {
  const qc = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => api.post(`/meetings/${meetingId}/end`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      navigate('/dashboard')
      toast.success('Meeting ended')
    },
  })
}

export function useMeetingAnalytics(range = '30') {
  return useQuery({
    queryKey: ['analytics', range],
    queryFn: () => api.get(`/meetings/analytics?range=${range}`).then(r => r.data.data),
  })
}
