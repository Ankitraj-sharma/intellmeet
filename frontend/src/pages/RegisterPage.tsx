import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { initSocket } from '@/services/socket'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: typeof form) => api.post('/auth/register', data),
    onSuccess: ({ data }) => {
      setAuth(data.data.user, data.data.accessToken)
      initSocket(data.data.accessToken)
      toast.success('Account created successfully!')
      navigate('/dashboard')
    },
  })

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">IntellMeet</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
        <p className="text-slate-400 mb-8">Join thousands of teams using IntellMeet</p>

        <div className="space-y-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe', icon: User },
            { label: 'Email', key: 'email', type: 'email', placeholder: 'you@company.com', icon: Mail },
            { label: 'Password', key: 'password', type: 'password', placeholder: '8+ characters', icon: Lock },
          ].map(({ label, key, type, placeholder, icon: Icon }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
              <div className="relative">
                <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={type}
                  className="input pl-10"
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            </div>
          ))}

          <button
            onClick={() => mutate(form)}
            disabled={isPending || !form.name || !form.email || !form.password}
            className="btn-primary w-full py-3 flex items-center justify-center disabled:opacity-50"
          >
            {isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-slate-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
