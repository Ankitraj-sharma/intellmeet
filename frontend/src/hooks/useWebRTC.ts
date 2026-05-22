import { useRef, useCallback } from 'react'
import { getSocket } from '@/services/socket'
import { useMeetingStore } from '@/store/meetingStore'

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

export const useWebRTC = (meetingId: string) => {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())
  const { localStream, setLocalStream, addParticipant, updateParticipant, removeParticipant } = useMeetingStore()

  const createPeerConnection = useCallback((socketId: string, userId: string, userName: string, avatarUrl: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS)
    peerConnections.current.set(socketId, pc)
    if (localStream) localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) getSocket()?.emit("webrtc:ice-candidate", { targetSocketId: socketId, candidate, meetingId })
    }
    const remoteStream = new MediaStream()
    pc.ontrack = ({ track }) => { remoteStream.addTrack(track); updateParticipant(userId, { stream: remoteStream }) }
    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        removeParticipant(userId); peerConnections.current.delete(socketId)
      }
    }
    addParticipant({ _id: socketId, user: { _id: userId, name: userName, avatarUrl }, role: "participant", isMuted: false, isVideoOff: false, socketId, stream: remoteStream })
    return pc
  }, [localStream, addParticipant, updateParticipant, removeParticipant])

  const initLocalStream = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio })
      setLocalStream(stream); return stream
    } catch {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      setLocalStream(stream); return stream
    }
  }, [setLocalStream])

  const makeCall = useCallback(async (targetSocketId: string, targetUser: { _id: string; name: string; avatarUrl: string }) => {
    const pc = createPeerConnection(targetSocketId, targetUser._id, targetUser.name, targetUser.avatarUrl)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    getSocket()?.emit("webrtc:offer", { targetSocketId, offer, meetingId })
  }, [createPeerConnection, meetingId])

  const answerCall = useCallback(async (fromSocketId: string, fromUser: { _id: string; name: string; avatarUrl: string }, offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection(fromSocketId, fromUser._id, fromUser.name, fromUser.avatarUrl)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    getSocket()?.emit("webrtc:answer", { targetSocketId: fromSocketId, answer })
  }, [createPeerConnection])

  const handleAnswer = useCallback(async (fromSocketId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(fromSocketId)
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer))
  }, [])

  const handleIceCandidate = useCallback(async (fromSocketId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(fromSocketId)
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate))
  }, [])

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled })
      useMeetingStore.getState().toggleMute()
      getSocket()?.emit("meeting:toggle-audio", { meetingId, isMuted: !localStream.getAudioTracks()[0]?.enabled })
    }
  }, [localStream, meetingId])

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => { track.enabled = !track.enabled })
      useMeetingStore.getState().toggleVideo()
    }
  }, [localStream])

  const startScreenShare = useCallback(async () => {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    useMeetingStore.getState().setScreenStream(screenStream)
    const videoTrack = screenStream.getVideoTracks()[0]
    peerConnections.current.forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === "video")
      if (sender) sender.replaceTrack(videoTrack)
    })
    getSocket()?.emit("meeting:screen-share", { meetingId, isSharing: true })
    useMeetingStore.getState().toggleScreenShare()
    return screenStream
  }, [meetingId])

  const cleanup = useCallback(() => {
    peerConnections.current.forEach(pc => pc.close())
    peerConnections.current.clear()
    const { localStream: ls, screenStream: ss } = useMeetingStore.getState()
    ls?.getTracks().forEach(t => t.stop())
    ss?.getTracks().forEach(t => t.stop())
    setLocalStream(null)
  }, [setLocalStream])

  return { initLocalStream, makeCall, answerCall, handleAnswer, handleIceCandidate, toggleMute, toggleVideo, startScreenShare, cleanup }
}
