import { useState, useEffect } from 'react'
import { useStreamerStore, ControlMode, GridMode } from '../store/streamerStore'
import { io } from 'socket.io-client'

export function ControlPanel() {
  const { 
    roomId, 
    controlMode, 
    gridMode, 
    isStreaming, 
    setControlMode, 
    setGridMode,
    toggleStreaming 
  } = useStreamerStore()
  
  const [qrCode, setQrCode] = useState('')

  useEffect(() => {
    if (roomId) {
      // Generate QR code for room pairing
      const qrUrl = `${window.location.origin}?room=${roomId}&mode=stream`
      setQrCode(qrUrl)
    }
  }, [roomId])

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false
      })
      
      const socket = io(import.meta.env.VITE_SIGNALING_SERVER || 'http://localhost:3001')
      socket.emit('join-room', roomId)
      
      // WebRTC signaling would be implemented here
      toggleStreaming()
    } catch (err) {
      console.error('Screen capture failed:', err)
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center p-8">
      <h1 className="mb-8 text-4xl font-bold">Multi-Screen Streamer</h1>
      
      <div className="mb-8 rounded-lg bg-slate-800 p-6">
        <p className="mb-2 text-lg">Room ID: <span className="font-mono text-primary-400">{roomId}</span></p>
        <p className="text-sm text-slate-400">Scan QR code on TV to connect</p>
      </div>

      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setControlMode('unified')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            controlMode === 'unified' ? 'bg-primary-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          Unified Mode
        </button>
        <button
          onClick={() => setControlMode('split')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            controlMode === 'split' ? 'bg-primary-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          Split Mode
        </button>
        <button
          onClick={() => setControlMode('focus')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            controlMode === 'focus' ? 'bg-primary-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          Focus Mode
        </button>
        <button
          onClick={() => setControlMode('presenter')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            controlMode === 'presenter' ? 'bg-primary-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          Presenter Mode
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        {(['1x1', '2x2', '3x3'] as GridMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setGridMode(mode)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              gridMode === mode ? 'bg-primary-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            {mode} Grid
          </button>
        ))}
      </div>

      <button
        onClick={startStreaming}
        disabled={isStreaming}
        className={`px-12 py-4 rounded-xl font-bold text-xl transition-all ${
          isStreaming 
            ? 'bg-green-600 cursor-not-allowed' 
            : 'bg-primary-600 hover:bg-primary-500 active:scale-95'
        }`}
      >
        {isStreaming ? 'Streaming Active' : 'Start Screen Stream'}
      </button>
    </div>
  )
}