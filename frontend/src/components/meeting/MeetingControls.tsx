import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, MessageSquare, Users, FileText, Brain, Hand, MoreHorizontal } from 'lucide-react'
import { cn } from '@/utils/cn'

interface MeetingControlsProps {
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  isHandRaised: boolean
  activePanel: string | null
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onToggleHand: () => void
  onSetPanel: (panel: string | null) => void
  onLeave: () => void
  onEnd: () => void
  isHost: boolean
}

function ControlButton({ icon: Icon, activeIcon: ActiveIcon, label, active, danger, onClick }: {
  icon: React.ElementType; activeIcon?: React.ElementType; label: string
  active?: boolean; danger?: boolean; onClick: () => void
}) {
  const Ic = (active && ActiveIcon) ? ActiveIcon : Icon
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all duration-200 min-w-[56px]',
        danger
          ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
          : active
          ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
          : 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
      )}
    >
      <Ic size={20} />
      <span className="hidden sm:block truncate">{label}</span>
    </button>
  )
}

function PanelButton({ icon: Icon, id, activePanel, onClick }: {
  icon: React.ElementType; id: string; activePanel: string | null; onClick: (id: string) => void
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'p-2.5 rounded-xl transition-all',
        activePanel === id ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'
      )}
    >
      <Icon size={18} />
    </button>
  )
}

export function MeetingControls({
  isMuted, isVideoOff, isScreenSharing, isHandRaised, activePanel,
  onToggleMute, onToggleVideo, onToggleScreenShare, onToggleHand,
  onSetPanel, onLeave, onEnd, isHost,
}: MeetingControlsProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#0f0f1a] border-t border-slate-800/60">
      {/* Left: media controls */}
      <div className="flex items-center gap-1">
        <ControlButton
          icon={Mic} activeIcon={MicOff}
          label={isMuted ? 'Unmute' : 'Mute'}
          danger={isMuted} active={isMuted}
          onClick={onToggleMute}
        />
        <ControlButton
          icon={Video} activeIcon={VideoOff}
          label={isVideoOff ? 'Start Video' : 'Stop Video'}
          danger={isVideoOff} active={isVideoOff}
          onClick={onToggleVideo}
        />
        <ControlButton
          icon={Monitor} activeIcon={MonitorOff}
          label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
          active={isScreenSharing}
          onClick={onToggleScreenShare}
        />
        <ControlButton
          icon={Hand}
          label="Raise Hand"
          active={isHandRaised}
          onClick={onToggleHand}
        />
      </div>

      {/* Center: panel toggles */}
      <div className="flex items-center gap-1 bg-slate-800/60 rounded-xl p-1">
        <PanelButton icon={MessageSquare} id="chat" activePanel={activePanel} onClick={p => onSetPanel(activePanel === p ? null : p)} />
        <PanelButton icon={Users} id="participants" activePanel={activePanel} onClick={p => onSetPanel(activePanel === p ? null : p)} />
        <PanelButton icon={FileText} id="transcript" activePanel={activePanel} onClick={p => onSetPanel(activePanel === p ? null : p)} />
        <PanelButton icon={Brain} id="ai" activePanel={activePanel} onClick={p => onSetPanel(activePanel === p ? null : p)} />
      </div>

      {/* Right: leave/end */}
      <div className="flex items-center gap-2">
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <PhoneOff size={15} className="rotate-[135deg]" />
          <span className="hidden sm:inline">Leave</span>
        </button>
        {isHost && (
          <button
            onClick={onEnd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <span>End</span>
          </button>
        )}
      </div>
    </div>
  )
}
