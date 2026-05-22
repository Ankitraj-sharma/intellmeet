import { cn } from '@/utils/cn'

interface AvatarProps {
  name: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  className?: string
}

const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }
const dotSizes = { xs: 'w-1.5 h-1.5', sm: 'w-2 h-2', md: 'w-2.5 h-2.5', lg: 'w-3 h-3', xl: 'w-3.5 h-3.5' }

export function Avatar({ name, src, size = 'md', online, className }: AvatarProps) {
  const imgSrc = src || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=6366f1`
  return (
    <div className={cn('relative flex-shrink-0', sizes[size], className)}>
      <img src={imgSrc} alt={name} className="w-full h-full rounded-full object-cover" />
      {online !== undefined && (
        <span className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-[#0f0f1a]',
          dotSizes[size],
          online ? 'bg-emerald-400' : 'bg-slate-500'
        )} />
      )}
    </div>
  )
}

export function AvatarGroup({ users, max = 3, size = 'sm' }: {
  users: Array<{ name: string; avatarUrl?: string }>
  max?: number; size?: AvatarProps['size']
}) {
  const shown = users.slice(0, max)
  const rest = users.length - max
  return (
    <div className="flex -space-x-2">
      {shown.map((u, i) => (
        <Avatar key={i} name={u.name} src={u.avatarUrl} size={size}
          className="ring-2 ring-[#0f0f1a]" />
      ))}
      {rest > 0 && (
        <div className={cn(
          'flex items-center justify-center rounded-full bg-slate-700 text-slate-300 font-medium ring-2 ring-[#0f0f1a]',
          sizes[size]
        )}>
          +{rest}
        </div>
      )}
    </div>
  )
}
