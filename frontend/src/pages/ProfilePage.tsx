import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Bell, Palette, Save, Shield } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const qc = useQueryClient()
  const [name, setName] = useState(user?.name || '')
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' })

  const { mutate: updateProfile, isPending: savingProfile } = useMutation({
    mutationFn: () => api.patch('/auth/profile', { name }),
    onSuccess: ({ data }) => { updateUser({ name }); toast.success('Profile updated') },
  })

  const { mutate: changePass, isPending: changingPass } = useMutation({
    mutationFn: () => api.patch('/auth/change-password', {
      currentPassword: passwords.current, newPassword: passwords.new
    }),
    onSuccess: () => {
      setPasswords({ current: '', new: '', confirm: '' })
      toast.success('Password changed successfully')
    },
    onError: () => toast.error('Current password is incorrect'),
  })

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile & Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account and preferences</p>
        </div>

        {/* Avatar & basic info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <User size={16} className="text-indigo-400" /> Profile Information
          </h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-indigo-500/30">
              <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} alt="" className="w-full h-full" />
            </div>
            <div>
              <p className="font-semibold text-white">{user?.name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <span className="badge badge-purple mt-1">{user?.role}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Display Name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <input className="input opacity-60" value={user?.email} disabled />
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            </div>
            <button onClick={() => updateProfile()} disabled={savingProfile || name === user?.name}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <Save size={15} />
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Shield size={16} className="text-indigo-400" /> Security
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Current Password', key: 'current', type: 'password' },
              { label: 'New Password', key: 'new', type: 'password' },
              { label: 'Confirm New Password', key: 'confirm', type: 'password' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
                <input type={type} className="input" value={passwords[key as keyof typeof passwords]}
                  onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))} placeholder="••••••••" />
              </div>
            ))}
            <button
              onClick={() => changePass()}
              disabled={changingPass || !passwords.current || !passwords.new || passwords.new !== passwords.confirm}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Lock size={15} />
              {changingPass ? 'Changing...' : 'Change Password'}
            </button>
            {passwords.new && passwords.confirm && passwords.new !== passwords.confirm && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="card p-6 border-red-500/20">
          <h2 className="font-semibold text-red-400 mb-4">Danger Zone</h2>
          <p className="text-sm text-slate-400 mb-4">These actions are irreversible. Please be certain.</p>
          <button className="px-4 py-2 bg-red-500/15 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/25 transition-colors border border-red-500/20">
            Delete Account
          </button>
        </motion.div>
      </div>
    </AppLayout>
  )
}
