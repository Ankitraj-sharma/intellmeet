import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import api from '@/services/api'
import { getSocket } from '@/services/socket'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export function useNotifications() {
  const qc = useQueryClient()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data.data),
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  })

  // Listen for real-time notifications
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const handler = (notification: any) => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast(notification.message || notification.title, {
        icon: notification.type === 'meeting_invite' ? '📅' :
              notification.type === 'action_item' ? '✅' :
              notification.type === 'mention' ? '💬' : '🔔',
      })
    }

    socket.on('notification:new', handler)
    return () => { socket.off('notification:new', handler) }
  }, [qc])

  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const { mutate: markAllRead } = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    markRead,
    markAllRead,
  }
}
