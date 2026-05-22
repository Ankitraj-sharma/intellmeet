import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Plus, Copy, Hash, Crown, UserPlus } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { cn } from '@/utils/cn'

export default function TeamsPage() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', description: '' })
  const [inviteCode, setInviteCode] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<any>(null)

  const { data } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then(r => r.data.data.teams),
  })

  const { mutate: createTeam, isPending: creating } = useMutation({
    mutationFn: (data: typeof newTeam) => api.post('/teams', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      setShowCreate(false)
      setNewTeam({ name: '', description: '' })
      toast.success('Team created!')
    },
  })

  const { mutate: joinTeam, isPending: joining } = useMutation({
    mutationFn: (code: string) => api.post(`/teams/join/${code}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      setShowJoin(false)
      setInviteCode('')
      toast.success('Joined team!')
    },
    onError: () => toast.error('Invalid invite code'),
  })

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Teams</h1>
            <p className="text-slate-400 mt-1">Collaborate with your team members</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowJoin(true)} className="btn-ghost flex items-center gap-2">
              <UserPlus size={16} /> Join Team
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Create Team
            </button>
          </div>
        </div>

        {/* Create Team Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="card p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-white mb-4">Create New Team</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Team Name</label>
                  <input className="input" placeholder="Engineering, Marketing..." value={newTeam.name}
                    onChange={e => setNewTeam(n => ({ ...n, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Description (optional)</label>
                  <textarea className="input resize-none h-20" placeholder="What does this team do?"
                    value={newTeam.description}
                    onChange={e => setNewTeam(n => ({ ...n, description: e.target.value }))} />
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
                  <button onClick={() => createTeam(newTeam)} disabled={creating || !newTeam.name}
                    className="btn-primary disabled:opacity-50">
                    {creating ? 'Creating...' : 'Create Team'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Join Team Modal */}
        {showJoin && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="card p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-white mb-4">Join a Team</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Invite Code</label>
                  <input className="input font-mono tracking-widest uppercase" placeholder="ABCDEF"
                    value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} />
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowJoin(false)} className="btn-ghost">Cancel</button>
                  <button onClick={() => joinTeam(inviteCode)} disabled={joining || inviteCode.length < 6}
                    className="btn-primary disabled:opacity-50">
                    {joining ? 'Joining...' : 'Join Team'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Team cards */}
        {!data?.length ? (
          <div className="card p-16 text-center">
            <Users size={40} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg font-medium">No teams yet</p>
            <p className="text-slate-500 text-sm mt-1">Create a team or join one with an invite code</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((team: any, i: number) => {
              const isOwner = team.owner?._id === user?._id
              return (
                <motion.div key={team._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn(
                    "card p-5 cursor-pointer hover:border-indigo-500/40 transition-all",
                    selectedTeam?._id === team._id && "border-indigo-500/60"
                  )}
                  onClick={() => setSelectedTeam(selectedTeam?._id === team._id ? null : team)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{team.name[0]}</span>
                    </div>
                    {isOwner && <Crown size={14} className="text-amber-400" />}
                  </div>
                  <h3 className="font-semibold text-white">{team.name}</h3>
                  {team.description && <p className="text-sm text-slate-400 mt-1 line-clamp-2">{team.description}</p>}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Users size={12} /> {team.members?.length || 0} members
                    </div>
                    <button onClick={e => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(team.inviteCode)
                      toast.success('Invite code copied!')
                    }} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors">
                      <Hash size={12} />
                      {team.inviteCode}
                      <Copy size={10} />
                    </button>
                  </div>

                  {/* Members list */}
                  {selectedTeam?._id === team._id && team.members?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                      {team.members.map((m: any) => (
                        <div key={m.user?._id} className="flex items-center gap-2">
                          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${m.user?.name}`}
                            className="w-7 h-7 rounded-full" alt="" />
                          <div>
                            <p className="text-xs font-medium text-slate-300">{m.user?.name}</p>
                            <p className="text-xs text-slate-500">{m.role}</p>
                          </div>
                          {m.user?.isOnline && (
                            <div className="ml-auto w-2 h-2 bg-emerald-400 rounded-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
