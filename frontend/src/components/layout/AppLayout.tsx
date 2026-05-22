import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Video,
  Users,
  CheckSquare,
  BarChart2,
  LogOut,
  Zap,
  Bell,
  Plus,
  Menu,
  X,
  Settings
} from 'lucide-react'

import { useAuthStore } from '@/store/authStore'
import { disconnectSocket } from '@/services/socket'
import api from '@/services/api'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

const nav = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Video, label: 'Meetings', href: '/meetings' },
  { icon: Users, label: 'Teams', href: '/teams' },
  { icon: CheckSquare, label: 'Tasks', href: '/tasks' },
  { icon: BarChart2, label: 'Analytics', href: '/analytics' },
]

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const location = useLocation()
  const navigate = useNavigate()

  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { mutate: logout } = useMutation({
    mutationFn: () => api.post('/auth/logout'),

    onSuccess: () => {
      clearAuth()
      disconnectSocket()
      navigate('/login')
      toast.success('Logged out')
    },

    onError: () => {
      clearAuth()
      disconnectSocket()
      navigate('/login')
    },
  })

  const handleNewMeeting = async () => {
    try {
      const { data } = await api.post('/meetings', {
        title: 'Quick Meeting',
        type: 'instant',
      })

      navigate(`/meeting/${data.data.meeting.meetingId}/lobby`)
    } catch {
      toast.error('Failed to create meeting')
    }
  }

  return (
    <div className="flex h-screen bg-[#0f0f1a] overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-40 w-64 flex flex-col bg-[#12121f] border-r border-slate-800/60 transition-transform duration-300',
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800/60">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>

            <span className="text-lg font-bold text-white">
              IntellMeet
            </span>
          </Link>

          <button
            className="lg:hidden text-slate-400"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* New Meeting Button */}
        <div className="px-4 py-4">
          <button
            onClick={handleNewMeeting}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            New Meeting
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {nav.map(({ icon: Icon, label, href }) => {
            const active = location.pathname.startsWith(href)

            return (
              <Link
                key={href}
                to={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )}
              >
                <Icon size={18} />

                {label}

                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer group">
            <img
              src={
                user?.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`
              }
              alt={user?.name}
              className="w-8 h-8 rounded-full"
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {user?.name}
              </p>

              <p className="text-xs text-slate-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Link
              to="/profile"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
            >
              <Settings size={14} />
              Settings
            </Link>

            <button
              onClick={() => logout()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/60 bg-[#0f0f1a]/80 backdrop-blur-sm flex-shrink-0">
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors">
              <Bell size={18} />

              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
            </button>

            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-indigo-500/30">
              <img
                src={
                  user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`
                }
                alt={user?.name}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}