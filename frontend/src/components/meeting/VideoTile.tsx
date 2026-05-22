import { useEffect, useRef } from 'react'
import { MicOff, VideoOff, Pin } from 'lucide-react'
import { cn } from '@/utils/cn'

interface VideoTileProps {
  stream?: MediaStream
  name: string
  isMuted: boolean
  isVideoOff: boolean
  isLocal?: boolean
  isPinned?: boolean
  isActive?: boolean
  onPin?: () => void
  className?: string
}

export function VideoTile({
  stream, name, isMuted, isVideoOff, isLocal, isPinned, isActive, onPin, className
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className={cn(
      'relative bg-[#1a1a2e] rounded-2xl overflow-hidden flex items-center justify-center border transition-all',
      isActive ? 'border-indigo-500/60 shadow-lg shadow-indigo-500/10' : 'border-slate-800/60',
      className
    )}>
      {/* Video feed */}
      {!isVideoOff && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn('w-full h-full object-cover', isLocal && 'scale-x-[-1]')}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-900 to-[#1a1a2e]">
          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-slate-700">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=6366f1`}
              alt={name}
            />
          </div>
          <span className="text-slate-400 text-sm font-medium">{isLocal ? 'You' : name}</span>
        </div>
      )}

      {/* Overlay: name + status indicators */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <span className="text-white text-xs font-medium truncate max-w-[120px]">
            {isLocal ? `${name} (You)` : name}
          </span>
          <div className="flex gap-1.5">
            {isMuted && (
              <div className="p-1 bg-red-500/80 rounded-full">
                <MicOff size={9} className="text-white" />
              </div>
            )}
            {isVideoOff && (
              <div className="p-1 bg-slate-700/80 rounded-full">
                <VideoOff size={9} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active speaker indicator */}
      {isActive && (
        <div className="absolute inset-0 ring-2 ring-inset ring-indigo-500/60 rounded-2xl pointer-events-none" />
      )}

      {/* Pin button */}
      {onPin && (
        <button
          onClick={onPin}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100',
            isPinned ? 'bg-indigo-500/80 text-white' : 'bg-black/40 text-white/70 hover:bg-black/60 hover:text-white'
          )}
        >
          <Pin size={12} />
        </button>
      )}

      {/* Recording indicator */}
      {isLocal && (
        <div className="absolute top-2 left-2" />
      )}
    </div>
  )
}
