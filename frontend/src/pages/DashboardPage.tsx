import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Video, Users, Clock, TrendingUp, Plus, ArrowRight, Calendar, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { formatRelativeTime, formatDate } from '@/utils/format'
import toast from 'react-hot-toast'

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
    className="card p-5 flex items-start gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  </motion.div>
)

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/meetings/analytics').then(r => r.data.data),
  })

  const { data: meetings } = useQuery({
    queryKey: ['meetings', 'recent'],
    queryFn: () => api.get('/meetings?limit=5').then(r => r.data.data),
  })

  const { data: tasks } = useQuery({
    queryKey: ['tasks', 'my'],
    queryFn: () => api.get('/tasks?status=todo').then(r => r.data.data),
  })

  const handleNewMeeting = async () => {
    try {
      const { data } = await api.post('/meetings', { title: 'Quick Meeting', type: 'instant' })
      navigate(`/meeting/${data.data.meeting.meetingId}/lobby`)
    } catch { toast.error('Failed to create meeting') }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-400 mt-1">{formatDate(new Date(), 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleNewMeeting} className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              New Meeting
            </button>
            <Link to="/meetings" className="btn-ghost flex items-center gap-2">
              <Calendar size={16} />
              Schedule
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Video} label="Total Meetings" value={analytics?.totalMeetings ?? '—'} sub="Last 30 days" color="bg-indigo-500" />
          <StatCard icon={Clock} label="Avg Duration" value={analytics?.avgDurationMinutes ? `${analytics.avgDurationMinutes}m` : '—'} sub="Per meeting" color="bg-purple-500" />
          <StatCard icon={Users} label="Hosted" value={analytics?.hostedMeetings ?? '—'} sub="As organizer" color="bg-emerald-500" />
          <StatCard icon={TrendingUp} label="Participated" value={analytics?.participatedMeetings ?? '—'} sub="As attendee" color="bg-amber-500" />
        </div>

        {/* Quick Start */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-indigo-400" />
            </div>
            <h2 className="font-semibold text-white">Quick Start</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: 'Instant Meeting', desc: 'Start a meeting now', action: handleNewMeeting, primary: true },
              { label: 'Join Meeting', desc: 'Enter a meeting ID', to: '/meetings', primary: false },
              { label: 'Schedule Meeting', desc: 'Plan for later', to: '/meetings', primary: false },
            ].map(({ label, desc, action, to, primary }) => (
              primary ? (
                <button key={label} onClick={action}
                  className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors text-left group">
                  <p className="font-medium text-indigo-300">{label}</p>
                  <p className="text-sm text-slate-400 mt-1">{desc}</p>
                </button>
              ) : (
                <Link key={label} to={to!}
                  className="p-4 rounded-xl bg-white/5 border border-slate-800 hover:bg-white/8 transition-colors group">
                  <p className="font-medium text-slate-200">{label}</p>
                  <p className="text-sm text-slate-400 mt-1">{desc}</p>
                </Link>
              )
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent meetings */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Recent Meetings</h2>
              <Link to="/meetings" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {meetings?.meetings?.length ? meetings.meetings.map((m: any) => (
                <Link key={m._id} to={`/meeting/${m.meetingId}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Video size={16} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 truncate text-sm">{m.title}</p>
                    <p className="text-xs text-slate-500">{formatRelativeTime(m.createdAt)}</p>
                  </div>
                  <span className={`badge text-xs ${m.status === 'ended' ? 'badge-success' : m.status === 'ongoing' ? 'badge-info' : 'badge-purple'}`}>
                    {m.status}
                  </span>
                </Link>
              )) : (
                <div className="text-center py-8 text-slate-500">
                  <Video size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No meetings yet. Start one!</p>
                </div>
              )}
            </div>
          </div>

          {/* My Tasks */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">My Tasks</h2>
              <Link to="/tasks" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="space-y-3">
              {tasks?.tasks?.length ? tasks.tasks.slice(0, 5).map((t: any) => (
                <div key={t._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    t.priority === 'urgent' ? 'bg-red-400' : t.priority === 'high' ? 'bg-amber-400' :
                    t.priority === 'medium' ? 'bg-blue-400' : 'bg-slate-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{t.title}</p>
                    {t.dueDate && <p className="text-xs text-slate-500 mt-0.5">{formatDate(t.dueDate)}</p>}
                  </div>
                  <span className="badge badge-warning text-xs">{t.priority}</span>
                </div>
              )) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm">No pending tasks 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
