import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { TrendingUp, Video, Clock, Users, Brain, Target } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/services/api'

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="card p-5 flex items-start gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-white mt-0.5">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  </motion.div>
)

const mockWeekly = [
  { day: 'Mon', meetings: 4, duration: 120 },
  { day: 'Tue', meetings: 7, duration: 210 },
  { day: 'Wed', meetings: 3, duration: 90 },
  { day: 'Thu', meetings: 9, duration: 300 },
  { day: 'Fri', meetings: 6, duration: 180 },
  { day: 'Sat', meetings: 1, duration: 30 },
  { day: 'Sun', meetings: 2, duration: 60 },
]

const mockSentiment = [
  { name: 'Positive', value: 62 },
  { name: 'Neutral', value: 28 },
  { name: 'Negative', value: 10 },
]

export default function AnalyticsPage() {
  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/meetings/analytics').then(r => r.data.data),
  })

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics & Insights</h1>
          <p className="text-slate-400 mt-1">Meeting productivity metrics and trends</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Video} label="Total Meetings" value={analytics?.totalMeetings} sub="Last 30 days" color="bg-indigo-500" />
          <StatCard icon={Clock} label="Avg Duration" value={analytics?.avgDurationMinutes ? `${analytics.avgDurationMinutes}m` : '—'} sub="Per meeting" color="bg-purple-500" />
          <StatCard icon={Users} label="Hosted" value={analytics?.hostedMeetings} sub="As organizer" color="bg-emerald-500" />
          <StatCard icon={Brain} label="AI Summaries" value="Auto" sub="Always enabled" color="bg-amber-500" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly meetings */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-indigo-400" />
              <h2 className="font-semibold text-white">Meetings This Week</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockWeekly}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#1e2a4a', border: '1px solid #2d3748', borderRadius: '12px', color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(99,102,241,0.1)' }}
                />
                <Bar dataKey="meetings" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment breakdown */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Target size={16} className="text-purple-400" />
              <h2 className="font-semibold text-white">Meeting Sentiment</h2>
              <span className="text-xs text-slate-500 ml-auto">AI-powered</span>
            </div>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={mockSentiment} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                    {mockSentiment.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {mockSentiment.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                      <span className="text-sm text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Duration trend */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={16} className="text-emerald-400" />
            <h2 className="font-semibold text-white">Meeting Duration Trend (minutes)</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={mockWeekly}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1e2a4a', border: '1px solid #2d3748', borderRadius: '12px', color: '#e2e8f0' }}
              />
              <Line type="monotone" dataKey="duration" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Productivity insights */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Meeting efficiency', value: '87%', desc: 'Meetings with clear outcomes', color: 'text-emerald-400' },
            { label: 'Action item rate', value: '73%', desc: 'Meetings that produce tasks', color: 'text-indigo-400' },
            { label: 'Follow-up reduction', value: '52%', desc: 'Less time on follow-ups via AI', color: 'text-purple-400' },
          ].map(({ label, value, desc, color }) => (
            <div key={label} className="card p-5 text-center">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="font-medium text-slate-200 mt-2">{label}</p>
              <p className="text-xs text-slate-500 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
