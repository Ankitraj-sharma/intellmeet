import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import toast from 'react-hot-toast'

interface TaskInput {
  title: string
  description?: string
  priority?: string
  status?: string
  dueDate?: string
  assignee?: string
  team?: string
  labels?: string[]
}

export function useTasks(params?: { teamId?: string; assignee?: string; status?: string }) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => {
      const qs = new URLSearchParams()
      if (params?.teamId) qs.set('teamId', params.teamId)
      if (params?.assignee) qs.set('assignee', params.assignee)
      if (params?.status) qs.set('status', params.status)
      return api.get(`/tasks?${qs}`).then(r => r.data.data.tasks)
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskInput) => api.post('/tasks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task created')
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<TaskInput> & { status?: string }) =>
      api.patch(`/tasks/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted')
    },
  })
}
