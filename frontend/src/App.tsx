import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Suspense, lazy } from 'react'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const MeetingPage = lazy(() => import('@/pages/MeetingPage'))
const MeetingLobby = lazy(() => import('@/pages/MeetingLobby'))
const TeamsPage = lazy(() => import('@/pages/TeamsPage'))
const TasksPage = lazy(() => import('@/pages/TasksPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const MeetingHistoryPage = lazy(() => import('@/pages/MeetingHistoryPage'))

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />
}

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-slate-400 text-sm">Loading IntellMeet...</span>
    </div>
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/meeting/:meetingId/lobby" element={<ProtectedRoute><MeetingLobby /></ProtectedRoute>} />
        <Route path="/meeting/:meetingId" element={<ProtectedRoute><MeetingPage /></ProtectedRoute>} />
        <Route path="/meetings" element={<ProtectedRoute><MeetingHistoryPage /></ProtectedRoute>} />
        <Route path="/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
