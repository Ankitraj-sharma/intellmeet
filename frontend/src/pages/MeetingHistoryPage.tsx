import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Video, Search, Plus, Calendar, Clock, Users, Trash2, ExternalLink, Brain } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/services/api'
import { formatDate, formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const STATUS_STYLES: Record<string, string> = {
  ended: 'badge-success', ongoing: 'badge-info', scheduled: 'badge-purple', cancelled: 'badge-error',
}

export default function MeetingHistoryPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', { search, status }],
    queryFn: () => api.get(`/meetings?search=${search}&status=${status}&limit=20`).then(r => r.data.data),
  })

  const { mutate: deleteMeeting } = useMutation({
    mutationFn: (id: string) => api.delete(`/meetings/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meetings'] }); toast.success('Meeting deleted') },
  })

  const handleNew = async () => {
    const { data } = await api.post('/meetings', { title: 'Quick Meeting', type: 'instant' })
    navigate(`/meeting/${data.data.meeting.meetingId}/lobby`)
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Meetings</h1>
            <p className="text-slate-400 mt-1">Your meeting history and recordings</p>
          </div>
          <button onClick={handleNew} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Meeting
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input pl-10" placeholder="Search meetings..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="ended">Ended</option>
          </select>
        </div>

        {/* Meeting list */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-2/5" />
                    <div className="h-3 bg-slate-800 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : data?.meetings?.length === 0 ? (
          <div className="card p-16 text-center">
            <Video size={40} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg font-medium">No meetings found</p>
            <p className="text-slate-500 text-sm mt-1">Start your first meeting to see it here</p>
            <button onClick={handleNew} className="btn-primary mt-6 flex items-center gap-2 mx-auto">
              <Plus size={16} /> New Meeting
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.meetings?.map((meeting: any, i: number) => (
              <motion.div key={meeting._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }} className="card p-5 hover:border-slate-700 transition-colors group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Video size={18} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-slate-200 truncate">{meeting.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">ID: {meeting.meetingId}</p>
                      </div>
                      <span className={`badge ${STATUS_STYLES[meeting.status] || 'badge-info'}`}>
                        {meeting.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} /> {formatDate(meeting.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={12} /> {meeting.participants?.length || 0} participants
                      </span>
                      {meeting.durationMinutes > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} /> {meeting.durationMinutes}m
                        </span>
                      )}
                      {meeting.aiSummary?.isGenerated && (
                        <span className="flex items-center gap-1.5 text-purple-400">
                          <Brain size={12} /> AI Summary
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {meeting.status === 'ongoing' && (
                      <Link to={`/meeting/${meeting.meetingId}/lobby`}
                        className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors">
                        <ExternalLink size={14} />
                      </Link>
                    )}
                    {meeting.status === 'ended' && (
                      <Link to={`/meeting/${meeting.meetingId}`}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors">
                        <ExternalLink size={14} />
                      </Link>
                    )}
                    <button onClick={() => { if (confirm('Delete this meeting?')) deleteMeeting(meeting._id) }}
                      className="p-2 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
