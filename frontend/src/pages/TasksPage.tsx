import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, CheckSquare, MoreHorizontal, Circle, Flag, User } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import api from '@/services/api'
import { formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const COLUMNS = [
  { id: 'backlog', label: 'Backlog', color: 'text-slate-400' },
  { id: 'todo', label: 'To Do', color: 'text-blue-400' },
  { id: 'in-progress', label: 'In Progress', color: 'text-amber-400' },
  { id: 'review', label: 'Review', color: 'text-purple-400' },
  { id: 'done', label: 'Done', color: 'text-emerald-400' },
]

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400', high: 'text-amber-400', medium: 'text-blue-400', low: 'text-slate-400'
}

function TaskCard({ task, onMove }: { task: any; onMove: (id: string, status: string) => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="card p-3 cursor-pointer hover:border-slate-600 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-200 leading-snug">{task.title}</p>
        <Flag size={12} className={cn("flex-shrink-0 mt-0.5", PRIORITY_COLORS[task.priority])} />
      </div>
      {task.description && (
        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{task.description}</p>
      )}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.labels.map((label: string) => (
            <span key={label} className="badge badge-purple text-xs">{label}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${task.assignee.name}`}
              className="w-5 h-5 rounded-full" alt="" />
            <span className="text-xs text-slate-500">{task.assignee.name}</span>
          </div>
        ) : <div />}
        {task.dueDate && (
          <span className="text-xs text-slate-500">{formatDate(task.dueDate, 'MMM d')}</span>
        )}
      </div>
      {/* Quick move buttons */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {COLUMNS.filter(c => c.id !== task.status).slice(0, 2).map(col => (
          <button key={col.id} onClick={() => onMove(task._id, col.id)}
            className="text-xs px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors">
            → {col.label}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '' })

  const { data } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.get('/tasks').then(r => r.data.data.tasks),
  })

  const { mutate: createTask, isPending } = useMutation({
    mutationFn: (task: typeof newTask) => api.post('/tasks', task),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setShowCreate(false)
      setNewTask({ title: '', description: '', priority: 'medium', status: 'todo', dueDate: '' })
      toast.success('Task created')
    },
  })

  const { mutate: updateTask } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const tasks = data || []
  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter((t: any) => t.status === col.id)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <AppLayout>
      <div className="space-y-6 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Tasks</h1>
            <p className="text-slate-400 mt-1">Kanban board — {tasks.length} total tasks</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Task
          </button>
        </div>

        {/* Create Task Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="card p-6 w-full max-w-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Create Task</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Title *</label>
                  <input className="input" placeholder="Task title" value={newTask.title}
                    onChange={e => setNewTask(n => ({ ...n, title: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Description</label>
                  <textarea className="input resize-none h-20" placeholder="Describe the task..."
                    value={newTask.description}
                    onChange={e => setNewTask(n => ({ ...n, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Priority</label>
                    <select className="input" value={newTask.priority}
                      onChange={e => setNewTask(n => ({ ...n, priority: e.target.value }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Status</label>
                    <select className="input" value={newTask.status}
                      onChange={e => setNewTask(n => ({ ...n, status: e.target.value }))}>
                      {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Due Date</label>
                  <input type="date" className="input" value={newTask.dueDate}
                    onChange={e => setNewTask(n => ({ ...n, dueDate: e.target.value }))} />
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
                  <button onClick={() => createTask(newTask)} disabled={isPending || !newTask.title}
                    className="btn-primary disabled:opacity-50">
                    {isPending ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Circle size={8} className={col.color} fill="currentColor" />
                  <span className={cn("text-sm font-medium", col.color)}>{col.label}</span>
                  <span className="badge bg-white/5 text-slate-400 text-xs">{tasksByStatus[col.id]?.length || 0}</span>
                </div>
              </div>
              <div className="space-y-2 min-h-24">
                {tasksByStatus[col.id]?.map((task: any) => (
                  <TaskCard key={task._id} task={task}
                    onMove={(id, status) => updateTask({ id, status })} />
                ))}
                {tasksByStatus[col.id]?.length === 0 && (
                  <div className="h-16 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center">
                    <span className="text-xs text-slate-600">Drop tasks here</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
