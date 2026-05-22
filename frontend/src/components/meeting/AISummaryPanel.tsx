import { useState } from 'react'
import { Brain, RefreshCw, CheckCircle, Clock, TrendingUp, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

interface AISummaryPanelProps {
  meetingId: string
}

export function AISummaryPanel({ meetingId }: AISummaryPanelProps) {
  const [enabled, setEnabled] = useState(false)

  const { data, isLoading, refetch, isError } = useQuery({
    queryKey: ['ai-summary', meetingId],
    queryFn: () => api.get(`/meetings/${meetingId}/summary`).then(r => r.data.data.summary),
    enabled,
    retry: false,
  })

  const sentimentColor: Record<string, string> = {
    positive: 'success', neutral: 'info', negative: 'error'
  }

  if (!enabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-16 h-16 bg-purple-500/15 rounded-2xl flex items-center justify-center mb-4">
          <Brain size={28} className="text-purple-400" />
        </div>
        <h3 className="font-semibold text-white mb-2">AI Meeting Intelligence</h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Generate an AI-powered summary, key decisions, and action items from the meeting transcript.
        </p>
        <button
          onClick={() => setEnabled(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Brain size={15} />
          Generate Summary
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Spinner size="lg" className="text-purple-400" />
        <p className="text-slate-400 text-sm">Analyzing meeting content...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-4">
        <p className="text-slate-400 text-sm">
          {isError
            ? 'Could not generate summary. Make sure the meeting has ended and has transcript data.'
            : 'No summary available yet.'}
        </p>
        <button onClick={() => refetch()} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-white">AI Summary</span>
        </div>
        <div className="flex items-center gap-2">
          {data.sentiment && (
            <Badge variant={sentimentColor[data.sentiment] as any}>
              {data.sentiment}
            </Badge>
          )}
          <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText size={12} className="text-purple-400" />
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Summary</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed bg-purple-500/5 p-3 rounded-xl border border-purple-500/15">
            {data.summary}
          </p>
        </section>
      )}

      {/* Key Points */}
      {data.keyPoints?.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Key Points</span>
          </div>
          <ul className="space-y-1.5">
            {data.keyPoints.map((point: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Decisions */}
      {data.decisions?.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle size={12} className="text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Decisions</span>
          </div>
          <ul className="space-y-1.5">
            {data.decisions.map((d: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300">
                <CheckCircle size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Action Items */}
      {data.actionItems?.length > 0 && (
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={12} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Action Items</span>
          </div>
          <div className="space-y-2">
            {data.actionItems.map((item: any, i: number) => (
              <div key={i} className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl">
                <p className="text-sm text-slate-200">{item.text}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={item.priority === 'high' ? 'error' : item.priority === 'medium' ? 'warning' : 'info'}>
                    {item.priority}
                  </Badge>
                  {item.assignee?.name && (
                    <span className="text-xs text-slate-500">→ {item.assignee.name}</span>
                  )}
                  {item.dueDate && (
                    <span className="text-xs text-slate-500">Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.accuracy && (
        <p className="text-xs text-slate-600 text-center">
          AI confidence: {Math.round(data.accuracy * 100)}%
        </p>
      )}
    </div>
  )
}
