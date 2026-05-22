import { cn } from '@/utils/cn'

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'

const styles: Record<Variant, string> = {
  default: 'bg-white/10 text-slate-300',
  success: 'bg-emerald-500/15 text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-400',
  error: 'bg-red-500/15 text-red-400',
  info: 'bg-blue-500/15 text-blue-400',
  purple: 'bg-indigo-500/15 text-indigo-400',
}

export function Badge({ children, variant = 'default', className }: {
  children: React.ReactNode; variant?: Variant; className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', styles[variant], className)}>
      {children}
    </span>
  )
}
